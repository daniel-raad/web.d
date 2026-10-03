// The stint is the chassis of the system. Each stint is a 100-day window
// owning a set of GOALS that share the same start/end. At the end you write
// one review covering the whole stint, then start a new one with whatever
// goals make sense next. Goals live in the existing `goals/*` collection
// tagged with `stintId`; we keep them addressable so templates, instances,
// and the planner don't need to change.

import { adminDb } from "./firebaseAdmin"
import { addDaysToDateKey, getDateKey } from "./dates.js"
import { DEFAULT_STINT_DAYS } from "./stintConfig.js"

export { DEFAULT_STINT_DAYS }
export const MAX_GOALS_PER_STINT = 4

export const STINT_STATES = ["planning", "active", "completed", "archived"]
export const GOAL_STATES = ["active", "paused", "completed", "abandoned", "archived"]
export const GOAL_ENFORCEMENTS = ["strict", "relaxed"]

export const DEFAULT_GOAL_COLORS = [
  "#ef4444", // red
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#3b82f6", // blue
]

export const DEFAULT_GOAL_ICONS = ["🎯", "🏆", "🔥", "💪", "🏊", "💰", "📚", "✍️", "🚀", "⚡"]

export function slugifyTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function computeStintEnd(startDate, lengthDays = DEFAULT_STINT_DAYS) {
  return addDaysToDateKey(startDate, lengthDays - 1)
}

export function daysBetweenInclusive(a, b) {
  if (!a || !b) return 0
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / (24 * 60 * 60 * 1000)) + 1
}

// Load the stint that contains today, if any.
export async function getCurrentStint(today = getDateKey()) {
  const snap = await adminDb.collection("stints")
    .where("startDate", "<=", today)
    .get()
  const candidates = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.endDate && s.endDate >= today)
    .filter((s) => s.state !== "archived")
  candidates.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return candidates[0] || null
}

export async function loadActiveGoals() {
  const snap = await adminDb.collection("goals").get()
  const goals = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((g) => (g.state || (g.status === "archived" ? "archived" : "active")) !== "archived")
  goals.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  return goals
}

export async function loadAllStints() {
  const snap = await adminDb.collection("stints").get()
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))
  return list
}

export async function nextStintIndex() {
  const snap = await adminDb.collection("stints").get()
  return snap.docs.reduce((acc, d) => Math.max(acc, d.data().index || 0), 0) + 1
}

// Fill defaults for display fields when a goal doesn't carry them yet.
export function withGoalDisplayDefaults(goal, idx = 0) {
  return {
    ...goal,
    color: goal.color || DEFAULT_GOAL_COLORS[idx % DEFAULT_GOAL_COLORS.length],
    icon: goal.icon || DEFAULT_GOAL_ICONS[idx % DEFAULT_GOAL_ICONS.length],
    state: goal.state || (goal.status === "archived" ? "archived" : "active"),
    enforcement: GOAL_ENFORCEMENTS.includes(goal.enforcement) ? goal.enforcement : "relaxed",
  }
}

export function goalProgressSummary(goal, hits, today) {
  const enforcement = GOAL_ENFORCEMENTS.includes(goal.enforcement) ? goal.enforcement : "relaxed"
  const elapsed = hits.filter((h) => h.date <= today)
  const requiredElapsed =
    enforcement === "strict" ? elapsed.filter((h) => h.required !== false) : elapsed
  const hitsCount = requiredElapsed.filter((h) => h.hit).length
  const misses = requiredElapsed.length - hitsCount
  const hitRate = requiredElapsed.length > 0 ? hitsCount / requiredElapsed.length : 0
  let currentStreak = 0
  for (let i = requiredElapsed.length - 1; i >= 0; i--) {
    if (requiredElapsed[i].hit) currentStreak += 1
    else break
  }

  const target = Number(goal.target)
  const expectedByToday =
    Number.isFinite(target) && target > 0 && hits.length > 0
      ? Math.min(target, (target * elapsed.length) / hits.length)
      : null
  const progressValue = (() => {
    if (goal.type === "process-cadence") return hitsCount
    if (Number.isFinite(Number(goal.current))) return Number(goal.current)
    return hitsCount
  })()
  const paceDelta =
    expectedByToday == null ? null : progressValue - expectedByToday

  return {
    enforcement,
    hitsCount,
    misses,
    hitRate,
    currentStreak,
    daysElapsed: requiredElapsed.length,
    daysTotal: hits.length,
    expectedByToday,
    progressValue,
    paceDelta,
    pace: paceDelta == null ? null : paceDelta >= 0 ? "on-track" : "behind",
  }
}

export function isGoalRequiredOnDate(goal, date) {
  if ((goal.enforcement || "relaxed") !== "strict") return false
  const cadence = goal.cadence || "daily"
  if (cadence === "daily") return true
  const [y, m, d] = date.split("-").map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (cadence === "weekdays") return day >= 1 && day <= 5
  if (cadence === "weekly") return day === 0
  return true
}

// Compute progress for a goal across a stint's date window using instances.
export function hitsForGoalInWindow(goal, instances, dates) {
  const byDate = new Map()
  for (const i of instances) {
    if (i.goalId !== goal.id) continue
    if (!byDate.has(i.date)) byDate.set(i.date, [])
    byDate.get(i.date).push(i)
  }
  return dates.map((date) => {
    const required = isGoalRequiredOnDate(goal, date)
    const day = byDate.get(date) || []
    if (day.length === 0) return { date, hit: false, value: 0, count: 0, required }
    if (goal.type === "process-cadence") {
      const prim = goal.primaryPrimitive || "duration"
      const sum = day.reduce((acc, inst) => {
        const v = inst.values?.[prim]
        return acc + (Number.isFinite(Number(v)) ? Number(v) : 0)
      }, 0)
      const floor = Number(goal.floor) || 0
      // Floor is the "minimum won day" gate. When unset, any logged instance
      // counts — otherwise the day silently reads as a miss despite real work.
      const hit = floor > 0 ? sum >= floor : day.length > 0
      return { date, hit, value: sum, count: day.length, required }
    }
    return { date, hit: true, value: null, count: day.length, required }
  })
}

export function buildDates(start, end) {
  const out = []
  for (let d = start; d <= end; d = addDaysToDateKey(d, 1)) out.push(d)
  return out
}
