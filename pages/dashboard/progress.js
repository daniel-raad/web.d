import Head from "next/head"
import Link from "next/link"
import { useEffect, useState } from "react"
import Header from "../../components/Header"
import { getProgress } from "../../lib/firestore"
import { colorForGoal, colorForTemplate } from "../../lib/goalColors"
import { getDateKey, getDayOfWeekForDateKey } from "../../lib/dates.js"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] // GitHub shows Mon/Wed/Fri
import styles from "../../styles/Dashboard.module.css"

const HEATMAP_DAYS = 60
const STRIP_DAYS = 30

function GithubHeatmap({ data, today }) {
  if (!data || !data.dates?.length) return null

  // First date's day-of-week determines how many padding cells go at the top
  // of the leftmost column. With grid-auto-flow: column + 7 rows, padding
  // cells naturally push the first real date down to its correct row.
  const firstDate = data.dates[0]
  const firstDow = getDayOfWeekForDateKey(firstDate)
  const totalCells = firstDow + data.dates.length
  const numColumns = Math.ceil(totalCells / 7)

  // Month labels: for each column, the month of its first date. Show the
  // label when month changes vs the previous column.
  const monthLabels = []
  let lastMonth = -1
  for (let col = 0; col < numColumns; col++) {
    const cellIdxInGrid = col * 7
    const dateIdx = cellIdxInGrid - firstDow
    let label = ""
    if (dateIdx >= 0 && dateIdx < data.dates.length) {
      const month = Number(data.dates[dateIdx].slice(5, 7)) - 1
      if (month !== lastMonth) {
        label = MONTH_LABELS[month]
        lastMonth = month
      }
    }
    monthLabels.push(label)
  }

  return (
    <div className={styles.githubHeatmap}>
      <div className={styles.githubHeatmapMain}>
        <div className={styles.githubMonthRow}>
          {monthLabels.map((label, i) => (
            <div key={i} className={styles.githubMonthLabel}>
              {label}
            </div>
          ))}
        </div>
        <div className={styles.githubHeatmapGridWrap}>
          <div className={styles.githubDayLabels}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className={styles.githubDayLabel}>
                {label}
              </div>
            ))}
          </div>
          <div
            className={styles.githubHeatmapGrid}
            style={{ gridTemplateColumns: `repeat(${numColumns}, 12px)` }}
          >
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`pad-${i}`} className={styles.githubHeatmapPad} />
            ))}
            {data.dates.map((date, dateIdx) => {
              const isToday = date === today
              const goalsHitToday = data.goals
                .filter((g) => g.hits[dateIdx]?.hit)
                .map((g) => g.title)
              const title = `${date} — ${goalsHitToday.length}/${data.goals.length}${goalsHitToday.length ? ": " + goalsHitToday.join(", ") : ""}`
              return (
                <div
                  key={date}
                  className={`${styles.heatmapStacked} ${styles.githubHeatmapCell} ${isToday ? styles.heatmapToday : ""}`}
                  title={title}
                >
                  {data.goals.map((goal) => {
                    const h = goal.hits[dateIdx]
                    const color = colorForGoal(goal.id)
                    let opacity = 0
                    if (h?.hit) {
                      opacity = h.templatesTotal && h.templatesTotal > 1
                        ? 0.3 + ((h.templatesHit || 0) / h.templatesTotal) * 0.7
                        : 1
                    }
                    return (
                      <div
                        key={goal.id}
                        style={{
                          backgroundColor: opacity > 0 ? color : "transparent",
                          opacity: opacity > 0 ? opacity : 1,
                          flex: 1,
                        }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function streakEmoji(current) {
  if (current >= 14) return "🚀"
  if (current >= 7) return "🔥"
  if (current >= 3) return "✨"
  return ""
}

function pct(n) {
  return `${Math.round(n * 100)}%`
}

export default function ProgressPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = getDateKey()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getProgress(HEATMAP_DAYS)
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

  return (
    <div>
      <Head>
        <title>Progress - Daniel Raad</title>
        <meta name="description" content="Goal progress over time" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <div className={`${styles.dashboard} terminal`}>
        <div className={styles.hubHeader}>
          <div className={styles.hubDate}>Progress</div>
          <div className={styles.hubSummary}>
            <Link href="/dashboard">
              <a className={styles.hubViewAll}>&larr; Today</a>
            </Link>
          </div>
        </div>

        {loading && (
          <section className={styles.hubSection}>
            <div className={styles.hubEmpty}>Loading…</div>
          </section>
        )}

        {!loading && data && (
          <>
            {/* Heatmap — last 60 days, goal-aware stacked bands */}
            <section className={styles.hubSection}>
              <div className={styles.hubSectionHeader}>
                <span className={styles.hubSectionTitle}>
                  Daily completion · last {HEATMAP_DAYS} days
                </span>
                <span className={styles.planEnergyBasis}>
                  {data.goals.length} active goal{data.goals.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* GitHub-style 7-row grid: weeks flow left → right, days flow
                  top → bottom within each column. Today sits in the rightmost
                  column at its actual day-of-week. */}
              <GithubHeatmap data={data} today={today} />


              {/* Per-goal legend — one swatch per active goal so it's obvious
                  which colour means what. */}
              <div className={styles.heatmapLegendGoals}>
                {data.goals.map((goal) => (
                  <span key={goal.id} className={styles.heatmapLegendGoalItem}>
                    <span
                      className={styles.goalDot}
                      style={{ backgroundColor: colorForGoal(goal.id) }}
                      aria-hidden
                    />
                    <span className={styles.heatmapLegendGoalLabel}>{goal.title}</span>
                  </span>
                ))}
              </div>
            </section>

            {/* Per-goal section */}
            {data.goals.map((goal) => {
              const color = colorForGoal(goal.id)
              const { current, best } = goal.streak || { current: 0, best: 0 }
              const hits30 = goal.hits.slice(-STRIP_DAYS)
              return (
                <section key={goal.id} className={styles.hubSection}>
                  <div className={styles.hubSectionHeader}>
                    <span className={styles.hubSectionTitle}>
                      <span
                        className={styles.goalDot}
                        style={{ backgroundColor: color, marginRight: "0.5rem", display: "inline-block" }}
                        aria-hidden
                      />
                      {goal.title}
                    </span>
                    <span className={styles.planEnergyBasis}>{goal.type}</span>
                  </div>

                  <div className={styles.progressStatsRow}>
                    <div className={styles.progressStat}>
                      <div className={styles.progressStatValue}>
                        {streakEmoji(current)} {current}d
                      </div>
                      <div className={styles.progressStatLabel}>current streak</div>
                    </div>
                    <div className={styles.progressStat}>
                      <div className={styles.progressStatValue}>{best}d</div>
                      <div className={styles.progressStatLabel}>best streak</div>
                    </div>
                    <div className={styles.progressStat}>
                      <div className={styles.progressStatValue}>{pct(goal.hitRate7d)}</div>
                      <div className={styles.progressStatLabel}>last 7d</div>
                    </div>
                    <div className={styles.progressStat}>
                      <div className={styles.progressStatValue}>{pct(goal.hitRate14d)}</div>
                      <div className={styles.progressStatLabel}>last 14d</div>
                    </div>
                    <div className={styles.progressStat}>
                      <div className={styles.progressStatValue}>{pct(goal.hitRateAll)}</div>
                      <div className={styles.progressStatLabel}>last {goal.hits.length}d</div>
                    </div>
                  </div>

                  <div className={styles.goalStrip} style={{ marginTop: "0.5rem" }}>
                    {hits30.map((h) => {
                      const isToday = h.date === today
                      // For multi-template goals, grade by # disciplines hit.
                      let cellInline
                      if (h.hit) {
                        if (h.templatesTotal && h.templatesTotal > 1) {
                          const f = (h.templatesHit || 0) / h.templatesTotal
                          cellInline = {
                            backgroundColor: color,
                            opacity: 0.3 + f * 0.7,
                            borderColor: "transparent",
                          }
                        } else {
                          cellInline = { backgroundColor: color, borderColor: color }
                        }
                      }
                      return (
                        <div
                          key={h.date}
                          className={`${styles.goalCell} ${h.hit ? styles.goalCellHit : ""} ${isToday ? styles.goalCellToday : ""}`}
                          style={cellInline}
                          title={
                            h.hit
                              ? `${h.date} — ${
                                  h.templatesTotal && h.templatesTotal > 1
                                    ? `${h.templatesHit}/${h.templatesTotal} disciplines`
                                    : h.value != null
                                    ? `${h.value}${goal.primaryPrimitive === "duration" ? " min" : ""}`
                                    : `${h.count} session${h.count > 1 ? "s" : ""}`
                                }`
                              : `${h.date} — missed`
                          }
                        />
                      )
                    })}
                  </div>

                  {goal.perTemplate && (
                    <div className={styles.goalSubStrips} style={{ marginTop: "0.5rem" }}>
                      {goal.leadMeasureTemplates.map((tplId) => {
                        const tplColor = colorForTemplate(tplId)
                        const tplHits = (goal.perTemplate[tplId] || []).slice(-STRIP_DAYS)
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
                                    style={
                                      h.hit
                                        ? { backgroundColor: tplColor, borderColor: tplColor }
                                        : undefined
                                    }
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

                  {goal.type === "process-cadence" && goal.floor != null && (
                    <div className={styles.planItemRationale}>
                      Floor: {goal.floor}
                      {goal.primaryPrimitive === "duration" ? " min" : ""} · Target:{" "}
                      {goal.target}
                      {goal.primaryPrimitive === "duration" ? " min" : ""}
                    </div>
                  )}
                  {goal.type === "deadline-plan" && goal.deadline && (
                    <div className={styles.planItemRationale}>
                      Deadline: {goal.deadline}
                    </div>
                  )}
                </section>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
