// One-shot migration: collapse todo categories to Revenue / Health / Life.
//
// Usage:
//   node --env-file=.env scripts/migrateCategories.mjs           # dry-run
//   node --env-file=.env scripts/migrateCategories.mjs --apply   # commit changes
//
// Requires Node 20.6+ for --env-file flag.

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
const NEW_CATEGORIES = ["Revenue", "Health", "Life"]

function mapCategory(oldCategory, todoText = "") {
  const c = (oldCategory || "").toLowerCase()
  const t = todoText.toLowerCase()

  // Revenue: anything Conversify, business, money, sales
  if (
    c.includes("conversify") ||
    c.includes("business") ||
    c.includes("revenue") ||
    c.includes("sales") ||
    c.includes("work") && t.includes("conversify") ||
    t.includes("conversify") ||
    t.includes("invoice") ||
    t.includes("client")
  ) {
    return "Revenue"
  }

  // Health: training, fitness, ironman, nutrition
  if (
    c.includes("health") ||
    c.includes("fitness") ||
    c.includes("training") ||
    c.includes("ironman") ||
    c.includes("workout") ||
    c.includes("nutrition") ||
    t.includes("workout") ||
    t.includes("run ") ||
    t.includes("ride ") ||
    t.includes("swim ") ||
    t.includes("gym")
  ) {
    return "Health"
  }

  return "Life"
}

async function main() {
  console.log(`\n=== Category migration ${APPLY ? "(APPLY)" : "(DRY RUN)"} ===\n`)

  // 1) Show new categories
  console.log("New categories:", NEW_CATEGORIES.join(", "))

  // 2) Fetch all todos and plan the remap
  const snap = await db.collection("todos").get()
  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  console.log(`\nFound ${todos.length} todos. Planned remapping:\n`)

  const counts = { Revenue: 0, Health: 0, Life: 0 }
  const updates = []
  for (const t of todos) {
    const newCat = mapCategory(t.category, t.text)
    counts[newCat]++
    if (t.category !== newCat) {
      updates.push({ id: t.id, text: t.text, from: t.category || "(none)", to: newCat })
    }
  }
  for (const u of updates) {
    console.log(`  [${u.from} → ${u.to}] ${u.text}`)
  }
  console.log(`\nTotals after: Revenue=${counts.Revenue}, Health=${counts.Health}, Life=${counts.Life}`)
  console.log(`Updates: ${updates.length}/${todos.length} todos will change category`)

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to commit.")
    return
  }

  // 3) Apply: write categories config + update todos in batches
  await db.collection("todoCategories").doc("config").set({ categories: NEW_CATEGORIES })
  console.log("\nCategories config updated.")

  const batchSize = 400
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = db.batch()
    for (const u of updates.slice(i, i + batchSize)) {
      batch.update(db.collection("todos").doc(u.id), { category: u.to })
    }
    await batch.commit()
  }
  console.log(`Updated ${updates.length} todos. Done.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
