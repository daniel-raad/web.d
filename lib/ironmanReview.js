import { adminDb } from "./firebaseAdmin"
import {
  WEEKS,
  DISCIPLINE_INFO,
  DEFAULT_IRONMAN_START_DATE,
  getCurrentWeek,
  getTrainingWeekProgress,
} from "../components/Todos/ironmanData"
import {
  addDaysToDateKey,
  compareDateKeys,
  getDateKey,
  zonedDateTimeToISOString,
} from "./dates.js"

const DEFAULT_PLAN = {
  checked: {},
  actuals: {},
  startDate: DEFAULT_IRONMAN_START_DATE,
  dayOrders: {},
  sessionMoves: {},
}

function pct(done, total) {
  if (!total) return 100
  return Math.round((done / total) * 100)
}

function completedAtToMs(value) {
  if (!value) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const ms = new Date(value).getTime()
    return Number.isFinite(ms) ? ms : null
  }
  if (typeof value.toMillis === "function") return value.toMillis()
  if (typeof value.toDate === "function") return value.toDate().getTime()

  const seconds = value.seconds ?? value._seconds
  if (typeof seconds === "number") {
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0
    return seconds * 1000 + Math.floor(nanos / 1000000)
  }

  return null
}

function parsePlannedMinutes(duration) {
  if (!duration || duration === "-") return 0
  const value = String(duration).toLowerCase()
  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/)
  if (hourMatch) return Math.round(Number(hourMatch[1]) * 60)
  const minuteMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)/)
  if (minuteMatch) return Math.round(Number(minuteMatch[1]))
  return 0
}

function normaliseSession(session, actuals = {}) {
  const info = DISCIPLINE_INFO[session.d] || { label: session.d }
  const actual = actuals[session.key] || null
  return {
    key: session.key,
    date: session.date,
    status: session.status,
    discipline: info.label,
    duration: session.dur,
    zone: session.z,
    workout: session.workout,
    purpose: session.purpose,
    checked: !!session.checked || !!actual,
    actual,
    moved: !!session.moved,
    plannedMinutes: parsePlannedMinutes(session.dur),
  }
}

function getSessionsInRange({ startDate, checked, actuals, dayOrders, sessionMoves, rangeStart, rangeEnd, today }) {
  const sessions = []

  WEEKS.forEach((week) => {
    const progress = getTrainingWeekProgress(week.week, startDate, checked, {
      dayOrders,
      sessionMoves,
      today,
    })
    if (!progress) return

    progress.days.forEach((day) => {
      if (compareDateKeys(day.date, rangeStart) < 0 || compareDateKeys(day.date, rangeEnd) > 0) return
      day.sessions.forEach((session) => sessions.push(normaliseSession(session, actuals)))
    })
  })

  return sessions.sort((a, b) => compareDateKeys(a.date, b.date) || a.key.localeCompare(b.key))
}

function summariseSessions(sessions, today) {
  const due = sessions.filter((s) => compareDateKeys(s.date, today) <= 0)
  const completedDue = due.filter((s) => s.checked)
  const missed = due.filter((s) => s.status === "missed")
  const dueToday = sessions.filter((s) => s.status === "due_today")
  const upcoming = sessions.filter((s) => s.status === "upcoming")

  const byDiscipline = {}
  due.forEach((session) => {
    if (!byDiscipline[session.discipline]) {
      byDiscipline[session.discipline] = {
        plannedDue: 0,
        completedDue: 0,
        missed: 0,
        plannedMinutesDue: 0,
        completedMinutesDue: 0,
      }
    }
    const bucket = byDiscipline[session.discipline]
    bucket.plannedDue += 1
    bucket.plannedMinutesDue += session.plannedMinutes
    if (session.checked) {
      bucket.completedDue += 1
      bucket.completedMinutesDue += session.plannedMinutes
    }
    if (session.status === "missed") bucket.missed += 1
  })

  const lastCompleted = [...sessions].reverse().find((s) => s.checked && compareDateKeys(s.date, today) <= 0)

  return {
    plannedDue: due.length,
    completedDue: completedDue.length,
    missed: missed.length,
    dueToday: dueToday.length,
    upcoming: upcoming.length,
    adherencePct: pct(completedDue.length, due.length),
    plannedMinutesDue: due.reduce((sum, s) => sum + s.plannedMinutes, 0),
    completedMinutesDue: completedDue.reduce((sum, s) => sum + s.plannedMinutes, 0),
    byDiscipline,
    lastCompleted: lastCompleted || null,
  }
}

async function getHabitsForDate(today) {
  const [year, month] = today.split("-")
  const [habitsDoc, entryDoc] = await Promise.all([
    adminDb.collection("monthHabits").doc(`${year}-${month}`).get(),
    adminDb.collection("habitEntries").doc(today).get(),
  ])
  const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
  const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
  const completions = entry.habits || {}
  const completed = habits.filter((h) => completions[h.id] === true).length
  return {
    total: habits.length,
    completed,
    sleep: entry.sleep || null,
    weight: entry.weight || null,
    moment: entry.moment || "",
  }
}

