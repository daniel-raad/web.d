import React, { useRef, useCallback } from "react"
import styles from "../../styles/Habits.module.css"

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function HabitGrid({ year, month, habits, entries, onToggle, onSaveWeight, onSaveSleep }) {
  const totalDays = daysInMonth(year, month)
  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const weightTimers = useRef({})
  const sleepTimers = useRef({})

  const handleWeightChange = useCallback((dateStr, value) => {
    if (weightTimers.current[dateStr]) clearTimeout(weightTimers.current[dateStr])
    weightTimers.current[dateStr] = setTimeout(() => {
      const num = parseFloat(value)
      if (!isNaN(num) && num > 0) onSaveWeight(dateStr, num)
    }, 800)
  }, [onSaveWeight])

  const handleSleepChange = useCallback((dateStr, value) => {
    if (sleepTimers.current[dateStr]) clearTimeout(sleepTimers.current[dateStr])
    sleepTimers.current[dateStr] = setTimeout(() => {
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) onSaveSleep(dateStr, num)
    }, 800)
  }, [onSaveSleep])

  const dayDates = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1
    const dateStr = formatDate(year, month, day)
    const isToday = dateStr === todayStr
    return { day, dateStr, isToday }
  })

  return (
    <div className={styles.weekWrapper}>
      <div
        className={styles.weekGrid}
        style={{ gridTemplateColumns: `120px repeat(${totalDays}, 1fr) 45px` }}
      >
        {/* Header row: day numbers */}
        <div className={styles.weekDayHeader} style={{ position: "sticky", left: 0, background: "#0d0f1a", zIndex: 2 }} />
        {dayDates.map(({ day, isToday }) => (
          <div
            key={day}
            className={`${styles.weekDayHeader} ${isToday ? styles.weekDayHeaderToday : ""}`}
          >
            {day}
          </div>
        ))}
        <div className={styles.weekDayHeader} />

        {/* Habit rows */}
        {habits.map((h) => {
          let doneCount = 0
          return (
            <div key={h.id} className={styles.weekHabitRow} style={{ display: "contents" }}>
              <div className={styles.weekHabitLabel}>
                <span>{h.emoji}</span> {h.name}
              </div>
              {dayDates.map(({ day, dateStr, isToday }) => {
                const entry = entries[dateStr] || { habits: {} }
                const isDone = !!entry.habits[h.id]
                if (isDone) doneCount++
                return (
                  <div
                    key={day}
                    className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ""}`}
                    onClick={() => onToggle(dateStr, h.id, !isDone)}
                  >
                    <span className={`${styles.habitDot} ${isDone ? styles.habitDotDone : ""}`} />
                  </div>
                )
              })}
              <div className={styles.weekCompletion}>{doneCount}/{totalDays}</div>
            </div>
          )
        })}

        {/* Weight row */}
        <div style={{ display: "contents" }} className={styles.weekHabitRow}>
          <div className={styles.weekHabitLabel}>
            <span>⚖️</span> Weight
          </div>
          {dayDates.map(({ day, dateStr, isToday }) => {
            const entry = entries[dateStr] || {}
            return (
              <div
                key={day}
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
          {dayDates.map(({ day, dateStr, isToday }) => {
            const entry = entries[dateStr] || {}
            return (
              <div
                key={day}
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
