import { useState, useEffect, useMemo, useRef } from "react"
import { WEEKS, PHASES, DISCIPLINE_INFO } from "./ironmanData"
import { getIronmanPlan, saveIronmanPlan } from "../../lib/firestore"
import styles from "../../styles/Todos.module.css"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const DEFAULT_START = "2026-03-08"

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
  const [startDate, setStartDate] = useState(DEFAULT_START)
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [expandedSessions, setExpandedSessions] = useState({})
  const [editingStart, setEditingStart] = useState(false)
  const [dayOrders, setDayOrders] = useState({})
  const [sessionMoves, setSessionMoves] = useState({})
  const [loading, setLoading] = useState(true)

  // Drag state
  const [dragOverDay, setDragOverDay] = useState(null)
  const [dragOverSession, setDragOverSession] = useState(null)
  const dragTypeRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getIronmanPlan()

        // One-time localStorage migration
        if (typeof window !== "undefined") {
          const lsChecked = localStorage.getItem("ironman-plan-checked")
          const lsDayOrders = localStorage.getItem("ironman-day-orders")
          const lsSessionMoves = localStorage.getItem("ironman-session-moves")
          const hasLocal = lsChecked || lsDayOrders || lsSessionMoves
          const isFirestoreEmpty = !data.checked || Object.keys(data.checked).length === 0

          if (hasLocal && isFirestoreEmpty) {
            const migrated = {
              checked: lsChecked ? JSON.parse(lsChecked) : {},
              startDate: localStorage.getItem("ironman-plan-start") || DEFAULT_START,
              dayOrders: lsDayOrders ? JSON.parse(lsDayOrders) : {},
              sessionMoves: lsSessionMoves ? JSON.parse(lsSessionMoves) : {},
            }
            setChecked(migrated.checked)
            setStartDate(migrated.startDate)
            setDayOrders(migrated.dayOrders)
            setSessionMoves(migrated.sessionMoves)
            saveIronmanPlan(migrated)
            localStorage.removeItem("ironman-plan-checked")
            localStorage.removeItem("ironman-plan-start")
            localStorage.removeItem("ironman-day-orders")
            localStorage.removeItem("ironman-session-moves")
            setLoading(false)
            return
          }
        }

        setChecked(data.checked || {})
        setStartDate(data.startDate || DEFAULT_START)
        setDayOrders(data.dayOrders || {})
        setSessionMoves(data.sessionMoves || {})
      } catch {
        // Fallback to defaults
      }
      setLoading(false)
    }
    load()
  }, [])

  const currentWeekNum = useMemo(() => {
    if (!startDate) return 1
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(24, diff + 1))
  }, [startDate])

  useEffect(() => {
    setExpandedWeeks((prev) => ({ ...prev, [currentWeekNum]: true }))
  }, [currentWeekNum])

  const toggle = (key) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveIronmanPlan({ checked: next })
      return next
    })
  }

  const toggleWeek = (weekNum) => {
    setExpandedWeeks((prev) => ({ ...prev, [weekNum]: !prev[weekNum] }))
  }

  const toggleSession = (key) => {
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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
      saveIronmanPlan({ dayOrders: next })
      return next
    })
  }

  const resetWeekOrder = (weekNum) => {
    setDayOrders((prev) => {
      const next = { ...prev }
      delete next[weekNum]
      saveIronmanPlan({ dayOrders: next })
      return next
    })
    setSessionMoves((prev) => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(`w${weekNum}-`)) next[k] = v
      }
      saveIronmanPlan({ sessionMoves: next })
      return next
    })
  }

  const moveSession = (sessionKey, targetOrigDayIdx) => {
    setSessionMoves((prev) => {
      const next = { ...prev, [sessionKey]: targetOrigDayIdx }
      const origDayIdx = parseInt(sessionKey.split("-")[1].slice(1))
      if (targetOrigDayIdx === origDayIdx) delete next[sessionKey]
      saveIronmanPlan({ sessionMoves: next })
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

  const onSessionDragStart = (e, weekNum, sessionKey) => {
    dragTypeRef.current = "session"
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "session", weekNum, sessionKey }))
    e.stopPropagation()
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
      setStartDate(val)
      saveIronmanPlan({ startDate: val })
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

  if (loading) return <div className={styles.loading}>Loading...</div>

  const startDay = new Date(startDate)
  startDay.setHours(0, 0, 0, 0)

  return (
    <div className={styles.ironmanContainer}>
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

      <div className={styles.ironmanProgress}>
        <div className={styles.ironmanProgressBar}>
          <div className={styles.ironmanProgressFill} style={{ width: `${stats.pct}%` }} />
        </div>
        <span className={styles.ironmanProgressText}>{stats.done}/{stats.total} sessions ({stats.pct}%)</span>
      </div>

      <div className={styles.ironmanPhases}>
        {PHASES.map((p) => (
          <div key={p.name} className={styles.ironmanPhase} style={{ borderColor: p.color }}>
            <span style={{ color: p.color }}>{p.name}</span>
            <span className={styles.ironmanPhaseWeeks}>Wk {p.weeks[0]}-{p.weeks[1]}</span>
          </div>
        ))}
      </div>

      {WEEKS.map((w) => {
        const ws = weekStats(w)
        const weekStart = addDays(startDay, (w.week - 1) * 7)
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
                <span className={styles.ironmanWeekDates}>{formatDate(weekStart)} - {formatDate(weekEnd)}</span>
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
                            <span className={styles.ironmanDragHandle} title="Drag to reorder day">&#x2807;</span>
                            <span className={styles.ironmanDayName}>{dayName}</span>
                            <span className={styles.ironmanDayDate}>{formatDate(dayDate)}</span>
                          </div>
                        </div>
                        <div className={styles.ironmanSessions}>
                          {sessions.map(({ session, origDayIdx, key }) => {
                            const done = checked[key]
                            const info = DISCIPLINE_INFO[session.d] || { label: session.d, icon: "\uD83D\uDCCB", color: "#6b7280" }
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
                                  <span className={styles.ironmanSessionGrip} title="Drag to move session">&#x22EE;&#x22EE;</span>
                                  <div
                                    className={`${styles.ironmanCheck} ${done ? styles.ironmanCheckDone : ""}`}
                                    onClick={() => toggle(key)}
                                  >
                                    {done && "\u2713"}
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
                                    {sessionExpanded ? "&#x2212;" : "+"}
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
