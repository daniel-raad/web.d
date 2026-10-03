import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  getEntries,
  saveWeight, saveSleep, saveEnergy, saveMoment,
  getPlan,
  getStintProgress,
} from "../../lib/firestore"
import { getIdToken } from "../../lib/AuthContext"
import { dateKeyToLocalDate, getDateKey } from "../../lib/dates.js"
import { DEFAULT_STINT_DAYS } from "../../lib/stintConfig.js"
import StintBoard from "./StintBoard"
import PlanSection from "./PlanSection"
import s from "../../styles/Stint.module.css"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function planCounts(plan) {
  const items = plan?.items || []
  return {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    partial: items.filter((i) => i.status === "partial").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    open: items.filter((i) => !["done", "skipped"].includes(i.status)).length,
  }
}

function currentPlanItem(plan) {
  const items = plan?.items || []
  return items.find((i) => !["done", "skipped"].includes(i.status)) || items[0] || null
}

function displayStintTitle(stint) {
  const fallback = `Block ${stint.index}`
  return (stint.title || fallback)
    .replace(/\bStint\b/g, "Block")
    .replace(/\b75\b/g, String(DEFAULT_STINT_DAYS))
}

export default function TodayHub() {
  const router = useRouter()
  const now = new Date()
  const dateStr = getDateKey(now)
  const [year, month] = dateStr.split("-").map(Number)

  const [entries, setEntries] = useState({})
  const [plan, setPlan] = useState(null)
  const [stintData, setStintData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weightVal, setWeightVal] = useState("")
  const [sleepVal, setSleepVal] = useState("")
  const [energyVal, setEnergyVal] = useState(null)
  const [momentVal, setMomentVal] = useState("")
  const [stravaStatus, setStravaStatus] = useState(null)
  const [stravaBusy, setStravaBusy] = useState(false)
  const [bodyOpen, setBodyOpen] = useState(false)
  const weightTimer = useRef(null)
  const sleepTimer = useRef(null)
  const momentTimer = useRef(null)

  const loadAll = useCallback(async () => {
    const [e, p, st] = await Promise.all([
      getEntries(year, month),
      getPlan(dateStr),
      getStintProgress(),
    ])
    setEntries(e)
    setPlan(p?.exists ? p.plan : null)
    setStintData(st)
    const todayEntry = e[dateStr] || {}
    setWeightVal(todayEntry.weight ?? "")
    setSleepVal(todayEntry.sleep ?? "")
    setEnergyVal(todayEntry.energy ?? null)
    setMomentVal(todayEntry.moment ?? "")
    setLoading(false)
  }, [year, month, dateStr])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    async function loadStrava() {
      const token = await getIdToken()
      if (!token) return
      const res = await fetch("/api/strava/status", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setStravaStatus(await res.json())
    }
    loadStrava()
  }, [router.query.strava])

  const handleStravaConnect = useCallback(async () => {
    setStravaBusy(true)
    try {
      const token = await getIdToken()
      const res = await fetch("/api/strava/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { alert("Strava connect failed"); return }
      const { url } = await res.json()
      window.location.href = url
    } finally { setStravaBusy(false) }
  }, [])

  const handleWeightChange = useCallback((e) => {
    const val = e.target.value; setWeightVal(val)
    if (weightTimer.current) clearTimeout(weightTimer.current)
    weightTimer.current = setTimeout(() => {
      const n = parseFloat(val); if (!isNaN(n) && n > 0) saveWeight(dateStr, n)
    }, 800)
  }, [dateStr])

  const handleSleepChange = useCallback((e) => {
    const val = e.target.value; setSleepVal(val)
    if (sleepTimer.current) clearTimeout(sleepTimer.current)
    sleepTimer.current = setTimeout(() => {
      const n = parseFloat(val); if (!isNaN(n) && n >= 0) saveSleep(dateStr, n)
    }, 800)
  }, [dateStr])

  const handleEnergyClick = useCallback((v) => { setEnergyVal(v); saveEnergy(dateStr, v) }, [dateStr])

  const handleMomentChange = useCallback((e) => {
    const val = e.target.value; setMomentVal(val)
    if (momentTimer.current) clearTimeout(momentTimer.current)
    momentTimer.current = setTimeout(() => saveMoment(dateStr, val), 800)
  }, [dateStr])

  if (loading) {
    return <div className={s.page}><div className={s.bootstrap}>Loading…</div></div>
  }

  const todayDate = dateKeyToLocalDate(dateStr)
  const dateLabel = `${DAYS[todayDate.getDay()]}, ${MONTHS_LONG[todayDate.getMonth()]} ${todayDate.getDate()}`

  const goals = stintData?.goals || []
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const hasActiveStint = !!stintData?.stint
  const activeGoals = goals.filter((g) => (g.state || "active") === "active")
  const counts = planCounts(plan)
  const nextItem = currentPlanItem(plan)
  const hasPlanItems = counts.total > 0
  const planPercent = counts.total ? Math.round((counts.done / counts.total) * 100) : 0
  const stintLabel = stintData?.stint
    ? displayStintTitle(stintData.stint)
    : "No active stint"

  return (
    <div className={s.page}>
      <nav className={s.topNav}>
        <Link href="/dashboard"><a className={s.topNavLinkActive}>Today</a></Link>
        <Link href="/dashboard/stints"><a className={s.topNavLink}>Blocks</a></Link>
        <Link href="/dashboard/progress"><a className={s.topNavLink}>Trend</a></Link>
      </nav>

      {hasActiveStint && (
        <section className={s.todayPanel}>
          <div className={s.todayHeader}>
            <div>
              <div className={s.sectionTitle}>Today</div>
              <h1 className={s.todayTitle}>{dateLabel}</h1>
            </div>
            <div className={s.todayStatus}>Block active</div>
          </div>

          <div className={s.todayGrid}>
            <div className={s.todayFocus}>
              <span className={s.todayKicker}>Current</span>
              <strong>{nextItem?.label || nextItem?.templateId || "Nothing queued"}</strong>
              <span>{nextItem?.rationale || "Generate today’s tasks when you are ready."}</span>
            </div>

            <div className={s.todayMetric}>
              <span className={s.todayKicker}>Tasks</span>
              <strong>{hasPlanItems ? `${counts.done}/${counts.total}` : "No tasks"}</strong>
              <span>{hasPlanItems ? `${counts.open} open${counts.partial ? ` · ${counts.partial} partial` : ""}` : "No tasks scheduled today."}</span>
              {hasPlanItems && (
                <div className={s.todayMeter} aria-hidden="true">
                  <div className={s.todayMeterFill} style={{ width: `${planPercent}%` }} />
                </div>
              )}
            </div>

            <div className={s.todayMetric}>
              <span className={s.todayKicker}>Goals</span>
              <strong>{activeGoals.length} active</strong>
              <span>{stintLabel}</span>
            </div>
          </div>
        </section>
      )}

      {/* Plan only makes sense within a stint — outside, hide it. */}
      {hasActiveStint && (
        <section className={s.section}>
          <div className={s.planCard} style={{ "--stint-color": "#6366f1" }}>
            <PlanSection
              date={dateStr}
              initialPlan={plan}
              goalsById={goalsById}
              energyToday={energyVal}
              onChange={loadAll}
            />
          </div>
        </section>
      )}

      <StintBoard onChange={loadAll} />

      {/* Today's log — collapsed by default. Click to expand. */}
      {hasActiveStint && <section className={s.section}>
        <button
          type="button"
          className={s.linkSubtle}
          onClick={() => setBodyOpen((v) => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
        >
          {bodyOpen ? "▼" : "▶"} Today&apos;s log{" "}
          <span style={{ opacity: 0.6 }}>
            {energyVal != null ? `energy ${energyVal}` : "energy —"}
            {sleepVal ? ` · sleep ${sleepVal}h` : ""}
            {weightVal ? ` · ${weightVal}kg` : ""}
          </span>
        </button>
        {bodyOpen && (
          <div className={s.form} style={{ marginTop: "0.75rem" }}>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label>Weight (kg)</label>
                <input type="number" value={weightVal} onChange={handleWeightChange} step="0.1" min="0" />
              </div>
              <div className={s.field}>
                <label>Sleep (hrs)</label>
                <input type="number" value={sleepVal} onChange={handleSleepChange} step="0.5" min="0" max="24" />
              </div>
              <div className={`${s.field} ${s.fieldWide}`}>
                <label>Energy (1-5)</label>
                <div className={s.ratingRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={`${s.ratingBtn} ${energyVal === n ? s.ratingBtnActive : ""}`} onClick={() => handleEnergyClick(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div className={`${s.field} ${s.fieldWide}`}>
                <label>Strava</label>
                {stravaStatus?.connected ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Connected{stravaStatus.athleteName ? ` · ${stravaStatus.athleteName}` : ""}
                  </div>
                ) : (
                  <button type="button" className={s.actionSecondary} onClick={handleStravaConnect} disabled={stravaBusy}>
                    {stravaBusy ? "Connecting…" : "Connect Strava"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>}

    </div>
  )
}
