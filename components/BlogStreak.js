import styles from '../styles/BlogStreak.module.css'

const WEEKS = 26

function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function buildWeeks(posts) {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)

  const postDates = posts.map((p) => getWeekStart(p.date).getTime())
  const postWeeks = new Set(postDates)

  const weeks = []
  for (let i = WEEKS - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - i * 7)
    const active = postWeeks.has(weekStart.getTime())
    weeks.push({ date: weekStart, active })
  }

  let streak = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].active) streak++
    else break
  }

  return { weeks, streak }
}

function getMonthLabels(weeks) {
  const labels = []
  let lastMonth = null
  weeks.forEach((w, i) => {
    const month = w.date.toLocaleString('default', { month: 'short' })
    if (month !== lastMonth) {
      labels.push({ index: i, label: month })
      lastMonth = month
    }
  })
  return labels
}

export default function BlogStreak({ posts = [] }) {
  const { weeks, streak } = buildWeeks(posts)
  const monthLabels = getMonthLabels(weeks)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.streak}>
          {streak} week{streak !== 1 ? 's' : ''} streak
        </span>
      </div>
      <div className={styles.scrollWrapper}>
        <div className={styles.months}>
          {monthLabels.map((m) => (
            <span
              key={m.index}
              className={styles.monthLabel}
              style={{ gridColumnStart: m.index + 1 }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className={styles.grid}>
          {weeks.map((w, i) => (
            <div
              key={i}
              className={`${styles.cell} ${w.active ? styles.active : ''}`}
              title={`Week of ${w.date.toLocaleDateString()}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
