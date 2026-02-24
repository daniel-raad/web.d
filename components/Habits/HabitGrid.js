import React, { useRef, useCallback } from "react"
import styles from "../../styles/Habits.module.css"

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function MonthInput({ dateStr, value, placeholder, step, min, max, onSave }) {
  const timerRef = useRef(null)

  const handleChange = useCallback((e) => {
    const val = e.target.value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const num = parseFloat(val)
      if (!isNaN(num) && num >= (min || 0)) {
        onSave(dateStr, num)
      }
    }, 800)
  }, [dateStr, onSave, min])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={styles.monthNumInput}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onChange={handleChange}
    />
  )
}

export default function HabitGrid({ year, month, habits, entries, onToggle, onSaveWeight, onSaveSleep }) {
  const totalDays = daysInMonth(year, month)
  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())

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
        style={{ gridTemplateColumns: `120px repeat(${totalDays}, minmax(48px, 1fr)) 45px` }}
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
                <MonthInput
                  dateStr={dateStr}
                  value={entry.weight}
                  placeholder="–"
                  step="0.1"
                  min={0}
                  onSave={onSaveWeight}
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
                <MonthInput
                  dateStr={dateStr}
                  value={entry.sleep}
                  placeholder="–"
                  step="0.5"
                  min={0}
                  max={24}
                  onSave={onSaveSleep}
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
