import React, { useState, useEffect, useCallback } from "react"
import Head from "next/head"
import Header from "../components/Header"
import HabitGrid from "../components/Habits/HabitGrid"
import ProgressChart from "../components/Habits/ProgressChart"
import MemoableMoments from "../components/Habits/MemoableMoments"
import HabitSettings from "../components/Habits/HabitSettings"
import { getHabits, getEntries, toggleHabit, saveMoment, getConfig } from "../lib/firestore"
import styles from "../styles/Habits.module.css"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function Habits() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [habits, setHabits] = useState([])
  const [entries, setEntries] = useState({})
  const [config, setConfig] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [h, e, c] = await Promise.all([
      getHabits(),
      getEntries(year, month),
      getConfig(),
    ])
    setHabits(h)
    setEntries(e)
    setConfig(c)
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async (date, habitId, value) => {
    // Optimistic update
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

  // Countdown calculation
  let daysToGo = null
  if (config && config.targetDate) {
    const target = new Date(config.targetDate + "T00:00:00")
    const diff = target - now
    daysToGo = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div>
      <Head>
        <title>Habits — Daniel Raad</title>
        <meta name="description" content="Ironman 70.3 Habit Tracker" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header />

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

        {/* Month navigator */}
        <div className={styles.monthSelector}>
          <button onClick={prevMonth}>◀</button>
          <div className={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button onClick={nextMonth}>▶</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <>
            {/* Main layout: Grid + Chart */}
            <div className={styles.mainLayout}>
              <HabitGrid
                year={year}
                month={month}
                habits={habits}
                entries={entries}
                onToggle={handleToggle}
              />
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
