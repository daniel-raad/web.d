import React, { useRef, useCallback } from "react"
import styles from "../../styles/Habits.module.css"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

export default function WeekView({ weekStart, habits, entries, onToggle, onSaveWeight, onSaveSleep }) {
  const weekDates = getWeekDates(weekStart)
  const today = new Date()
  const todayStr = formatDate(today)
  const weightTimers = useRef({})
  const sleepTimers = useRef({})

  const handleWeightChange = useCallback((dateStr, value) => {
    if (weightTimers.current[dateStr]) clearTimeout(weightTimers.current[dateStr])
    weightTimers.current[dateStr] = setTimeout(() => {
      const num = parseFloat(value)
      if (!isNaN(num) && num > 0) {
        onSaveWeight(dateStr, num)
      }
    }, 800)
  }, [onSaveWeight])

  const handleSleepChange = useCallback((dateStr, value) => {
    if (sleepTimers.current[dateStr]) clearTimeout(sleepTimers.current[dateStr])
    sleepTimers.current[dateStr] = setTimeout(() => {
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) {
        onSaveSleep(dateStr, num)
      }
    }, 800)
  }, [onSaveSleep])

  return (
    <div className={styles.weekWrapper}>
      <div
        className={styles.weekGrid}
        style={{ gridTemplateColumns: `120px repeat(7, 1fr) 45px` }}
      >
        {/* Header row */}
        <div className={styles.weekDayHeader} style={{ position: "sticky", left: 0, background: "#0d0f1a", zIndex: 2 }} />
        {weekDates.map((d, i) => {
          const dateStr = formatDate(d)
          const isToday = dateStr === todayStr
          return (
            <div
              key={i}
              className={`${styles.weekDayHeader} ${isToday ? styles.weekDayHeaderToday : ""}`}
            >
              <div>{DAY_LABELS[i]}</div>
              <div>{d.getDate()}</div>
            </div>
          )
        })}
        <div className={styles.weekDayHeader} />

        {/* Habit rows */}
        {habits.map((h) => {
          let doneCount = 0
          return (
            <div key={h.id} className={styles.weekHabitRow} style={{ display: "contents" }}>
              <div className={styles.weekHabitLabel}>
                <span>{h.emoji}</span> {h.name}
              </div>
              {weekDates.map((d, i) => {
                const dateStr = formatDate(d)
                const isToday = dateStr === todayStr
                const entry = entries[dateStr] || { habits: {} }
                const isDone = !!entry.habits[h.id]
                if (isDone) doneCount++
                return (
                  <div
                    key={i}
                    className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ""}`}
                    onClick={() => onToggle(dateStr, h.id, !isDone)}
                  >
                    <span
                      className={`${styles.habitDot} ${isDone ? styles.habitDotDone : ""}`}
                    />
                  </div>
                )
              })}
              <div className={styles.weekCompletion}>{doneCount}/7</div>
            </div>
          )
        })}

        {/* Weight row */}
        <div style={{ display: "contents" }} className={styles.weekHabitRow}>
          <div className={styles.weekHabitLabel}>
            <span>⚖️</span> Weight
          </div>
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d)
            const isToday = dateStr === todayStr
            const entry = entries[dateStr] || {}
            return (
              <div
                key={i}
                className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ""}`}
                style={{ cursor: "default" }}
              >
                <input
                  type="number"
                  className={styles.weekWeightInput}
                  defaultValue={entry.weight ?? ""}
                  placeholder="–"
                  step="0.1"
                  min="0"
                  onChange={(e) => handleWeightChange(dateStr, e.target.value)}
                />
              </div>
            )
          })}
          <div className={styles.weekCompletion} />
        </div>

        {/* Sleep row */}
        <div style={{ display: "contents" }} className={styles.weekHabitRow}>
          <div className={styles.weekHabitLabel}>
            <span>😴</span> Sleep
          </div>
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d)
            const isToday = dateStr === todayStr
            const entry = entries[dateStr] || {}
            return (
              <div
                key={i}
                className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ""}`}
                style={{ cursor: "default" }}
              >
                <input
                  type="number"
                  className={styles.weekWeightInput}
                  defaultValue={entry.sleep ?? ""}
                  placeholder="–"
                  step="0.5"
                  min="0"
                  max="24"
                  onChange={(e) => handleSleepChange(dateStr, e.target.value)}
                />
              </div>
            )
          })}
          <div className={styles.weekCompletion} />
        </div>
      </div>
    </div>
  )
}
