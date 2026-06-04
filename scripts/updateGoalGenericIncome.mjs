// One-shot goal rewrite — broaden conversify-10k-mrr from a Conversify-specific
// target to a general after-tax £10k goal across any stream.
//
// Usage:
//   node --env-file=.env scripts/updateGoalGenericIncome.mjs           # dry-run
//   node --env-file=.env scripts/updateGoalGenericIncome.mjs --apply   # commit

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

const NEW_ID = "income-10k-after-tax"
const OLD_ID = "conversify-10k-mrr"

const newGoal = {
  type: "outcome-leads",
  title: "£10,000/month after-tax (any stream)",
  status: "active",
  priority: 1,
  rationale:
    "Replaces salary (~£6k/month) with ~1.67× headroom. Unlocks full-time on the next chapter. Any after-tax income stream counts — Conversify, consulting, contracts, equity, royalties.",
  target: 10000,
  current: 0, // live source is assistant/revenue.monthly
  unit: "GBP",
  cadence: "monthly",
  leadMeasures: [
    "demos booked",
    "venues live",
    "Conversify build sessions (focused, not admin)",
    "any other income-generating work shipped",
  ],
  leadMeasureTemplates: ["conversify"],
  context: { monthlySalaryGBP: 6000 },
  updatedAt: Date.now(),
}

const oldSnap = await db.collection("goals").doc(OLD_ID).get()
if (oldSnap.exists) {
  console.log(`Found legacy goal "${OLD_ID}":`)
  console.log(JSON.stringify(oldSnap.data(), null, 2))
} else {
  console.log(`Legacy goal "${OLD_ID}" does not exist.`)
}

const newSnap = await db.collection("goals").doc(NEW_ID).get()
console.log(`\nTarget goal "${NEW_ID}" ${newSnap.exists ? "exists (will overwrite)" : "will be created"}.`)
console.log(JSON.stringify(newGoal, null, 2))

// We also need to rewrite any taskTemplates pointing at the old goal id.
const tplSnap = await db.collection("taskTemplates").where("goalId", "==", OLD_ID).get()
console.log(`\n${tplSnap.size} task templates point at "${OLD_ID}":`)
for (const d of tplSnap.docs) console.log(`  - ${d.id}`)

// And instances logged against the old goal id — relabel for analytics.
const instSnap = await db.collection("instances").where("goalId", "==", OLD_ID).get()
console.log(`\n${instSnap.size} instances reference goalId="${OLD_ID}".`)

if (!APPLY) {
  console.log("\nDry-run. Pass --apply to commit:")
  console.log(`  • set goals/${NEW_ID}`)
  console.log(`  • delete goals/${OLD_ID}`)
  console.log(`  • rewrite goalId on ${tplSnap.size} templates`)
  console.log(`  • rewrite goalId on ${instSnap.size} instances`)
  process.exit(0)
}

const createdAt = oldSnap.exists ? oldSnap.data().createdAt || Date.now() : Date.now()
await db.collection("goals").doc(NEW_ID).set({ ...newGoal, createdAt })
console.log(`✓ wrote goals/${NEW_ID}`)

if (oldSnap.exists) {
  await db.collection("goals").doc(OLD_ID).delete()
  console.log(`✓ deleted goals/${OLD_ID}`)
}

let n = 0
for (const d of tplSnap.docs) {
  await d.ref.update({ goalId: NEW_ID })
  n++
}
console.log(`✓ relabeled ${n} task templates`)

// Instance backfill — batched.
let m = 0
const docs = instSnap.docs
const batchSize = 400
for (let i = 0; i < docs.length; i += batchSize) {
  const batch = db.batch()
  for (const d of docs.slice(i, i + batchSize)) batch.update(d.ref, { goalId: NEW_ID })
  await batch.commit()
  m += Math.min(batchSize, docs.length - i)
}
console.log(`✓ relabeled ${m} instances`)
