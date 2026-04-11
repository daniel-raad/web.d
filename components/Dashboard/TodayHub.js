import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  getConfig, getMonthHabits, getEntries, toggleHabit,
  saveWeight, saveSleep, saveMoment,
  getTodos, updateTodo,
  getIronmanPlan, saveIronmanPlan,
} from "../../lib/firestore"
import { WEEKS, DISCIPLINE_INFO, getCurrentWeek } from "../Todos/ironmanData"
import styles from "../../styles/Dashboard.module.css"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getTodaySessions(weekNum, startDate, dayOrders, sessionMoves, checked) {
  const weekData = WEEKS.find((w) => w.week === weekNum)
  if (!weekData) return []

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const weekStart = new Date(start)
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today - weekStart) / (1000 * 60 * 60 * 24))
  if (diffDays < 0 || diffDays >= weekData.days.length) return []

  const order = dayOrders[weekNum] || Array.from({ length: weekData.days.length }, (_, i) => i)
  if (diffDays >= order.length) return []
  const origDayIdx = order[diffDays]
  if (origDayIdx === undefined || origDayIdx >= weekData.days.length) return []

  const results = []
  weekData.days.forEach((day, di) => {
    day.sessions.forEach((session, si) => {
      const key = `w${weekNum}-d${di}-s${si}`
      const movedTo = sessionMoves[key]
      const belongsHere = movedTo !== undefined ? movedTo === origDayIdx : di === origDayIdx
      if (belongsHere) {
        results.push({ session, key, checked: !!checked[key] })
      }
    })
  })
  return results
}

