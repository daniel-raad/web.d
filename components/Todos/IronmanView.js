import { useState, useEffect, useMemo } from "react"
import { WEEKS, PHASES, DISCIPLINE_INFO } from "./ironmanData"
import styles from "../../styles/Todos.module.css"

const STORAGE_KEY = "ironman-plan-checked"
const START_DATE_KEY = "ironman-plan-start"

function getStoredChecks() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch { return {} }
}

function getStoredStart() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(START_DATE_KEY) || null
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function formatDateFull(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const DAY_OFFSETS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

export default function IronmanView() {
  const [checked, setChecked] = useState({})
  const [startDate, setStartDate] = useState(null)
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [expandedSessions, setExpandedSessions] = useState({})
  const [editingStart, setEditingStart] = useState(false)

  useEffect(() => {
    setChecked(getStoredChecks())
    const stored = getStoredStart()
    if (stored) {
      setStartDate(stored)
    } else {
      const monday = getMonday(new Date())
      const iso = monday.toISOString().split("T")[0]
      setStartDate(iso)
      localStorage.setItem(START_DATE_KEY, iso)
    }
  }, [])

  // Determine current week number
  const currentWeekNum = useMemo(() => {
    if (!startDate) return 1
    const start = getMonday(new Date(startDate))
    const now = getMonday(new Date())
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(24, diff + 1))
  }, [startDate])

  // Auto-expand current week on mount
  useEffect(() => {
    setExpandedWeeks((prev) => ({ ...prev, [currentWeekNum]: true }))
  }, [currentWeekNum])

  const toggle = (key) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const toggleWeek = (weekNum) => {
    setExpandedWeeks((prev) => ({ ...prev, [weekNum]: !prev[weekNum] }))
  }

  const toggleSession = (key) => {
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStartDateChange = (e) => {
    const val = e.target.value
    if (val) {
      const monday = getMonday(new Date(val))
      const iso = monday.toISOString().split("T")[0]
      setStartDate(iso)
      localStorage.setItem(START_DATE_KEY, iso)
    }
    setEditingStart(false)
  }

  // Stats
  const stats = useMemo(() => {
    let total = 0
    let done = 0
    WEEKS.forEach((w) => {
      w.days.forEach((day, di) => {
        day.sessions.forEach((_, si) => {
          total++
          if (checked[`w${w.week}-d${di}-s${si}`]) done++
        })
      })
    })
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [checked])

  // Week stats
  const weekStats = (w) => {
    let total = 0, done = 0
    w.days.forEach((day, di) => {
      day.sessions.forEach((_, si) => {
        total++
        if (checked[`w${w.week}-d${di}-s${si}`]) done++
      })
    })
    return { total, done }
  }

  if (!startDate) return null

  const startMon = getMonday(new Date(startDate))

  return (
    <div className={styles.ironmanContainer}>
      {/* Header */}
      <div className={styles.ironmanHeader}>
        <div className={styles.ironmanTitle}>
          <span>Ironman 70.3 Training Plan</span>
          <span className={styles.ironmanSubtitle}>24 weeks</span>
        </div>
        <div className={styles.ironmanStartDate}>
          {editingStart ? (
            <input
              type="date"
              defaultValue={startDate}
              onBlur={handleStartDateChange}
              onChange={handleStartDateChange}
              autoFocus
              className={styles.ironmanDateInput}
            />
          ) : (
            <button onClick={() => setEditingStart(true)} className={styles.ironmanStartBtn}>
              Start: {formatDateFull(new Date(startDate))}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.ironmanProgress}>
        <div className={styles.ironmanProgressBar}>
          <div className={styles.ironmanProgressFill} style={{ width: `${stats.pct}%` }} />
        </div>
        <span className={styles.ironmanProgressText}>{stats.done}/{stats.total} sessions ({stats.pct}%)</span>
      </div>

      {/* Phase labels */}
      <div className={styles.ironmanPhases}>
        {PHASES.map((p) => (
          <div key={p.name} className={styles.ironmanPhase} style={{ borderColor: p.color }}>
            <span style={{ color: p.color }}>{p.name}</span>
            <span className={styles.ironmanPhaseWeeks}>Wk {p.weeks[0]}-{p.weeks[1]}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      {WEEKS.map((w) => {
        const ws = weekStats(w)
        const weekStart = addDays(startMon, (w.week - 1) * 7)
        const weekEnd = addDays(weekStart, 6)
        const isCurrent = w.week === currentWeekNum
        const isPast = w.week < currentWeekNum
        const expanded = expandedWeeks[w.week]
        const phase = PHASES.find((p) => w.week >= p.weeks[0] && w.week <= p.weeks[1])

        return (
          <div
            key={w.week}
            className={`${styles.ironmanWeek} ${isCurrent ? styles.ironmanWeekCurrent : ""} ${isPast && ws.done === ws.total && ws.total > 0 ? styles.ironmanWeekDone : ""}`}
          >
            {/* Week header */}
            <button className={styles.ironmanWeekHeader} onClick={() => toggleWeek(w.week)}>
              <div className={styles.ironmanWeekLeft}>
                <span className={styles.ironmanWeekChevron}>{expanded ? "▾" : "▸"}</span>
                <span className={styles.ironmanWeekNum} style={{ borderColor: phase?.color }}>W{w.week}</span>
                <span className={styles.ironmanWeekTitle}>{w.title}</span>
                {isCurrent && <span className={styles.ironmanCurrentBadge}>Current</span>}
              </div>
              <div className={styles.ironmanWeekRight}>
                <span className={styles.ironmanWeekDates}>{formatDate(weekStart)} – {formatDate(weekEnd)}</span>
                <span className={styles.ironmanWeekHours}>{w.hours}h</span>
                <span className={styles.ironmanWeekProgress}>{ws.done}/{ws.total}</span>
              </div>
            </button>

            {/* Week days */}
            {expanded && (
              <div className={styles.ironmanDays}>
                {w.days.map((day, di) => {
                  const dayDate = addDays(weekStart, DAY_OFFSETS[day.day] ?? di)
                  const isToday = dayDate.toDateString() === new Date().toDateString()

                  return (
                    <div key={di} className={`${styles.ironmanDay} ${isToday ? styles.ironmanDayToday : ""}`}>
                      <div className={styles.ironmanDayHeader}>
                        <span className={styles.ironmanDayName}>{day.day}</span>
                        <span className={styles.ironmanDayDate}>{formatDate(dayDate)}</span>
                      </div>
                      <div className={styles.ironmanSessions}>
                        {day.sessions.map((session, si) => {
                          const key = `w${w.week}-d${di}-s${si}`
                          const done = checked[key]
                          const info = DISCIPLINE_INFO[session.d] || { label: session.d, icon: "📋", color: "#6b7280" }
                          const sessionExpanded = expandedSessions[key]

                          return (
                            <div key={si} className={styles.ironmanSession}>
                              <div className={styles.ironmanSessionRow}>
                                <div
                                  className={`${styles.ironmanCheck} ${done ? styles.ironmanCheckDone : ""}`}
                                  onClick={() => toggle(key)}
                                >
                                  {done && "✓"}
                                </div>
                                <span className={styles.ironmanIcon}>{info.icon}</span>
                                <span
                                  className={styles.ironmanDiscipline}
                                  style={{ color: info.color }}
                                >
                                  {info.label}
                                </span>
                                <span className={`${styles.ironmanDur} ${done ? styles.ironmanTextDone : ""}`}>
                                  {session.dur}
                                </span>
                                {session.z !== "-" && (
                                  <span className={styles.ironmanZone}>{session.z}</span>
                                )}
                                <button
                                  className={styles.ironmanExpandBtn}
                                  onClick={() => toggleSession(key)}
                                >
                                  {sessionExpanded ? "−" : "+"}
                                </button>
                              </div>
                              {sessionExpanded && (
                                <div className={styles.ironmanDetails}>
                                  <div className={styles.ironmanDetailRow}>
                                    <span className={styles.ironmanDetailLabel}>Workout</span>
                                    <span>{session.workout}</span>
                                  </div>
                                  {session.sets !== "-" && (
                                    <div className={styles.ironmanDetailRow}>
                                      <span className={styles.ironmanDetailLabel}>Sets</span>
                                      <span>{session.sets}</span>
                                    </div>
                                  )}
                                  {session.rest !== "-" && (
                                    <div className={styles.ironmanDetailRow}>
                                      <span className={styles.ironmanDetailLabel}>Rest</span>
                                      <span>{session.rest}</span>
                                    </div>
                                  )}
                                  <div className={styles.ironmanDetailRow}>
                                    <span className={styles.ironmanDetailLabel}>Purpose</span>
                                    <span>{session.purpose}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
