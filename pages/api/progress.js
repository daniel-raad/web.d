import { adminDb } from "../../lib/firebaseAdmin"
import { addDaysToDateKey, getDateKey } from "../../lib/dates.js"

// GET /api/progress?days=N
// Returns per-goal day-by-day hit/miss arrays + streaks. Public read (same
// pattern as other GET endpoints).
//
// Hit logic per goal type:
//   process-cadence  → sum primaryPrimitive (e.g. duration) across instances
//                      whose templateId is in leadMeasureTemplates, hit if
//                      sum >= floor.
//   deadline-plan    → hit if any instance with templateId in
//                      leadMeasureTemplates exists that day.
//   outcome-leads    → same as deadline-plan (any work counts as a hit;
//                      outcome dollars are tracked separately).

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

function buildDateList(startDate, endDate) {
  const out = []
  for (let d = startDate; d <= endDate; d = addDaysToDateKey(d, 1)) {
    out.push(d)
  }
  return out
}

function computeStreaks(hits) {
  // current: trailing run from today backwards
  let current = 0
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i].hit) current += 1
    else break
  }
  // best: longest run in window
  let best = 0
  let run = 0
  for (const h of hits) {
    if (h.hit) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return { current, best }
}

function hitRate(hits, lastN) {
  const slice = hits.slice(-lastN)
  if (slice.length === 0) return 0
  return slice.filter((h) => h.hit).length / slice.length
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const days = Math.min(Math.max(Number(req.query.days) || DEFAULT_DAYS, 1), MAX_DAYS)
  const endDate = getDateKey()
  const startDate = addDaysToDateKey(endDate, -(days - 1))
  const dates = buildDateList(startDate, endDate)

  // Fetch goals + instances in window in parallel.
  const [goalsSnap, instancesSnap] = await Promise.all([
    adminDb.collection("goals").where("status", "==", "active").get(),
    adminDb
      .collection("instances")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get(),
  ])

  const goals = goalsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))

  const allInstances = instancesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Pre-bucket instances by goalId for cheap per-goal lookup.
  const instancesByGoalId = new Map()
  for (const inst of allInstances) {
    if (!inst.goalId) continue
    if (!instancesByGoalId.has(inst.goalId)) instancesByGoalId.set(inst.goalId, [])
    instancesByGoalId.get(inst.goalId).push(inst)
  }

  // dailyOverallHits — track per-day how many goals got a hit, for the
  // heatmap on the progress page.
  const dailyHitCounts = Object.fromEntries(dates.map((d) => [d, 0]))

  const goalResults = goals.map((goal) => {
    const myInstances = instancesByGoalId.get(goal.id) || []
    const byDate = new Map()
    for (const inst of myInstances) {
      if (!byDate.has(inst.date)) byDate.set(inst.date, [])
      byDate.get(inst.date).push(inst)
    }

    // For goals with multiple lead-measure templates (Ironman: swim/bike/run/
    // strength), compute per-template hit arrays so the UI can show each
    // discipline separately AND grade the roll-up cell by how many hit.
    const leadTemplates = Array.isArray(goal.leadMeasureTemplates)
      ? goal.leadMeasureTemplates
      : []
    const hasMultipleTemplates = leadTemplates.length > 1

    const perTemplate = hasMultipleTemplates
      ? Object.fromEntries(
          leadTemplates.map((tplId) => [
            tplId,
            dates.map((date) => {
              const dayInstances = (byDate.get(date) || []).filter(
                (i) => i.templateId === tplId
              )
              return {
                date,
                hit: dayInstances.length > 0,
                count: dayInstances.length,
              }
            }),
          ])
        )
      : null

    const hits = dates.map((date, dateIdx) => {
      const dayInstances = byDate.get(date) || []
      if (dayInstances.length === 0) {
        return {
          date,
          hit: false,
          value: null,
          count: 0,
          ...(hasMultipleTemplates && { templatesHit: 0, templatesTotal: leadTemplates.length }),
        }
      }

      if (goal.type === "process-cadence") {
        const prim = goal.primaryPrimitive || "duration"
        const sum = dayInstances.reduce((acc, inst) => {
          const v = inst.values?.[prim]
          return acc + (Number.isFinite(Number(v)) ? Number(v) : 0)
        }, 0)
        const floor = Number(goal.floor) || 0
        return {
          date,
          hit: sum >= floor && floor > 0,
          value: sum,
          count: dayInstances.length,
        }
      }

      // deadline-plan / outcome-leads
      if (hasMultipleTemplates) {
        // Hit grading by # of lead-measure templates touched today. The roll-
        // up "hit" still means "at least one template touched", but the count
        // lets the UI show partial completion (e.g. only swim done = 1/4).
        const templatesHit = leadTemplates.filter(
          (tplId) => perTemplate[tplId][dateIdx].hit
        ).length
        return {
          date,
          hit: templatesHit > 0,
          value: null,
          count: dayInstances.length,
          templatesHit,
          templatesTotal: leadTemplates.length,
        }
      }
      return { date, hit: true, value: null, count: dayInstances.length }
    })

    for (const h of hits) {
      if (h.hit) dailyHitCounts[h.date] += 1
    }

    return {
      id: goal.id,
      type: goal.type,
      title: goal.title,
      floor: goal.floor ?? null,
      target: goal.target ?? null,
      primaryPrimitive: goal.primaryPrimitive ?? null,
      deadline: goal.deadline ?? null,
      leadMeasureTemplates: leadTemplates,
      hits,
      perTemplate,
      streak: computeStreaks(hits),
      hitRate7d: +hitRate(hits, 7).toFixed(2),
      hitRate14d: +hitRate(hits, 14).toFixed(2),
      hitRateAll: +hitRate(hits, hits.length).toFixed(2),
    }
  })

  const totalGoals = goals.length
  const dailyOverallHits = dates.map((date) => ({
    date,
    hitCount: dailyHitCounts[date] || 0,
    totalGoals,
  }))

  res.json({
    startDate,
    endDate,
    days,
    dates,
    goals: goalResults,
    dailyOverallHits,
  })
}
