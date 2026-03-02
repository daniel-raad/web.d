import { useState, useEffect, useMemo } from "react"
import { WEEKS, PHASES, DISCIPLINE_INFO } from "./ironmanData"
import styles from "../../styles/Todos.module.css"

const STORAGE_KEY = "ironman-plan-checked"
const START_DATE_KEY = "ironman-plan-start"
const DAY_ORDER_KEY = "ironman-day-orders"
const SESSION_MOVES_KEY = "ironman-session-moves"

function getStored(key, fallback) {
  if (typeof window === "undefined") return fallback
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch { return fallback }
}

function getStoredChecks() {
  return getStored(STORAGE_KEY, {})
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

export default function IronmanView() {
  const [checked, setChecked] = useState({})
  const [startDate, setStartDate] = useState(null)
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [expandedSessions, setExpandedSessions] = useState({})
  const [editingStart, setEditingStart] = useState(false)
  const [dayOrders, setDayOrders] = useState({})       // { weekNum: [origDayIndices] }
  const [sessionMoves, setSessionMoves] = useState({})  // { "w1-d0-s1": targetDayIdx }
  const [movingSession, setMovingSession] = useState(null) // key of session being moved

  useEffect(() => {
    setChecked(getStoredChecks())
    setDayOrders(getStored(DAY_ORDER_KEY, {}))
    setSessionMoves(getStored(SESSION_MOVES_KEY, {}))
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

  // Day ordering
  const getDayOrder = (weekNum, dayCount) => {
    return dayOrders[weekNum] || Array.from({ length: dayCount }, (_, i) => i)
  }

  const swapDays = (weekNum, dayCount, posA, posB) => {
    const order = [...getDayOrder(weekNum, dayCount)]
    ;[order[posA], order[posB]] = [order[posB], order[posA]]
    setDayOrders((prev) => {
      const next = { ...prev, [weekNum]: order }
      localStorage.setItem(DAY_ORDER_KEY, JSON.stringify(next))
      return next
    })
  }

  const resetWeekOrder = (weekNum) => {
    setDayOrders((prev) => {
      const next = { ...prev }
      delete next[weekNum]
      localStorage.setItem(DAY_ORDER_KEY, JSON.stringify(next))
      return next
    })
    // Also clear session moves for this week
    setSessionMoves((prev) => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(`w${weekNum}-`)) next[k] = v
      }
      localStorage.setItem(SESSION_MOVES_KEY, JSON.stringify(next))
      return next
    })
  }

  // Session moving
  const moveSession = (sessionKey, targetOrigDayIdx) => {
    setSessionMoves((prev) => {
      const next = { ...prev, [sessionKey]: targetOrigDayIdx }
      // If moving back to original day, remove the override
      const origDayIdx = parseInt(sessionKey.split("-")[1].slice(1))
      if (targetOrigDayIdx === origDayIdx) delete next[sessionKey]
      localStorage.setItem(SESSION_MOVES_KEY, JSON.stringify(next))
      return next
    })
    setMovingSession(null)
  }

  // Get sessions for a given original day index, accounting for moves
  const getSessionsForDay = (weekNum, origDayIdx, allDays) => {
    const results = []
    allDays.forEach((day, di) => {
      day.sessions.forEach((session, si) => {
        const key = `w${weekNum}-d${di}-s${si}`
        const movedTo = sessionMoves[key]
        const belongsHere = movedTo !== undefined ? movedTo === origDayIdx : di === origDayIdx
        if (belongsHere) {
          results.push({ session, origDayIdx: di, origSessionIdx: si, key })
        }
      })
    })
    return results
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
            {expanded && (() => {
              const order = getDayOrder(w.week, w.days.length)
              const isCustomOrder = !!dayOrders[w.week] || Object.keys(sessionMoves).some((k) => k.startsWith(`w${w.week}-`))

              return (
                <div className={styles.ironmanDays}>
                  {isCustomOrder && (
                    <div className={styles.ironmanResetRow}>
                      <button className={styles.ironmanResetBtn} onClick={() => resetWeekOrder(w.week)}>
                        Reset order
                      </button>
                    </div>
                  )}
                  {order.map((origDayIdx, displayPos) => {
                    const day = w.days[origDayIdx]
                    if (!day) return null
                    const dayDate = addDays(weekStart, displayPos)
                    const isToday = dayDate.toDateString() === new Date().toDateString()
                    const sessions = getSessionsForDay(w.week, origDayIdx, w.days)

                    return (
                      <div key={origDayIdx} className={`${styles.ironmanDay} ${isToday ? styles.ironmanDayToday : ""}`}>
                        <div className={styles.ironmanDayHeader}>
                          <div className={styles.ironmanDayLeft}>
                            <span className={styles.ironmanDayName}>{day.day}</span>
                            <span className={styles.ironmanDayDate}>{formatDate(dayDate)}</span>
                          </div>
                          <div className={styles.ironmanDayArrows}>
                            <button
                              className={styles.ironmanArrowBtn}
                              onClick={() => swapDays(w.week, w.days.length, displayPos, displayPos - 1)}
                              disabled={displayPos === 0}
                            >▲</button>
                            <button
                              className={styles.ironmanArrowBtn}
                              onClick={() => swapDays(w.week, w.days.length, displayPos, displayPos + 1)}
                              disabled={displayPos === order.length - 1}
                            >▼</button>
                          </div>
                        </div>
                        <div className={styles.ironmanSessions}>
                          {sessions.map(({ session, origDayIdx, key }) => {
                            const done = checked[key]
                            const info = DISCIPLINE_INFO[session.d] || { label: session.d, icon: "📋", color: "#6b7280" }
                            const sessionExpanded = expandedSessions[key]
                            const isMoving = movingSession === key
                            const isMoved = sessionMoves[key] !== undefined

                            return (
                              <div key={key} className={`${styles.ironmanSession} ${isMoved ? styles.ironmanSessionMoved : ""}`}>
                                <div className={styles.ironmanSessionRow}>
                                  <div
                                    className={`${styles.ironmanCheck} ${done ? styles.ironmanCheckDone : ""}`}
                                    onClick={() => toggle(key)}
                                  >
                                    {done && "✓"}
                                  </div>
                                  <span className={styles.ironmanIcon}>{info.icon}</span>
                                  <span className={styles.ironmanDiscipline} style={{ color: info.color }}>
                                    {info.label}
                                  </span>
                                  <span className={`${styles.ironmanDur} ${done ? styles.ironmanTextDone : ""}`}>
                                    {session.dur}
                                  </span>
                                  {session.z !== "-" && (
                                    <span className={styles.ironmanZone}>{session.z}</span>
                                  )}
                                  <button
                                    className={`${styles.ironmanMoveBtn} ${isMoving ? styles.ironmanMoveBtnActive : ""}`}
                                    onClick={() => setMovingSession(isMoving ? null : key)}
                                    title="Move to another day"
                                  >↕</button>
                                  <button
                                    className={styles.ironmanExpandBtn}
                                    onClick={() => toggleSession(key)}
                                  >
                                    {sessionExpanded ? "−" : "+"}
                                  </button>
                                </div>
                                {isMoving && (
                                  <div className={styles.ironmanMoveMenu}>
                                    <span className={styles.ironmanMoveLabel}>Move to:</span>
                                    {order.map((targetDayIdx) => {
                                      const targetDay = w.days[targetDayIdx]
                                      if (targetDayIdx === origDayIdx && !sessionMoves[key]) return null
                                      return (
                                        <button
                                          key={targetDayIdx}
                                          className={`${styles.ironmanMoveOption} ${targetDayIdx === origDayIdx ? styles.ironmanMoveOriginal : ""}`}
                                          onClick={() => moveSession(key, targetDayIdx)}
                                        >
                                          {targetDay?.day}{targetDayIdx === origDayIdx ? " (original)" : ""}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
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
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}