export default function TodayHub() {
  const now = new Date()
  const dateStr = fmtDate(now)
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [config, setConfig] = useState(null)
  const [habits, setHabits] = useState([])
  const [entries, setEntries] = useState({})
  const [todos, setTodos] = useState([])
  const [ironman, setIronman] = useState({})
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(null)
  const [weightVal, setWeightVal] = useState("")
  const [sleepVal, setSleepVal] = useState("")
  const [momentVal, setMomentVal] = useState("")
  const weightTimer = useRef(null)
  const sleepTimer = useRef(null)
  const momentTimer = useRef(null)

  // Load all data
  useEffect(() => {
    async function load() {
      const [cfg, h, e, t, ip] = await Promise.all([
        getConfig(),
        getMonthHabits(year, month),
        getEntries(year, month),
        getTodos(),
        getIronmanPlan(),
      ])
      setConfig(cfg)
      setHabits(h)
      setEntries(e)
      setTodos(t)
      setIronman(ip)
      const todayEntry = e[dateStr] || {}
      setWeightVal(todayEntry.weight ?? "")
      setSleepVal(todayEntry.sleep ?? "")
      setMomentVal(todayEntry.moment ?? "")
      setLoading(false)
    }
    load()
  }, [year, month, dateStr])

  // Countdown (every minute)
  useEffect(() => {
    if (!config?.targetDate) return
    const target = new Date(config.targetDate + "T00:00:00")
    function tick() {
      const diff = target - new Date()
      setCountdown(diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0)
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [config])

  // --- Handlers ---

  const handleHabitToggle = async (habitId, value) => {
    setEntries((prev) => {
      const e = prev[dateStr] || { habits: {} }
      return { ...prev, [dateStr]: { ...e, habits: { ...e.habits, [habitId]: value } } }
    })
    await toggleHabit(dateStr, habitId, value)
  }

  const handleWeightChange = useCallback(
    (e) => {
      const val = e.target.value
      setWeightVal(val)
      if (weightTimer.current) clearTimeout(weightTimer.current)
      weightTimer.current = setTimeout(() => {
        const num = parseFloat(val)
        if (!isNaN(num) && num > 0) saveWeight(dateStr, num)
      }, 800)
    },
    [dateStr]
  )

  const handleSleepChange = useCallback(
    (e) => {
      const val = e.target.value
      setSleepVal(val)
      if (sleepTimer.current) clearTimeout(sleepTimer.current)
      sleepTimer.current = setTimeout(() => {
        const num = parseFloat(val)
        if (!isNaN(num) && num >= 0) saveSleep(dateStr, num)
      }, 800)
    },
    [dateStr]
  )

  const handleMomentChange = useCallback(
    (e) => {
      const val = e.target.value
      setMomentVal(val)
      if (momentTimer.current) clearTimeout(momentTimer.current)
      momentTimer.current = setTimeout(() => saveMoment(dateStr, val), 800)
    },
    [dateStr]
  )

  const handleTodoToggle = async (id) => {
    const completedAt = Date.now()
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true, completedAt } : t)))
    await updateTodo(id, { completed: true, completedAt })
  }

  const handleSessionToggle = (key) => {
    setIronman((prev) => {
      const checked = { ...(prev.checked || {}), [key]: !(prev.checked || {})[key] }
      saveIronmanPlan({ checked })
      return { ...prev, checked }
    })
  }

  // --- Derived data ---

  if (loading) {
    return (
      <div className={`${styles.dashboard} terminal`}>
        <div className={styles.loadingState}>Loading...</div>
      </div>
    )
  }

  const entry = entries[dateStr] || { habits: {} }
  const habitsDone = habits.filter((h) => entry.habits[h.id]).length

  const todayTodos = todos
    .filter((t) => !t.completed && t.dueDate && t.dueDate <= dateStr)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
  const unscheduledCount = todos.filter((t) => !t.completed && !t.dueDate).length
  const activeCount = todos.filter((t) => !t.completed).length

  const startDate = ironman?.startDate || "2026-03-08"
  const currentWeek = getCurrentWeek(startDate)
  const todaySessions = getTodaySessions(
    currentWeek,
    startDate,
    ironman?.dayOrders || {},
    ironman?.sessionMoves || {},
    ironman?.checked || {}
  )

  const dateLabel = `${DAY_NAMES[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`

  return (
    <div className={`${styles.dashboard} terminal`}>
      {/* Header banner */}
      <div className={styles.hubHeader}>
        <div className={styles.hubDate}>{dateLabel}</div>
        <div className={styles.hubSummary}>
          {countdown !== null && (
            <span className={styles.hubStat}>
              <span className={styles.ironmanRed}>IRON</span>
              <span className={styles.ironmanWhite}>MAN</span>
              <span className={styles.ironmanRed}> 70.3</span>
              <span className={styles.hubStatSep}>&middot;</span>
              {countdown}d
            </span>
          )}
          <span className={styles.hubStat}>
            {habitsDone}/{habits.length} habits
          </span>
          <span className={styles.hubStat}>{todayTodos.length} due</span>
        </div>
      </div>

      {/* Training */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Training</span>
          <Link href="/dashboard/training">
            <a className={styles.hubViewAll}>View full plan &rarr;</a>
          </Link>
        </div>
        {todaySessions.length === 0 ? (
          <div className={styles.hubEmpty}>Rest day</div>
        ) : (
          <div className={styles.hubTrainingList}>
            {todaySessions.map(({ session, key, checked }) => {
              const info = DISCIPLINE_INFO[session.d] || { label: session.d, icon: "\uD83D\uDCCB", color: "#6b7280" }
              return (
                <div
                  key={key}
                  className={`${styles.hubTrainingSession} ${checked ? styles.hubSessionDone : ""}`}
                  onClick={() => handleSessionToggle(key)}
                >
                  <span className={`${styles.hubCheck} ${checked ? styles.hubCheckDone : ""}`}>
                    {checked ? "\u2713" : ""}
                  </span>
                  <span className={styles.hubTrainingIcon}>{info.icon}</span>
                  <span className={styles.hubTrainingLabel} style={{ color: checked ? undefined : info.color }}>
                    {info.label}
                  </span>
                  <span className={styles.hubTrainingDur}>{session.dur}</span>
                  {session.z !== "-" && <span className={styles.hubTrainingZone}>{session.z}</span>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Habits */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>
            Habits
            <span className={styles.hubSectionCount}>
              {habitsDone}/{habits.length}
            </span>
          </span>
          <Link href="/dashboard/habits">
            <a className={styles.hubViewAll}>View all &rarr;</a>
          </Link>
        </div>
        <div className={styles.hubHabitGrid}>
          {habits.map((h) => {
            const isDone = !!entry.habits[h.id]
            return (
              <div
                key={h.id}
                className={`${styles.hubHabitItem} ${isDone ? styles.hubHabitDone : ""}`}
                onClick={() => handleHabitToggle(h.id, !isDone)}
              >
                <span className={`${styles.hubCheck} ${isDone ? styles.hubCheckDone : ""}`}>
                  {isDone ? "\u2713" : ""}
                </span>
                {h.emoji !== "\u2705" && <span className={styles.hubHabitEmoji}>{h.emoji}</span>}
                <span className={styles.hubHabitName}>{h.name}</span>
              </div>
            )
          })}
        </div>
        <div className={styles.hubInputRow}>
          <div className={styles.hubInputGroup}>
            <label>Weight (kg)</label>
            <input
              type="number"
              value={weightVal}
              onChange={handleWeightChange}
              placeholder="e.g. 75"
              step="0.1"
              min="0"
            />
          </div>
          <div className={styles.hubInputGroup}>
            <label>Sleep (hrs)</label>
            <input
              type="number"
              value={sleepVal}
              onChange={handleSleepChange}
              placeholder="e.g. 8"
              step="0.5"
              min="0"
              max="24"
            />
          </div>
        </div>
      </section>

      {/* Todos */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Todos</span>
          <Link href="/dashboard/todos">
            <a className={styles.hubViewAll}>View all ({activeCount}) &rarr;</a>
          </Link>
        </div>
        {todayTodos.length === 0 ? (
          <div className={styles.hubEmpty}>Nothing due today</div>
        ) : (
          <div className={styles.hubTodoList}>
            {todayTodos.map((t) => {
              const overdueDays = Math.floor(
                (new Date(dateStr + "T00:00:00") - new Date(t.dueDate + "T00:00:00")) / (1000 * 60 * 60 * 24)
              )
              return (
                <div key={t.id} className={styles.hubTodoItem}>
                  <div className={styles.hubCheck} onClick={() => handleTodoToggle(t.id)} />
                  <span className={styles.hubTodoText}>{t.text}</span>
                  {overdueDays > 0 && (
                    <span className={styles.hubTodoOverdue}>{overdueDays}d overdue</span>
                  )}
                  {overdueDays === 0 && <span className={styles.hubTodoToday}>today</span>}
                </div>
              )
            })}
          </div>
        )}
        {unscheduledCount > 0 && (
          <div className={styles.hubUnscheduled}>+ {unscheduledCount} without a date</div>
        )}
      </section>

      {/* Moment */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Moment</span>
        </div>
        <textarea
          className={styles.hubMomentInput}
          value={momentVal}
          onChange={handleMomentChange}
          placeholder="What made today memorable?"
          rows={2}
        />
      </section>
    </div>
  )
}
