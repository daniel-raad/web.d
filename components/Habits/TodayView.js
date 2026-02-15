import React from "react"
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

export default function TodayView({ habits, entries, onToggle }) {
  const today = new Date()
  const dateStr = formatDate(today)
  const entry = entries[dateStr] || { habits: {} }
  const done = habits.filter((h) => entry.habits[h.id]).length

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
    </div>
  )
}
