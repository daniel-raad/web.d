// Wipe the `todos` Firestore collection.
//
// Used when the existing list is stale and we want a clean slate. The morning
// brief reads from this collection ("Revenue todos"), so leaving stale items
// in pollutes coach output.
//
// Usage:
//   node --env-file=.env scripts/wipeTodos.mjs            # dry-run (lists what would be deleted)
//   node --env-file=.env scripts/wipeTodos.mjs --apply    # actually delete

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("FIREBASE_SERVICE_ACCOUNT not set. Run from project root with .env present.")
    process.exit(1)
  }
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

const db = getFirestore()
const APPLY = process.argv.includes("--apply")

const snap = await db.collection("todos").get()
console.log(`Found ${snap.size} todos.`)
for (const doc of snap.docs) {
  const d = doc.data()
  console.log(`  - ${doc.id} · ${d.completed ? "✓" : "·"} ${d.category || "?"} · ${d.text || d.title || ""}`.slice(0, 140))
}

if (!APPLY) {
  console.log("\nDry-run. Pass --apply to delete all of these.")
  process.exit(0)
}

const batchSize = 400
const docs = snap.docs
for (let i = 0; i < docs.length; i += batchSize) {
  const batch = db.batch()
  for (const doc of docs.slice(i, i + batchSize)) batch.delete(doc.ref)
  await batch.commit()
}
console.log(`✓ Deleted ${docs.length} todos.`)
