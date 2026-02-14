import React from "react"
import styles from "../../styles/Habits.module.css"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getIntensityClass(done, total) {
  if (total === 0 || done === 0) return ""
  const ratio = done / total
  if (ratio >= 1) return styles.calIntensityFull
  if (ratio >= 0.6) return styles.calIntensityMed
  return styles.calIntensityLow
}

export default function CalendarView({ year, month, habits, entries }) {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDate = today.getDate()

  const totalHabits = habits.length
  const cells = []

  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} className={styles.calCell} />)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const entry = entries[dateKey]
    const doneCount = entry
      ? Object.values(entry.habits || {}).filter(Boolean).length
      : 0

    const isToday = isCurrentMonth && d === todayDate
    const intensityClass = getIntensityClass(doneCount, totalHabits)

    cells.push(
      <div
        key={d}
        className={`${styles.calCell} ${intensityClass} ${isToday ? styles.calToday : ""}`}
        title={`${dateKey}: ${doneCount}/${totalHabits}`}
      >
        <span className={styles.calDayNum}>{d}</span>
      </div>
    )
  }

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.calGrid}>
        {DAY_LABELS.map((label) => (
          <div key={label} className={styles.calDayLabel}>
            {label}
          </div>
        ))}
        {cells}
      </div>
      <div className={styles.calLegend}>
        <span className={styles.calLegendLabel}>Less</span>
        <span className={`${styles.calLegendSwatch}`} />
        <span className={`${styles.calLegendSwatch} ${styles.calIntensityLow}`} />
        <span className={`${styles.calLegendSwatch} ${styles.calIntensityMed}`} />
        <span className={`${styles.calLegendSwatch} ${styles.calIntensityFull}`} />
        <span className={styles.calLegendLabel}>More</span>
      </div>
    </div>
  )
}
