import { adminDb } from "./firebaseAdmin"
import { getRecentActivities, isConnected as stravaIsConnected } from "./strava"

const PLAN_DOC = adminDb.collection("assistant").doc("trainingPlan")

export const DISCIPLINES = ["swim", "bike", "run", "strength"]

const DEFAULT_TARGETS = { swim: 2, bike: 5, run: 3, strength: 2 }
const DEFAULT_RACE_DATE = "2026-08-23"

const STRAVA_TO_DISCIPLINE = {
  Swim: "swim",
  Ride: "bike",
  VirtualRide: "bike",
  MountainBikeRide: "bike",
  EBikeRide: "bike",
  GravelRide: "bike",
  Handcycle: "bike",
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  WeightTraining: "strength",
  Workout: "strength",
  Crossfit: "strength",
  HighIntensityIntervalTraining: "strength",
}

export function disciplineFor(stravaType) {
  if (!stravaType) return "other"
  return STRAVA_TO_DISCIPLINE[stravaType] || "other"
}

// Monday-based week. Returns Date at 00:00 local for the Monday of the current week.
export function getWeekStart(now = new Date()) {
  const d = new Date(now)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysUntilRace(raceDate = DEFAULT_RACE_DATE, now = new Date()) {
  const target = new Date(`${raceDate}T00:00:00`)
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export async function getPlan() {
  const snap = await PLAN_DOC.get()
  if (!snap.exists) {
    return {
      targetsHoursPerWeek: { ...DEFAULT_TARGETS },
      raceDate: DEFAULT_RACE_DATE,
      notes: "",
      updatedAt: null,
    }
  }
  const data = snap.data()
  return {
    targetsHoursPerWeek: { ...DEFAULT_TARGETS, ...(data.targetsHoursPerWeek || {}) },
    raceDate: data.raceDate || DEFAULT_RACE_DATE,
    notes: data.notes || "",
    updatedAt: data.updatedAt || null,
  }
}

export async function setPlan({ targetsHoursPerWeek, raceDate, notes }) {
  const current = await getPlan()
  const next = {
    targetsHoursPerWeek: {
      ...current.targetsHoursPerWeek,
      ...(targetsHoursPerWeek || {}),
    },
    raceDate: raceDate || current.raceDate,
    notes: notes != null ? notes : current.notes,
    updatedAt: Date.now(),
  }
  // Coerce to numbers + clamp
  for (const d of DISCIPLINES) {
    const raw = next.targetsHoursPerWeek[d]
    const num = typeof raw === "number" ? raw : parseFloat(raw)
    next.targetsHoursPerWeek[d] = Number.isFinite(num) && num >= 0 ? +num.toFixed(1) : 0
  }
  await PLAN_DOC.set(next, { merge: true })
  return next
}

// Weekly progress vs plan. Pulls last ~10 days of activities and filters to current week.
export async function getCurrentWeekProgress({ now = new Date() } = {}) {
  const plan = await getPlan()
  const weekStart = getWeekStart(now)
  const weekStartMs = weekStart.getTime()

  const empty = DISCIPLINES.reduce((acc, d) => ({ ...acc, [d]: { hours: 0, sessions: 0 } }), { other: { hours: 0, sessions: 0 } })

  let activities = []
  let stravaError = null
  try {
    if (await stravaIsConnected()) {
      activities = await getRecentActivities({ days: 10, perPage: 50 })
    } else {
      stravaError = "Strava not connected"
    }
  } catch (e) {
    stravaError = e.message
  }

  const breakdown = { ...empty }
  const sessions = []
  for (const a of activities) {
    const start = new Date(a.startDate).getTime()
    if (!Number.isFinite(start) || start < weekStartMs) continue
    const d = disciplineFor(a.type)
    const hours = (a.movingMinutes || 0) / 60
    if (!breakdown[d]) breakdown[d] = { hours: 0, sessions: 0 }
    breakdown[d].hours += hours
    breakdown[d].sessions += 1
    sessions.push({ ...a, discipline: d })
  }

  const progress = DISCIPLINES.map((d) => {
    const target = plan.targetsHoursPerWeek[d] || 0
    const done = +(breakdown[d]?.hours || 0).toFixed(1)
    const remaining = +Math.max(0, target - done).toFixed(1)
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
    return {
      discipline: d,
      targetHours: target,
      doneHours: done,
      remainingHours: remaining,
      sessions: breakdown[d]?.sessions || 0,
      pct,
    }
  })

  const totalDone = progress.reduce((s, p) => s + p.doneHours, 0)
  const totalTarget = progress.reduce((s, p) => s + p.targetHours, 0)

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    raceDate: plan.raceDate,
    daysToRace: daysUntilRace(plan.raceDate, now),
    targetsHoursPerWeek: plan.targetsHoursPerWeek,
    notes: plan.notes,
    progress,
    totals: {
      doneHours: +totalDone.toFixed(1),
      targetHours: +totalTarget.toFixed(1),
      pct: totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0,
    },
    sessions: sessions.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    stravaError,
  }
}
