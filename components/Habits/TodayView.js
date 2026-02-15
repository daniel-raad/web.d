import React, { useState, useRef, useCallback } from "react"
import styles from "../../styles/Habits.module.css"

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function TodayView({ habits, entries, onToggle, onSaveWeight, onSaveSleep }) {
  const today = new Date()
  const dateStr = formatDate(today)
  const entry = entries[dateStr] || { habits: {} }
  const done = habits.filter((h) => entry.habits[h.id]).length
  const [weightValue, setWeightValue] = useState(entry.weight ?? "")
  const [sleepValue, setSleepValue] = useState(entry.sleep ?? "")
  const weightTimer = useRef(null)
  const sleepTimer = useRef(null)

  const handleWeightChange = useCallback((e) => {
    const val = e.target.value
    setWeightValue(val)
    if (weightTimer.current) clearTimeout(weightTimer.current)
    weightTimer.current = setTimeout(() => {
      const num = parseFloat(val)
      if (!isNaN(num) && num > 0) {
        onSaveWeight(dateStr, num)
      }
    }, 800)
  }, [onSaveWeight, dateStr])

  const handleSleepChange = useCallback((e) => {
    const val = e.target.value
    setSleepValue(val)
    if (sleepTimer.current) clearTimeout(sleepTimer.current)
    sleepTimer.current = setTimeout(() => {
      const num = parseFloat(val)
      if (!isNaN(num) && num >= 0) {
        onSaveSleep(dateStr, num)
      }
    }, 800)
  }, [onSaveSleep, dateStr])

  const dateLabel = `${DAY_NAMES[today.getDay()]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

  return (
    <div className={styles.todayView}>
      <div className={styles.todayDate}>{dateLabel}</div>
      <div className={styles.todayStats}>
        {done}/{habits.length} done
      </div>
      <div className={styles.todayList}>
        {habits.map((h) => {
          const isDone = !!entry.habits[h.id]
          return (
            <div
              key={h.id}
              className={`${styles.todayItem} ${isDone ? styles.todayItemDone : ""}`}
              onClick={() => onToggle(dateStr, h.id, !isDone)}
            >
              <span className={`${styles.todayCheckbox} ${isDone ? styles.todayCheckboxDone : ""}`}>
                {isDone ? "✓" : ""}
              </span>
              <span className={styles.todayEmoji}>{h.emoji}</span>
              <span className={styles.todayHabitName}>{h.name}</span>
            </div>
          )
        })}
      </div>
      <div className={styles.weightSection}>
        <label className={styles.weightLabel}>Weight (kg)</label>
        <input
          type="number"
          className={styles.weightInput}
          value={weightValue}
          onChange={handleWeightChange}
          placeholder="e.g. 75"
          step="0.1"
          min="0"
        />
      </div>
      <div className={styles.weightSection}>
        <label className={styles.weightLabel}>Sleep (hours)</label>
        <input
          type="number"
          className={styles.weightInput}
          value={sleepValue}
          onChange={handleSleepChange}
          placeholder="e.g. 8"
          step="0.5"
          min="0"
          max="24"
        />
      </div>
    </div>
  )
}
