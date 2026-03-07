import React, { useState, useEffect, useCallback } from "react"
import TodayView from "../Habits/TodayView"
import WeekView from "../Habits/WeekView"
import HabitGrid from "../Habits/HabitGrid"
import CalendarView from "../Habits/CalendarView"
import ProgressChart from "../Habits/ProgressChart"
import MemoableMoments from "../Habits/MemoableMoments"
import HabitSettings from "../Habits/HabitSettings"
import RoutineView from "../Habits/RoutineView"
import { getMonthHabits, getEntries, toggleHabit, saveMoment, saveWeight, saveSleep, getConfig } from "../../lib/firestore"
import habitsStyles from "../../styles/Habits.module.css"
import styles from "../../styles/Dashboard.module.css"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatWeekRange(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const sMonth = MONTH_NAMES[weekStart.getMonth()]
  const eMonth = MONTH_NAMES[end.getMonth()]
  if (weekStart.getMonth() === end.getMonth()) {
    return `${sMonth} ${weekStart.getDate()}-${end.getDate()}, ${end.getFullYear()}`
  }
  return `${sMonth.slice(0, 3)} ${weekStart.getDate()} - ${eMonth.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
}

function getMonthsForWeek(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const months = [{ year: weekStart.getFullYear(), month: weekStart.getMonth() + 1 }]
  if (end.getMonth() !== weekStart.getMonth() || end.getFullYear() !== weekStart.getFullYear()) {
    months.push({ year: end.getFullYear(), month: end.getMonth() + 1 })
  }
  return months
}

export default function HabitsSection({ subView, onSubViewChange }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [habits, setHabits] = useState([])
  const [entries, setEntries] = useState({})
  const [config, setConfig] = useState(null)
  const viewMode = subView || "today"
  const setViewMode = onSubViewChange
  const [weekStart, setWeekStart] = useState(() => getMonday(now))
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthViewStyle, setMonthViewStyle] = useState("grid")

  const loadData = useCallback(async () => {
    if (viewMode === "routine") {
      setLoading(false)
      return
    }

    if (viewMode === "week") {
      const months = getMonthsForWeek(weekStart)
      const primaryMonth = months[0]
      const [h, c, ...entryResults] = await Promise.all([
        getMonthHabits(primaryMonth.year, primaryMonth.month),
        getConfig(),
        ...months.map((m) => getEntries(m.year, m.month)),
      ])
      const merged = Object.assign({}, ...entryResults)
      setHabits(h)
      setEntries(merged)
      setConfig(c)
    } else {
      const [h, e, c] = await Promise.all([
        getMonthHabits(year, month),
        getEntries(year, month),
        getConfig(),
      ])
      setHabits(h)
      setEntries(e)
      setConfig(c)
    }
    setLoading(false)
  }, [year, month, viewMode, weekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async (date, habitId, value) => {
    setEntries((prev) => {
      const entry = prev[date] || { habits: {}, moment: "" }
      return {
        ...prev,
        [date]: { ...entry, habits: { ...entry.habits, [habitId]: value } },
      }
    })
    await toggleHabit(date, habitId, value)
  }

  const handleSaveMoment = async (date, text) => {
    setEntries((prev) => {
      const entry = prev[date] || { habits: {}, moment: "" }
      return { ...prev, [date]: { ...entry, moment: text } }
    })
    await saveMoment(date, text)
  }

  const handleSaveWeight = async (date, weight) => {
    setEntries((prev) => {
      const entry = prev[date] || { habits: {}, moment: "" }
      return { ...prev, [date]: { ...entry, weight } }
    })
    await saveWeight(date, weight)
  }

  const handleSaveSleep = async (date, sleep) => {
    setEntries((prev) => {
      const entry = prev[date] || { habits: {}, moment: "" }
      return { ...prev, [date]: { ...entry, sleep } }
    })
    await saveSleep(date, sleep)
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
    setLoading(true)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setLoading(true)
  }

  const prevWeek = () => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
    setLoading(true)
  }

  const nextWeek = () => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
    setLoading(true)
  }

  const subViewToggle = (
    <div className={styles.subViewToggle}>
      {["today", "week", "month", "routine"].map((mode) => (
        <button
          key={mode}
          className={`${styles.subViewBtn} ${viewMode === mode ? styles.subViewActive : ""}`}
          onClick={() => setViewMode(mode)}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      {/* Sub-nav */}
      <div className={styles.subNav}>
        {viewMode === "week" && (
          <>
            <button className={styles.navArrow} onClick={prevWeek}>&#x25C0;</button>
            <span className={styles.navLabel}>{formatWeekRange(weekStart)}</span>
            <button className={styles.navArrow} onClick={nextWeek}>&#x25B6;</button>
          </>
        )}
        {viewMode === "month" && (
          <>
            <button className={styles.navArrow} onClick={prevMonth}>&#x25C0;</button>
            <span className={styles.navLabel}>{MONTH_NAMES[month - 1]} {year}</span>
            <button className={styles.navArrow} onClick={nextMonth}>&#x25B6;</button>
            <div className={styles.subViewToggle}>
              {["grid", "calendar"].map((s) => (
                <button
                  key={s}
                  className={`${styles.subViewBtn} ${monthViewStyle === s ? styles.subViewActive : ""}`}
                  onClick={() => setMonthViewStyle(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}
        {subViewToggle}
        <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>Settings</button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading...</div>
      ) : (
        <>
          <div className={viewMode === "routine" ? undefined : habitsStyles.mainLayout}>
            {viewMode === "today" && (
              <TodayView habits={habits} entries={entries} onToggle={handleToggle} onSaveWeight={handleSaveWeight} onSaveSleep={handleSaveSleep} />
            )}
            {viewMode === "week" && (
              <WeekView weekStart={weekStart} habits={habits} entries={entries} onToggle={handleToggle} onSaveWeight={handleSaveWeight} onSaveSleep={handleSaveSleep} />
            )}
            {viewMode === "month" && monthViewStyle === "grid" && (
              <HabitGrid year={year} month={month} habits={habits} entries={entries} onToggle={handleToggle} onSaveWeight={handleSaveWeight} onSaveSleep={handleSaveSleep} />
            )}
            {viewMode === "month" && monthViewStyle === "calendar" && (
              <CalendarView year={year} month={month} habits={habits} entries={entries} />
            )}
            {viewMode === "routine" && <RoutineView />}
            {viewMode !== "routine" && (
              <ProgressChart year={year} month={month} habits={habits} entries={entries} />
            )}
          </div>

          {viewMode !== "routine" && (
            <MemoableMoments year={year} month={month} entries={entries} onSaveMoment={handleSaveMoment} />
          )}
        </>
      )}

      {showSettings && (
        <HabitSettings habits={habits} year={year} month={month} onClose={() => setShowSettings(false)} onRefresh={loadData} />
      )}
    </div>
  )
}
