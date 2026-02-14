import React from "react"
import styles from "../../styles/Habits.module.css"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function HabitGrid({ year, month, habits, entries, onToggle }) {
  const totalDays = daysInMonth(year, month)
  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const cols = habits.length + 2 // day label + habits + pct

  return (
    <div className={styles.gridWrapper}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `60px repeat(${habits.length}, 1fr) 50px` }}
      >
        {/* Header row */}
        <div className={styles.gridHeaderCell}>Day</div>
        {habits.map((h) => (
          <div key={h.id} className={styles.gridHeaderCell}>
            <span className={styles.gridHeaderEmoji}>{h.emoji}</span>
            {h.name}
          </div>
        ))}
        <div className={styles.gridHeaderCell}>%</div>

        {/* Day rows */}
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1
          const dateStr = formatDate(year, month, day)
          const dayOfWeek = DAYS[new Date(year, month - 1, day).getDay()]
          const isToday = dateStr === todayStr
          const entry = entries[dateStr] || { habits: {} }
          const done = habits.filter((h) => entry.habits[h.id]).length
          const pct = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0

          return (
            <div key={day} className={`${styles.gridRow} ${isToday ? styles.todayRow : ""}`} style={{ display: "contents" }}>
              <div className={styles.dayCell}>
                {day} {dayOfWeek}
              </div>
              {habits.map((h) => {
                const isDone = !!entry.habits[h.id]
                return (
                  <div
                    key={h.id}
                    className={styles.habitCell}
                    onClick={() => onToggle(dateStr, h.id, !isDone)}
                  >
                    <span
                      className={`${styles.habitDot} ${isDone ? styles.habitDotDone : ""}`}
                    />
                  </div>
                )
              })}
              <div className={styles.pctCell}>{pct}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
