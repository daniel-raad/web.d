import React, { useState, useRef, useCallback } from "react"
import styles from "../../styles/Habits.module.css"

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function MemoableMoments({ year, month, entries, onSaveMoment }) {
  const [expanded, setExpanded] = useState(false)
  const totalDays = daysInMonth(year, month)
  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const timers = useRef({})

  const handleChange = useCallback(
    (dateStr, value) => {
      if (timers.current[dateStr]) clearTimeout(timers.current[dateStr])
      timers.current[dateStr] = setTimeout(() => {
        onSaveMoment(dateStr, value)
      }, 800)
    },
    [onSaveMoment]
  )

  // Show today + days with entries, or all days when expanded
  const days = []
  for (let d = totalDays; d >= 1; d--) {
    const dateStr = formatDate(year, month, d)
    const entry = entries[dateStr]
    const hasMoment = entry && entry.moment && entry.moment.trim()
    if (expanded || dateStr === todayStr || hasMoment) {
      days.push({ day: d, dateStr })
    }
  }

  return (
    <div className={styles.moments}>
      <div className={styles.momentsTitle}>Memorable Moments</div>
      {days.map(({ day, dateStr }) => {
        const dayOfWeek = DAYS[new Date(year, month - 1, day).getDay()]
        const entry = entries[dateStr] || {}
        return (
          <div key={dateStr} className={styles.momentEntry}>
            <div className={styles.momentDate}>
              {day} {dayOfWeek} — {dateStr}
            </div>
            <textarea
              className={styles.momentInput}
              defaultValue={entry.moment || ""}
              placeholder="What made today memorable?"
              rows={1}
              onChange={(e) => handleChange(dateStr, e.target.value)}
            />
          </div>
        )
      })}
      {!expanded ? (
        <button className={styles.momentToggle} onClick={() => setExpanded(true)}>
          Show all days...
        </button>
      ) : (
        <button className={styles.momentToggle} onClick={() => setExpanded(false)}>
          Show less
        </button>
      )}
      {days.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No entries yet this month.</p>}
    </div>
  )
}
