import { adminDb } from "../../../lib/firebaseAdmin"
import { addDaysToDateKey, getDateKey } from "../../../lib/dates.js"
import { buildDates, loadAllStints } from "../../../lib/stints"

// GET /api/progress/stint-trend
//
// Returns daily metrics across ALL stints (earliest stint start → today) so
// the Trend page can plot:
//   - planRatio   : itemsDone / itemsTotal that day (0..1, null if no plan)
//   - energy      : 1..5 (null if not logged)
//   - weight      : kg (null)
//   - sleep       : hours (null)
//   - score       : composite (planRatio * (energy/5)) for the immersive daily-progress line
// Plus the stint boundaries so the chart can mark them.

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const today = getDateKey()
  const stints = await loadAllStints()
  const earliestStart = stints.length > 0 ? stints[0].startDate : addDaysToDateKey(today, -60)
  const startDate = req.query.startDate || earliestStart
  const endDate = req.query.endDate || today
  const dates = buildDates(startDate, endDate)

  // Batch read plans + entries via getAll() — one round trip per collection.
  const planRefs = dates.map((d) => adminDb.collection("plans").doc(d))
  const entryRefs = dates.map((d) => adminDb.collection("habitEntries").doc(d))
  const [planSnaps, entrySnaps] = await Promise.all([
    adminDb.getAll(...planRefs),
    adminDb.getAll(...entryRefs),
  ])

  const planByDate = new Map()
  for (const snap of planSnaps) {
    if (snap.exists) planByDate.set(snap.id, snap.data())
  }
  const entryByDate = new Map()
  for (const snap of entrySnaps) {
    if (snap.exists) entryByDate.set(snap.id, snap.data())
  }

  const days = dates.map((date) => {
    const plan = planByDate.get(date)
    const entry = entryByDate.get(date)
    const items = Array.isArray(plan?.items) ? plan.items : []
    const total = items.length
    const done = items.filter((i) => i.status === "done").length
    const partial = items.filter((i) => i.status === "partial").length
    const planRatio = total > 0 ? (done + partial * 0.5) / total : null
    const energy = entry?.energy ?? null
    const weight = entry?.weight ?? null
    const sleep = entry?.sleep ?? null
    // Composite daily score: plan completion modulated by energy. Falls
    // back to plan-only when energy missing, energy-only when plan missing.
    let score = null
    if (planRatio != null && energy != null) score = planRatio * (energy / 5)
    else if (planRatio != null) score = planRatio
    else if (energy != null) score = energy / 5
    return {
      date,
      planTotal: total,
      planDone: done,
      planPartial: partial,
      planRatio,
      energy,
      weight,
      sleep,
      score,
    }
  })

  res.json({
    startDate,
    endDate,
    today,
    days,
    stints: stints.map((s) => ({
      id: s.id, index: s.index, title: s.title,
      startDate: s.startDate, endDate: s.endDate, state: s.state,
    })),
  })
}
