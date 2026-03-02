import { useState, useEffect, useMemo, useRef } from "react"
import { WEEKS, PHASES, DISCIPLINE_INFO } from "./ironmanData"
import styles from "../../styles/Todos.module.css"

const STORAGE_KEY = "ironman-plan-checked"
const START_DATE_KEY = "ironman-plan-start"
const DAY_ORDER_KEY = "ironman-day-orders"
const SESSION_MOVES_KEY = "ironman-session-moves"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function getStored(key, fallback) {
  if (typeof window === "undefined") return fallback
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch { return fallback }
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
  const [dayOrders, setDayOrders] = useState({})
  const [sessionMoves, setSessionMoves] = useState({})

  // Drag state
  const [dragOverDay, setDragOverDay] = useState(null)     // "weekNum-displayPos"
  const [dragOverSession, setDragOverSession] = useState(null) // "weekNum-origDayIdx" (target day for session drop)
  const dragTypeRef = useRef(null) // "day" or "session"

  useEffect(() => {
    setChecked(getStored(STORAGE_KEY, {}))
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

  const currentWeekNum = useMemo(() => {
    if (!startDate) return 1
    const start = getMonday(new Date(startDate))
    const now = getMonday(new Date())
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(24, diff + 1))
  }, [startDate])

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

  const moveDayToPos = (weekNum, dayCount, fromPos, toPos) => {
    if (fromPos === toPos) return
    const order = [...getDayOrder(weekNum, dayCount)]
    const [moved] = order.splice(fromPos, 1)
    order.splice(toPos, 0, moved)
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
      const origDayIdx = parseInt(sessionKey.split("-")[1].slice(1))
      if (targetOrigDayIdx === origDayIdx) delete next[sessionKey]
      localStorage.setItem(SESSION_MOVES_KEY, JSON.stringify(next))
      return next
    })
  }

  const getSessionsForDay = (weekNum, origDayIdx, allDays) => {
    const results = []
    allDays.forEach((day, di) => {
      day.sessions.forEach((session, si) => {
        const key = `w${weekNum}-d${di}-s${si}`
        const movedTo = sessionMoves[key]
        const belongsHere = movedTo !== undefined ? movedTo === origDayIdx : di === origDayIdx
        if (belongsHere) {
          results.push({ session, origDayIdx: di, key })
        }
      })
    })
    return results
  }

  // Day drag handlers
  const onDayDragStart = (e, weekNum, displayPos) => {
    dragTypeRef.current = "day"
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "day", weekNum, displayPos }))
    e.currentTarget.style.opacity = "0.4"
  }

  const onDayDragEnd = (e) => {
    e.currentTarget.style.opacity = "1"
    setDragOverDay(null)
    dragTypeRef.current = null
  }

  const onDayDragOver = (e, weekNum, displayPos) => {
    if (dragTypeRef.current !== "day") return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverDay(`${weekNum}-${displayPos}`)
  }

  const onDayDrop = (e, weekNum, dayCount, toPos) => {
    e.preventDefault()
    setDragOverDay(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"))
      if (data.type === "day" && data.weekNum === weekNum) {
        moveDayToPos(weekNum, dayCount, data.displayPos, toPos)
      }
    } catch {}
  }

  // Session drag handlers
  const onSessionDragStart = (e, weekNum, sessionKey) => {
    dragTypeRef.current = "session"
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "session", weekNum, sessionKey }))
    e.stopPropagation() // Don't trigger day drag
    e.currentTarget.style.opacity = "0.4"
  }

  const onSessionDragEnd = (e) => {
    e.currentTarget.style.opacity = "1"
    setDragOverSession(null)
    dragTypeRef.current = null
  }

  const onSessionDragOver = (e, weekNum, origDayIdx) => {
    if (dragTypeRef.current !== "session") return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSession(`${weekNum}-${origDayIdx}`)
  }

  const onSessionDrop = (e, weekNum, targetOrigDayIdx) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSession(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"))
      if (data.type === "session" && data.weekNum === weekNum) {
        moveSession(data.sessionKey, targetOrigDayIdx)
      }
    } catch {}
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
                    const dayName = WEEKDAYS[dayDate.getDay()]
                    const isDayDropTarget = dragOverDay === `${w.week}-${displayPos}`
                    const isSessionDropTarget = dragOverSession === `${w.week}-${origDayIdx}`

                    return (
                      <div
                        key={origDayIdx}
                        className={`${styles.ironmanDay} ${isToday ? styles.ironmanDayToday : ""} ${isDayDropTarget ? styles.ironmanDayDropTarget : ""} ${isSessionDropTarget ? styles.ironmanDaySessionDropTarget : ""}`}
                        onDragOver={(e) => {
                          onDayDragOver(e, w.week, displayPos)
                          onSessionDragOver(e, w.week, origDayIdx)
                        }}
                        onDragLeave={() => { setDragOverDay(null); setDragOverSession(null) }}
                        onDrop={(e) => {
                          onDayDrop(e, w.week, w.days.length, displayPos)
                          onSessionDrop(e, w.week, origDayIdx)
                        }}
                      >
                        <div
                          className={styles.ironmanDayHeader}
                          draggable
                          onDragStart={(e) => onDayDragStart(e, w.week, displayPos)}
                          onDragEnd={onDayDragEnd}
                        >
                          <div className={styles.ironmanDayLeft}>
                            <span className={styles.ironmanDragHandle} title="Drag to reorder day">⠿</span>
                            <span className={styles.ironmanDayName}>{dayName}</span>
                            <span className={styles.ironmanDayDate}>{formatDate(dayDate)}</span>
                          </div>
                        </div>
                        <div className={styles.ironmanSessions}>
                          {sessions.map(({ session, origDayIdx, key }) => {
                            const done = checked[key]
                            const info = DISCIPLINE_INFO[session.d] || { label: session.d, icon: "📋", color: "#6b7280" }
                            const sessionExpanded = expandedSessions[key]
                            const isMoved = sessionMoves[key] !== undefined

                            return (
                              <div key={key} className={`${styles.ironmanSession} ${isMoved ? styles.ironmanSessionMoved : ""}`}>
                                <div
                                  className={styles.ironmanSessionRow}
                                  draggable
                                  onDragStart={(e) => onSessionDragStart(e, w.week, key)}
                                  onDragEnd={onSessionDragEnd}
                                >
                                  <span className={styles.ironmanSessionGrip} title="Drag to move session">⋮⋮</span>
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
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}
