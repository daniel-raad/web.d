import React, { useState, useEffect, useCallback } from "react"
import Head from "next/head"
import Header from "../components/Header"
import TodayView from "../components/Habits/TodayView"
import WeekView from "../components/Habits/WeekView"
import HabitGrid from "../components/Habits/HabitGrid"
import CalendarView from "../components/Habits/CalendarView"
import ProgressChart from "../components/Habits/ProgressChart"
import MemoableMoments from "../components/Habits/MemoableMoments"
import HabitSettings from "../components/Habits/HabitSettings"
import { getHabits, getEntries, toggleHabit, saveMoment, saveWeight, saveSleep, getConfig } from "../lib/firestore"
import styles from "../styles/Habits.module.css"

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
    return `${sMonth} ${weekStart.getDate()}–${end.getDate()}, ${end.getFullYear()}`
  }
  return `${sMonth.slice(0, 3)} ${weekStart.getDate()} – ${eMonth.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
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

export default function Habits() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [habits, setHabits] = useState([])
  const [entries, setEntries] = useState({})
  const [config, setConfig] = useState(null)
  const [viewMode, setViewMode] = useState("today")
  const [weekStart, setWeekStart] = useState(() => getMonday(now))
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthViewStyle, setMonthViewStyle] = useState("grid")

  const loadData = useCallback(async () => {
    if (viewMode === "week") {
      const months = getMonthsForWeek(weekStart)
      const [h, c, ...entryResults] = await Promise.all([
        getHabits(),
        getConfig(),
        ...months.map((m) => getEntries(m.year, m.month)),
      ])
      const merged = Object.assign({}, ...entryResults)
      setHabits(h)
      setEntries(merged)
      setConfig(c)
    } else {
      const [h, e, c] = await Promise.all([
        getHabits(),
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
        [date]: {
          ...entry,
          habits: { ...entry.habits, [habitId]: value },
        },
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
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
    setLoading(true)
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
    setLoading(true)
  }

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
    setLoading(true)
  }

  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
    setLoading(true)
  }

  // Countdown calculation
  let daysToGo = null
  if (config && config.targetDate) {
    const target = new Date(config.targetDate + "T00:00:00")
    const diff = target - now
    daysToGo = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const viewToggle = (
    <div className={styles.viewToggle}>
      {["today", "week", "month"].map((mode) => (
        <button
          key={mode}
          className={`${styles.viewToggleBtn} ${viewMode === mode ? styles.viewToggleActive : ""}`}
          onClick={() => setViewMode(mode)}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <Head>
        <title>Habits — Daniel Raad</title>
        <meta name="description" content="Ironman 70.3 Habit Tracker" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      {/* Hide the global footer on this page */}
      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <div className={styles.page}>
        {/* Header with countdown and settings */}
        <div className={styles.header}>
          <div className={styles.countdown}>
            Ironman 70.3
            {daysToGo !== null && (
              <> — <span className={styles.countdownDays}>{daysToGo}</span> days to go</>
            )}
          </div>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
            ⚙ Settings
          </button>
        </div>

        {/* Nav bar — adapts per view */}
        <div className={styles.monthSelector}>
          {viewMode === "today" && (
            <>
              {viewToggle}
            </>
          )}
          {viewMode === "week" && (
            <>
              <button onClick={prevWeek}>◀</button>
              <div className={styles.monthLabel}>{formatWeekRange(weekStart)}</div>
              <button onClick={nextWeek}>▶</button>
              {viewToggle}
            </>
          )}
          {viewMode === "month" && (
            <>
              <button onClick={prevMonth}>◀</button>
              <div className={styles.monthLabel}>
                {MONTH_NAMES[month - 1]} {year}
              </div>
              <button onClick={nextMonth}>▶</button>
              <div className={styles.viewToggle}>
                {["grid", "calendar"].map((s) => (
                  <button
                    key={s}
                    className={`${styles.viewToggleBtn} ${monthViewStyle === s ? styles.viewToggleActive : ""}`}
                    onClick={() => setMonthViewStyle(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              {viewToggle}
            </>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <>
            {/* Main layout */}
            <div className={styles.mainLayout}>
              {viewMode === "today" && (
                <TodayView
                  habits={habits}
                  entries={entries}
                  onToggle={handleToggle}
                  onSaveWeight={handleSaveWeight}
                  onSaveSleep={handleSaveSleep}
                />
              )}
              {viewMode === "week" && (
                <WeekView
                  weekStart={weekStart}
                  habits={habits}
                  entries={entries}
                  onToggle={handleToggle}
                  onSaveWeight={handleSaveWeight}
                  onSaveSleep={handleSaveSleep}
                />
              )}
              {viewMode === "month" && monthViewStyle === "grid" && (
                <HabitGrid
                  year={year}
                  month={month}
                  habits={habits}
                  entries={entries}
                  onToggle={handleToggle}
                />
              )}
              {viewMode === "month" && monthViewStyle === "calendar" && (
                <CalendarView
                  year={year}
                  month={month}
                  habits={habits}
                  entries={entries}
                />
              )}
              <ProgressChart
                year={year}
                month={month}
                habits={habits}
                entries={entries}
              />
            </div>

            {/* Memorable Moments */}
            <MemoableMoments
              year={year}
              month={month}
              entries={entries}
              onSaveMoment={handleSaveMoment}
            />
          </>
        )}

        {/* Settings modal */}
        {showSettings && (
          <HabitSettings
            habits={habits}
            onClose={() => setShowSettings(false)}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  )
}
