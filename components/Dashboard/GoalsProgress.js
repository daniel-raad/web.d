import { useEffect, useState } from "react"
import Link from "next/link"
import { getProgress } from "../../lib/firestore"
import { colorForGoal, colorForTemplate } from "../../lib/goalColors"
import { getDateKey } from "../../lib/dates.js"
import styles from "../../styles/Dashboard.module.css"

const STRIP_DAYS = 14

function streakEmoji(current) {
  if (current >= 7) return "🔥"
  if (current >= 3) return "✨"
  return ""
}

function formatHitValue(goal, hit) {
  if (!hit.hit) return `${hit.date} — missed`
  if (hit.value != null && goal.primaryPrimitive === "duration") {
    return `${hit.date} — ${hit.value} min`
  }
  if (hit.templatesHit != null) {
    return `${hit.date} — ${hit.templatesHit}/${hit.templatesTotal} disciplines`
  }
  if (hit.value != null) return `${hit.date} — ${hit.value}`
  if (hit.count) return `${hit.date} — ${hit.count} session${hit.count > 1 ? "s" : ""}`
  return hit.date
}

// Build the cell's inline style. For multi-template goals (Ironman), opacity
// grades by how many lead measures hit. For everything else, hit = full color,
// miss = transparent (CSS handles the border).
function cellStyle(hit, color) {
  if (!hit.hit) return undefined
  if (hit.templatesTotal && hit.templatesTotal > 1) {
    const fraction = (hit.templatesHit || 0) / hit.templatesTotal
    return { backgroundColor: color, opacity: 0.3 + fraction * 0.7, borderColor: "transparent" }
  }
  return { backgroundColor: color, borderColor: color }
}

export default function GoalsProgress() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = getDateKey()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getProgress(STRIP_DAYS)
        if (!cancelled) setData(res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Goals · last {STRIP_DAYS} days</span>
        </div>
        <div className={styles.hubEmpty}>Loading…</div>
      </section>
    )
  }

  if (!data || !data.goals || data.goals.length === 0) {
    return null
  }

  return (
    <section className={styles.hubSection}>
      <div className={styles.hubSectionHeader}>
        <span className={styles.hubSectionTitle}>Goals · last {STRIP_DAYS} days</span>
        <Link href="/dashboard/progress">
          <a className={styles.hubViewAll}>Look back &rarr;</a>
        </Link>
      </div>
      <div className={styles.goalsProgressList}>
        {data.goals.map((goal) => {
          const color = colorForGoal(goal.id)
          const { current, best } = goal.streak || { current: 0, best: 0 }
          return (
            <div key={goal.id} className={styles.goalRow}>
              <div className={styles.goalRowHeader}>
                <span
                  className={styles.goalDot}
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className={styles.goalTitle}>{goal.title}</span>
                <span className={styles.goalStreak}>
                  {streakEmoji(current)} {current}d
                  {best > current && (
                    <span className={styles.goalStreakBest}> · best {best}</span>
                  )}
                </span>
              </div>
              <div className={styles.goalStrip}>
                {goal.hits.map((h) => {
                  const isToday = h.date === today
                  return (
                    <div
                      key={h.date}
                      className={`${styles.goalCell} ${h.hit ? styles.goalCellHit : ""} ${isToday ? styles.goalCellToday : ""}`}
                      style={cellStyle(h, color)}
                      title={formatHitValue(goal, h)}
                    />
                  )
                })}
              </div>
              {goal.perTemplate && (
                <div className={styles.goalSubStrips}>
                  {goal.leadMeasureTemplates.map((tplId) => {
                    const tplColor = colorForTemplate(tplId)
                    const tplHits = goal.perTemplate[tplId] || []
                    return (
                      <div key={tplId} className={styles.goalSubStripRow}>
                        <span className={styles.goalSubStripLabel}>{tplId}</span>
                        <div className={styles.goalSubStrip}>
                          {tplHits.map((h) => {
                            const isToday = h.date === today
                            return (
                              <div
                                key={h.date}
                                className={`${styles.goalSubCell} ${h.hit ? styles.goalCellHit : ""} ${isToday ? styles.goalCellToday : ""}`}
                                style={h.hit ? { backgroundColor: tplColor, borderColor: tplColor } : undefined}
                                title={`${h.date} — ${h.hit ? `${h.count} session${h.count > 1 ? "s" : ""}` : "missed"}`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