async function getTodoLoad(today) {
  const snap = await adminDb.collection("todos").get()
  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const active = todos.filter((t) => !t.completed)
  const dueTodayOrOverdue = active.filter((t) => t.dueDate && t.dueDate <= today)
  const overdue = dueTodayOrOverdue.filter((t) => t.dueDate < today)

  const startIso = zonedDateTimeToISOString(today, { hour: 0, minute: 0, second: 0 })
  const endIso = zonedDateTimeToISOString(today, { hour: 23, minute: 59, second: 59 })
  const startMs = startIso ? new Date(startIso).getTime() : NaN
  const endMs = endIso ? new Date(endIso).getTime() : NaN
  const completedToday = todos.filter((todo) => {
    const completedAtMs = completedAtToMs(todo.completedAt)
    return completedAtMs && completedAtMs >= startMs && completedAtMs <= endMs
  })

  return {
    active: active.length,
    dueTodayOrOverdue: dueTodayOrOverdue.length,
    overdue: overdue.length,
    unscheduled: active.filter((t) => !t.dueDate).length,
    completedToday: completedToday.length,
    dueItems: dueTodayOrOverdue
      .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      .slice(0, 8)
      .map((t) => ({ id: t.id, text: t.text, category: t.category, dueDate: t.dueDate })),
  }
}

function getLoadLabel({ trainingDueToday, overdueTodos, dueTodos, habitsRemaining }) {
  const score = trainingDueToday * 2 + overdueTodos * 2 + dueTodos + Math.min(habitsRemaining, 5)
  if (score >= 12) return "heavy"
  if (score >= 7) return "busy"
  if (score >= 3) return "normal"
  return "light"
}

export async function getTrainingRealitySnapshot(options = {}) {
  const today = options.today || getDateKey()
  const rangeDays = Math.max(1, Math.min(Number(options.rangeDays) || 14, 42))
  const rangeStart = options.startDate || addDaysToDateKey(today, -(rangeDays - 1))
  const rangeEnd = options.endDate || today

  const [planDoc, configDoc, habitsToday, todoLoad] = await Promise.all([
    adminDb.collection("ironman").doc("plan").get(),
    adminDb.collection("habitConfig").doc("settings").get(),
    getHabitsForDate(today),
    getTodoLoad(today),
  ])

  const plan = planDoc.exists ? { ...DEFAULT_PLAN, ...planDoc.data() } : DEFAULT_PLAN
  const checked = plan.checked || {}
  const actuals = plan.actuals || {}
  const effectiveChecked = { ...checked }
  Object.keys(actuals).forEach((key) => {
    effectiveChecked[key] = true
  })
  const startDate = plan.startDate || DEFAULT_IRONMAN_START_DATE
  const dayOrders = plan.dayOrders || {}
  const sessionMoves = plan.sessionMoves || {}
  const currentWeek = getCurrentWeek(startDate, today)
  const currentWeekProgress = getTrainingWeekProgress(currentWeek, startDate, effectiveChecked, {
    dayOrders,
    sessionMoves,
    today,
  })

  const sessions = getSessionsInRange({
    startDate,
    checked: effectiveChecked,
    actuals,
    dayOrders,
    sessionMoves,
    rangeStart,
    rangeEnd,
    today,
  })
  const recentSummary = summariseSessions(sessions, today)
  const todaySessions = sessions.filter((s) => s.date === today)
  const todaySummary = summariseSessions(todaySessions, today)

  const next7Start = addDaysToDateKey(today, 1)
  const next7End = addDaysToDateKey(today, 7)
  const upcomingSessions = getSessionsInRange({
    startDate,
    checked: effectiveChecked,
    actuals,
    dayOrders,
    sessionMoves,
    rangeStart: next7Start,
    rangeEnd: next7End,
    today,
  })

  const config = configDoc.exists ? configDoc.data() : {}
  const targetDate = config.targetDate || "2026-08-01"
  const daysToGoal = targetDate ? Math.max(0, compareDateKeys(targetDate, today)) : null
  const habitsRemaining = Math.max(0, habitsToday.total - habitsToday.completed)

  return {
    today,
    range: { start: rangeStart, end: rangeEnd, days: rangeDays },
    goal: {
      targetDate,
      daysToGoal,
      currentWeek,
      totalWeeks: WEEKS.length,
      phase: currentWeekProgress?.phase || null,
      weekTitle: currentWeekProgress?.title || null,
    },
    plannedVsActual: {
      today: {
        planned: todaySessions.length,
        done: todaySessions.filter((s) => s.checked).length,
        open: todaySessions.filter((s) => !s.checked).length,
        sessions: todaySessions,
      },
      currentWeek: currentWeekProgress ? {
        week: currentWeekProgress.week,
        status: currentWeekProgress.status,
        dateRange: currentWeekProgress.dateRange,
        progress: currentWeekProgress.progress,
        dueProgress: currentWeekProgress.dueProgress,
        totals: currentWeekProgress.totals,
        adherencePct: pct(currentWeekProgress.totals.completedDue, currentWeekProgress.totals.due),
      } : null,
      recent: recentSummary,
      upcoming7Days: upcomingSessions.slice(0, 20),
    },
    currentShape: {
      recentAdherencePct: recentSummary.adherencePct,
      completedDueSessions: recentSummary.completedDue,
      plannedDueSessions: recentSummary.plannedDue,
      missedSessions: recentSummary.missed,
      completedPlannedMinutes: recentSummary.completedMinutesDue,
      plannedMinutesDue: recentSummary.plannedMinutesDue,
      byDiscipline: recentSummary.byDiscipline,
      lastCompleted: recentSummary.lastCompleted,
      note: "Shape is inferred from plan adherence, actual workout logs, habits, sleep, and weight. Checked sessions confirm completion, but not pace, HR, or power.",
    },
    dayLoad: {
      label: getLoadLabel({
        trainingDueToday: todaySummary.dueToday + todaySummary.missed,
        overdueTodos: todoLoad.overdue,
        dueTodos: todoLoad.dueTodayOrOverdue,
        habitsRemaining,
      }),
      trainingDueToday: todaySummary.dueToday,
      trainingOpenToday: todaySessions.filter((s) => !s.checked).length,
      habits: habitsToday,
      todos: todoLoad,
    },
  }
}
