import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  getMonthHabits, getEntries, toggleHabit,
  saveWeight, saveSleep, saveMoment,
  getTodos, updateTodo,
} from "../../lib/firestore"
import { getIdToken } from "../../lib/AuthContext"
import { compareDateKeys, dateKeyToLocalDate, getDateKey } from "../../lib/dates.js"
import styles from "../../styles/Dashboard.module.css"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function TodayHub() {
  const router = useRouter()
  const now = new Date()
  const dateStr = getDateKey(now)
  const [year, month] = dateStr.split("-").map(Number)

  const [habits, setHabits] = useState([])
  const [entries, setEntries] = useState({})
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [weightVal, setWeightVal] = useState("")
  const [sleepVal, setSleepVal] = useState("")
  const [momentVal, setMomentVal] = useState("")
  const [stravaStatus, setStravaStatus] = useState(null)
  const [stravaBusy, setStravaBusy] = useState(false)
  const weightTimer = useRef(null)
  const sleepTimer = useRef(null)
  const momentTimer = useRef(null)

  // Load all data
  useEffect(() => {
    async function load() {
      const [h, e, t] = await Promise.all([
        getMonthHabits(year, month),
        getEntries(year, month),
        getTodos(),
      ])
      setHabits(h)
      setEntries(e)
      setTodos(t)
      const todayEntry = e[dateStr] || {}
      setWeightVal(todayEntry.weight ?? "")
      setSleepVal(todayEntry.sleep ?? "")
      setMomentVal(todayEntry.moment ?? "")
      setLoading(false)
    }
    load()
  }, [year, month, dateStr])

  // Strava status
  useEffect(() => {
    async function loadStrava() {
      const token = await getIdToken()
      if (!token) return
      const res = await fetch("/api/strava/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setStravaStatus(await res.json())
    }
    loadStrava()
  }, [router.query.strava])

  const handleStravaConnect = useCallback(async () => {
    setStravaBusy(true)
    try {
      const token = await getIdToken()
      const res = await fetch("/api/strava/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(`Strava connect failed: ${body.error || res.status}`)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } finally {
      setStravaBusy(false)
    }
  }, [])

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

  const todayDate = dateKeyToLocalDate(dateStr)
  const dateLabel = `${DAY_NAMES[todayDate.getDay()]}, ${MONTH_NAMES[todayDate.getMonth()]} ${todayDate.getDate()}`

  return (
    <div className={`${styles.dashboard} terminal`}>
      {/* Header banner */}
      <div className={styles.hubHeader}>
        <div className={styles.hubDate}>{dateLabel}</div>
        <div className={styles.hubSummary}>
          <span className={styles.hubStat}>
            {habitsDone}/{habits.length} habits
          </span>
          <span className={styles.hubStat}>{todayTodos.length} due</span>
        </div>
      </div>

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
              const overdueDays = compareDateKeys(dateStr, t.dueDate)
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

      {/* Integrations */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Integrations</span>
        </div>
        <div className={styles.hubIntegrationRow}>
          <div className={styles.hubIntegrationLabel}>
            Strava
            {router.query.strava === "connected" && (
              <span className={styles.hubIntegrationFlash}> · just connected</span>
            )}
            {router.query.strava === "error" && (
              <span className={styles.hubIntegrationError}> · {router.query.reason || "failed"}</span>
            )}
          </div>
          {stravaStatus?.connected ? (
            <div className={styles.hubIntegrationStatus}>
              <span className={styles.hubIntegrationConnected}>Connected</span>
              {stravaStatus.athleteName && <span> · {stravaStatus.athleteName}</span>}
              <button
                type="button"
                className={styles.hubIntegrationBtn}
                onClick={handleStravaConnect}
                disabled={stravaBusy}
              >
                Reconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.hubIntegrationBtn}
              onClick={handleStravaConnect}
              disabled={stravaBusy}
            >
              {stravaBusy ? "Connecting..." : "Connect Strava"}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
