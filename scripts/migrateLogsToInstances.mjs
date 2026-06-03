// Backfill historical habitEntries.workLog / trainingLog lines into the new
// instances collection.
//
// Source lines are formatted by log_work / log_training as:
//   [HH:MM] [tag] (Nm) free-form text
// We map: workLog tag → templateId (only if the tag matches a known template),
// trainingLog tag → templateId via TRAINING_TYPE_TO_TEMPLATE.
//
// Idempotent: uses deterministic instance IDs like `mig-{date}-work-{idx}`
// so re-runs overwrite the same docs.
//
// Usage:
//   node --env-file=.env scripts/migrateLogsToInstances.mjs           # dry-run
//   node --env-file=.env scripts/migrateLogsToInstances.mjs --apply   # commit

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

const TRAINING_TYPE_TO_TEMPLATE = {
  run: "run",
  bike: "bike",
  swim: "swim",
  gym: "strength",
  strength: "strength",
}

// [HH:MM] [tag] (Nm) text   — tag and duration are optional
const LINE_RE = /^\[(\d{2}:\d{2})\]\s*(?:\[([^\]]+)\])?\s*(?:\((\d+)m\))?\s*(.*)$/

function dateAndTimeToMs(dateKey, hhmm) {
  // habitEntries doc id is YYYY-MM-DD; assume Europe/London for time-of-day.
  // Good enough for backfill — exact timestamps were never persisted.
  const [y, m, d] = dateKey.split("-").map(Number)
  const [hh, mm] = hhmm.split(":").map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh, mm)).getTime()
}

function parseLines(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = LINE_RE.exec(line)
      if (!match) return { raw: line, parsed: null }
      const [, time, tag, durMin, body] = match
      return {
        raw: line,
        parsed: {
          time,
          tag: tag || null,
          durationMin: durMin ? Number(durMin) : null,
          text: body || "",
        },
      }
    })
}

async function main() {
  console.log(`\n=== Logs → instances migration ${APPLY ? "(APPLY)" : "(DRY RUN)"} ===\n`)

  // Load template registry to validate mappings.
  const tplSnap = await db.collection("taskTemplates").get()
  const templates = new Map(tplSnap.docs.map((d) => [d.id, d.data()]))
  console.log(`Known templates: ${[...templates.keys()].join(", ")}\n`)

  const entriesSnap = await db.collection("habitEntries").get()
  const plannedWrites = []
  const skipped = []

  for (const entryDoc of entriesSnap.docs) {
    const dateKey = entryDoc.id
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue
    const data = entryDoc.data()

    // --- workLog ---
    const workLines = parseLines(data.workLog)
    workLines.forEach((line, idx) => {
      if (!line.parsed) {
        skipped.push({ date: dateKey, kind: "work", idx, reason: "unparseable", raw: line.raw })
        return
      }
      const tagKey = (line.parsed.tag || "").toLowerCase().trim()
      const templateId = tagKey && templates.has(tagKey) ? tagKey : null
      if (!templateId) {
        skipped.push({
          date: dateKey,
          kind: "work",
          idx,
          reason: tagKey ? `no template for tag '${tagKey}'` : "no project tag",
          raw: line.raw,
        })
        return
      }
      const tpl = templates.get(templateId)
      const values = { description: line.parsed.text }
      if (line.parsed.durationMin) values.duration = line.parsed.durationMin
      plannedWrites.push({
        id: `mig-${dateKey}-work-${idx}`,
        instance: {
          date: dateKey,
          templateId,
          goalId: tpl.goalId || null,
          values,
          note: "",
          timestamp: dateAndTimeToMs(dateKey, line.parsed.time),
          source: "migration",
          grade: null,
        },
      })
    })

    // --- trainingLog ---
    const trainLines = parseLines(data.trainingLog)
    trainLines.forEach((line, idx) => {
      if (!line.parsed) {
        skipped.push({ date: dateKey, kind: "train", idx, reason: "unparseable", raw: line.raw })
        return
      }
      const tagKey = (line.parsed.tag || "").toLowerCase().trim()
      const templateId = TRAINING_TYPE_TO_TEMPLATE[tagKey] || null
      if (!templateId || !templates.has(templateId)) {
        skipped.push({
          date: dateKey,
          kind: "train",
          idx,
          reason: tagKey ? `no template mapping for sessionType '${tagKey}'` : "no sessionType tag",
          raw: line.raw,
        })
        return
      }
      const tpl = templates.get(templateId)
      plannedWrites.push({
        id: `mig-${dateKey}-train-${idx}`,
        instance: {
          date: dateKey,
          templateId,
          goalId: tpl.goalId || null,
          values: { description: line.parsed.text },
          note: "",
          timestamp: dateAndTimeToMs(dateKey, line.parsed.time),
          source: "migration",
          grade: null,
        },
      })
    })
  }

  // Summary
  const byTemplate = {}
  for (const w of plannedWrites) {
    byTemplate[w.instance.templateId] = (byTemplate[w.instance.templateId] || 0) + 1
  }
  console.log(`Planned writes: ${plannedWrites.length} instances`)
  for (const [tpl, count] of Object.entries(byTemplate).sort()) {
    console.log(`  ${tpl.padEnd(12)} ${count}`)
  }
  console.log(`Skipped lines:  ${skipped.length}`)
  const skipReasons = {}
  for (const s of skipped) {
    skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1
  }
  for (const [reason, count] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${reason}`)
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to commit.\n")
    console.log("Sample of first 5 planned writes:")
    for (const w of plannedWrites.slice(0, 5)) {
      console.log(`  ${w.id}  templateId=${w.instance.templateId}  values=${JSON.stringify(w.instance.values).slice(0, 80)}`)
    }
    if (skipped.length > 0) {
      console.log("\nSample of first 5 skipped lines:")
      for (const s of skipped.slice(0, 5)) {
        console.log(`  [${s.date} ${s.kind}#${s.idx}] ${s.reason} :: ${s.raw.slice(0, 80)}`)
      }
    }
    return
  }

  const batchSize = 400
  for (let i = 0; i < plannedWrites.length; i += batchSize) {
    const batch = db.batch()
    for (const w of plannedWrites.slice(i, i + batchSize)) {
      batch.set(db.collection("instances").doc(w.id), w.instance)
    }
    await batch.commit()
    console.log(`  committed batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, plannedWrites.length)}/${plannedWrites.length})`)
  }
  console.log(`\nDone. Wrote ${plannedWrites.length} instances. Skipped ${skipped.length} unparseable/unmapped lines.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
