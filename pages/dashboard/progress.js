import Head from "next/head"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import Header from "../../components/Header"
import { getStintProgress, getStintTrend } from "../../lib/firestore"
import { getDateKey, getDayOfWeekForDateKey } from "../../lib/dates.js"
import s from "../../styles/Stint.module.css"

const STORE_KEY = "progress.view"

function pct(n) { return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—" }

// --- GitHub-style heatmap (one row per goal, columns of weeks) ---

function GithubGoals({ goals, today }) {
  if (!goals.length) return null
  const first = goals.find((g) => g.hits?.length)
  if (!first) return null
  const dates = first.hits.map((d) => d.date)
  const firstDow = getDayOfWeekForDateKey(dates[0])
  const numColumns = Math.ceil((firstDow + dates.length) / 7)
  return (
    <div className={s.ghWrap}>
      {goals.map((g) => {
        const color = g.color || "#6366f1"
        return (
          <div key={g.id} className={s.ghRow}>
            <div className={s.ghLabel}>
              <span style={{ fontSize: "1rem" }}>{g.icon || "🎯"}</span>
              <span>{g.title}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-faint)" }}>{pct(g.hitRate)}</span>
            </div>
            <div className={s.ghGrid} style={{ gridTemplateColumns: `repeat(${numColumns}, 11px)` }}>
              {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} style={{ width: 11, height: 11 }} />)}
              {g.hits.map((h) => (
                <div
                  key={h.date}
                  className={`${s.ghCell} ${h.date === today ? s.ghCellToday : ""}`}
                  style={h.hit ? { background: color } : undefined}
                  title={`${h.date} — ${h.hit ? "hit" : "miss"}`}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Line chart (small SVG) -----------------------------------------------

function LineChart({ days, valueOf, color = "#6366f1", height = 110, label, unit = "", stints = [], minOverride, maxOverride, today }) {
  const width = 800
  const padL = 32, padR = 8, padT = 8, padB = 18
  const w = width - padL - padR
  const h = height - padT - padB

  const filled = days.map((d) => valueOf(d)).filter((v) => v != null && Number.isFinite(v))
  if (filled.length === 0) {
    return (
      <div className={s.chartBlock}>
        <div className={s.chartTitle}>{label}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-faint)", padding: "0.85rem 0" }}>No data yet.</div>
      </div>
    )
  }
  const yMin = minOverride != null ? minOverride : Math.min(...filled)
  const yMaxRaw = maxOverride != null ? maxOverride : Math.max(...filled)
  const yMax = yMaxRaw === yMin ? yMin + 1 : yMaxRaw
  const xFor = (i) => padL + (i / Math.max(1, days.length - 1)) * w
  const yFor = (v) => padT + h - ((v - yMin) / (yMax - yMin)) * h

  // Path: skip nulls but keep continuity (split into segments).
  const segments = []
  let cur = []
  days.forEach((d, i) => {
    const v = valueOf(d)
    if (v != null && Number.isFinite(v)) cur.push([i, v])
    else if (cur.length > 0) { segments.push(cur); cur = [] }
  })
  if (cur.length > 0) segments.push(cur)

  // Stint boundaries
  const stintBoundaries = stints
    .map((st) => days.findIndex((d) => d.date === st.startDate))
    .filter((i) => i > 0)
  const todayIdx = days.findIndex((d) => d.date === today)

  const tickVals = [yMin, (yMin + yMax) / 2, yMax]
  const fmtTick = (v) => {
    if (Math.abs(v) >= 100) return Math.round(v).toString()
    if (Math.abs(v) >= 10) return v.toFixed(1)
    return v.toFixed(2)
  }

  return (
    <div className={s.chartBlock}>
      <div className={s.chartHead}>
        <div className={s.chartTitle}>{label}</div>
        <div className={s.chartMeta}>
          {filled.length} day{filled.length === 1 ? "" : "s"} logged
          {filled.length > 0 && ` · latest ${fmtTick(filled[filled.length - 1])}${unit}`}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={yFor(v)} y2={yFor(v)} stroke="currentColor" strokeOpacity="0.08" />
            <text x={padL - 4} y={yFor(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.45">{fmtTick(v)}</text>
          </g>
        ))}
        {stintBoundaries.map((i, k) => (
          <line key={k} x1={xFor(i)} x2={xFor(i)} y1={padT} y2={padT + h} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="2 4" />
        ))}
        {todayIdx >= 0 && (
          <line x1={xFor(todayIdx)} x2={xFor(todayIdx)} y1={padT} y2={padT + h} stroke={color} strokeOpacity="0.5" />
        )}
        {segments.map((seg, k) => {
          const d = seg.map(([i, v], j) => `${j === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ")
          return <path key={k} d={d} fill="none" stroke={color} strokeWidth="2" />
        })}
        {segments.flatMap((seg, k) => seg.map(([i, v], j) => (
          <circle key={`${k}-${j}`} cx={xFor(i)} cy={yFor(v)} r="2" fill={color} />
        )))}
      </svg>
    </div>
  )
}

// --- Page -----------------------------------------------------------------

export default function ProgressPage() {
  const [stintProg, setStintProg] = useState(null)
  const [trend, setTrend] = useState(null)
  const [view, setView] = useState("github")
  const [loading, setLoading] = useState(true)
  const today = getDateKey()

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY)
      if (stored === "github" || stored === "graph") setView(stored)
    } catch {}
  }, [])
  useEffect(() => { try { window.localStorage.setItem(STORE_KEY, view) } catch {} }, [view])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [sp, t] = await Promise.all([getStintProgress(), getStintTrend()])
        if (!cancelled) {
          setStintProg(sp)
          setTrend(t)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const goals = stintProg?.goals?.filter((g) => g.state !== "archived") || []
  const days = trend?.days || []
  const stints = trend?.stints || []

  // Compute composite score series (% 0-100) for header summary.
  const recentScore = useMemo(() => {
    if (days.length === 0) return null
    const recent = days.slice(-7).filter((d) => d.score != null)
    if (recent.length === 0) return null
    return recent.reduce((a, b) => a + b.score, 0) / recent.length
  }, [days])

  return (
    <div>
      <Head><title>Trend - Daniel Raad</title></Head>
      <Header compact />
      <style jsx global>{`.fixed.bottom-0 { display: none; }`}</style>
      <div className={s.page}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.85rem" }}>
          <div className={s.heroDate}>Trend</div>
          <Link href="/dashboard"><a className={s.linkSubtle}>&larr; Dashboard</a></Link>
        </div>

        <nav className={s.topNav}>
          <Link href="/dashboard"><a className={s.topNavLink}>Today</a></Link>
          <Link href="/dashboard/stints"><a className={s.topNavLink}>Stints</a></Link>
          <Link href="/dashboard/progress"><a className={s.topNavLinkActive}>Trend</a></Link>
        </nav>

        <div style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.3rem" }}>
          {recentScore != null ? `${Math.round(recentScore * 100)}%` : "—"}
        </div>
        <div style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          7-day rolling daily-progress (plan completion × energy)
        </div>

        <div className={s.viewToggleBar}>
          <button type="button" className={`${s.viewToggleBtn} ${view === "github" ? s.viewToggleBtnActive : ""}`} onClick={() => setView("github")}>Heatmap</button>
          <button type="button" className={`${s.viewToggleBtn} ${view === "graph" ? s.viewToggleBtnActive : ""}`} onClick={() => setView("graph")}>Graph</button>
        </div>

        {loading && <div className={s.bootstrap}>Loading…</div>}

        {!loading && view === "github" && (
          <section className={s.section}>
            <div className={s.sectionTitle}>Per-goal cadence · current stint window</div>
            {goals.length === 0 ? (
              <div className={s.bootstrap}>No active stint or no goals tracked yet.</div>
            ) : (
              <GithubGoals goals={goals} today={today} />
            )}
          </section>
        )}

        {!loading && view === "graph" && (
          <section className={s.section}>
            <LineChart
              days={days}
              valueOf={(d) => d.score == null ? null : d.score * 100}
              color="#6366f1"
              label="Daily progress (plan × energy)"
              unit="%"
              stints={stints}
              today={today}
              minOverride={0}
              maxOverride={100}
            />
            <LineChart
              days={days}
              valueOf={(d) => d.weight}
              color="#10b981"
              label="Weight"
              unit=" kg"
              stints={stints}
              today={today}
            />
            <LineChart
              days={days}
              valueOf={(d) => d.sleep}
              color="#8b5cf6"
              label="Sleep"
              unit=" hrs"
              stints={stints}
              today={today}
              minOverride={0}
            />
            <LineChart
              days={days}
              valueOf={(d) => d.energy}
              color="#f59e0b"
              label="Energy"
              unit=""
              stints={stints}
              today={today}
              minOverride={1}
              maxOverride={5}
            />
          </section>
        )}
      </div>
    </div>
  )
}
