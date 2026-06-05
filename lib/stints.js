// The stint is the chassis of the system. Each stint is a 75-day window
// owning a set of GOALS that share the same start/end. At the end you write
// one review covering the whole stint, then start a new one with whatever
// goals make sense next. Goals live in the existing `goals/*` collection
// tagged with `stintId`; we keep them addressable so templates, instances,
// and the planner don't need to change.

import { adminDb } from "./firebaseAdmin"
import { addDaysToDateKey, getDateKey } from "./dates.js"

export const DEFAULT_STINT_DAYS = 75
export const MAX_GOALS_PER_STINT = 4

export const STINT_STATES = ["planning", "active", "completed", "archived"]
export const GOAL_STATES = ["active", "completed", "abandoned", "archived"]

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
  }
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
    const day = byDate.get(date) || []
    if (day.length === 0) return { date, hit: false, value: 0, count: 0 }
    if (goal.type === "process-cadence") {
      const prim = goal.primaryPrimitive || "duration"
      const sum = day.reduce((acc, inst) => {
        const v = inst.values?.[prim]
        return acc + (Number.isFinite(Number(v)) ? Number(v) : 0)
      }, 0)
      const floor = Number(goal.floor) || 0
      return { date, hit: sum >= floor && floor > 0, value: sum, count: day.length }
    }
    return { date, hit: true, value: null, count: day.length }
  })
}

export function buildDates(start, end) {
  const out = []
  for (let d = start; d <= end; d = addDaysToDateKey(d, 1)) out.push(d)
  return out
}
