// Backfill historical habit completions into the instances collection.
//
// For each habitEntries/{date}.habits = { habitId: true } entry, look up the
// habit name from the relevant monthHabits doc, map the name to a templateId,
// and write a binary instance (no captured values — just the floor was hit).
//
// Mapping rules (case-insensitive substring on the habit name):
//   "read"              → template 'read'      (goal reading-cadence)
//   "journal"           → template 'journal'   (goal journal-cadence)
//   "step"              → template 'steps'     (goal steps-cadence)
//   "iron man"/"ironman"/"training" → SKIP — Strava already covers this
//   "engineering"       → SKIP — concept dropped
//   anything else       → SKIP — logged for visibility
//
// Idempotent: instance IDs are `mig-habit-{date}-{templateId}` so re-runs
// overwrite the same docs. One instance per (date, templateId), even if the
// month config happened to have multiple habits mapping to the same template.
//
// Usage:
//   node --env-file=.env scripts/migrateHabitsToInstances.mjs           # dry-run
//   node --env-file=.env scripts/migrateHabitsToInstances.mjs --apply   # commit

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

function mapHabitName(name) {
  const n = (name || "").toLowerCase()
  // Skip rules first — both because they're concrete and so a habit literally
  // named "read the iron man book" doesn't get mis-mapped.
  if (n.includes("iron man") || n.includes("ironman") || n.includes("training")) {
    return { templateId: null, reason: "covered by Strava (ironman training)" }
  }
  if (n.includes("engineering")) {
    return { templateId: null, reason: "concept dropped" }
  }
  if (n.includes("journal")) return { templateId: "journal", reason: null }
  if (n.includes("read")) return { templateId: "read", reason: null }
  if (n.includes("step")) return { templateId: "steps", reason: null }
  return { templateId: null, reason: `no mapping for '${name}'` }
}

function dateNoonUtc(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getTime()
}

async function main() {
  console.log(`\n=== Habits → instances backfill ${APPLY ? "(APPLY)" : "(DRY RUN)"} ===\n`)

  const [templatesSnap, monthHabitsSnap, entriesSnap] = await Promise.all([
    db.collection("taskTemplates").get(),
    db.collection("monthHabits").get(),
    db.collection("habitEntries").get(),
  ])

  const templates = new Map(templatesSnap.docs.map((d) => [d.id, d.data()]))
  console.log(`Templates available: ${[...templates.keys()].join(", ")}`)

  // habitId → { name, monthKey } lookup. Habit IDs may repeat across months;
  // we take the latest definition wins, but since they're stable within a
  // month that's enough for backfill.
  const habitNameById = new Map()
  for (const doc of monthHabitsSnap.docs) {
    const habits = doc.data().habits || []
    for (const h of habits) {
      if (h.id && h.name) habitNameById.set(h.id, h.name)
    }
  }
  console.log(`Habit definitions known: ${habitNameById.size}\n`)

  const planned = []
  const skipReasons = {}
  let totalChecks = 0

  for (const entryDoc of entriesSnap.docs) {
    const dateKey = entryDoc.id
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue
    const habits = (entryDoc.data() || {}).habits || {}

    // Deduplicate per (date, templateId) — first match wins.
    const seenForDate = new Set()

    for (const [habitId, value] of Object.entries(habits)) {
      if (value !== true) continue
      totalChecks += 1
      const name = habitNameById.get(habitId) || ""
      if (!name) {
        skipReasons["unknown habit id"] = (skipReasons["unknown habit id"] || 0) + 1
        continue
      }
      const { templateId, reason } = mapHabitName(name)
      if (!templateId) {
        skipReasons[reason || "unmapped"] = (skipReasons[reason || "unmapped"] || 0) + 1
        continue
      }
      if (seenForDate.has(templateId)) {
        // Same template already covered for this date — don't write a duplicate.
        continue
      }
      seenForDate.add(templateId)
      const tpl = templates.get(templateId)
      if (!tpl) {
        skipReasons[`template '${templateId}' missing in registry`] =
          (skipReasons[`template '${templateId}' missing in registry`] || 0) + 1
        continue
      }
      planned.push({
        id: `mig-habit-${dateKey}-${templateId}`,
        instance: {
          date: dateKey,
          templateId,
          goalId: tpl.goalId || null,
          values: {},
          note: `migrated from habit '${name}'`,
          timestamp: dateNoonUtc(dateKey),
          source: "migration-habit",
          grade: null,
        },
      })
    }
  }

  // Summary
  const byTemplate = {}
  for (const w of planned) {
    byTemplate[w.instance.templateId] = (byTemplate[w.instance.templateId] || 0) + 1
  }
  console.log(`Total habit ✓ scanned: ${totalChecks}`)
  console.log(`Planned writes:        ${planned.length}`)
  for (const [tpl, count] of Object.entries(byTemplate).sort()) {
    console.log(`  ${tpl.padEnd(12)} ${count}`)
  }
  console.log(`Skipped:`)
  for (const [reason, count] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(5)}  ${reason}`)
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to commit.")
    if (planned.length > 0) {
      console.log("\nSample of first 5 planned writes:")
      for (const w of planned.slice(0, 5)) {
        console.log(`  ${w.id}  → templateId=${w.instance.templateId}  note='${w.instance.note}'`)
      }
    }
    return
  }

  const batchSize = 400
  for (let i = 0; i < planned.length; i += batchSize) {
    const batch = db.batch()
    for (const w of planned.slice(i, i + batchSize)) {
      batch.set(db.collection("instances").doc(w.id), w.instance)
    }
    await batch.commit()
    console.log(
      `  committed batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, planned.length)}/${planned.length})`
    )
  }
  console.log(`\nDone. Wrote ${planned.length} instances.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
