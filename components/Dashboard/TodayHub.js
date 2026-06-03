import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/router"
import {
  getEntries,
  saveWeight, saveSleep, saveEnergy, saveMoment,
  getPlan,
} from "../../lib/firestore"
import { getIdToken } from "../../lib/AuthContext"
import { dateKeyToLocalDate, getDateKey } from "../../lib/dates.js"
import styles from "../../styles/Dashboard.module.css"
import PlanSection from "./PlanSection"
import GoalsProgress from "./GoalsProgress"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function TodayHub() {
  const router = useRouter()
  const now = new Date()
  const dateStr = getDateKey(now)
  const [year, month] = dateStr.split("-").map(Number)

  const [entries, setEntries] = useState({})
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weightVal, setWeightVal] = useState("")
  const [sleepVal, setSleepVal] = useState("")
  const [energyVal, setEnergyVal] = useState(null)
  const [momentVal, setMomentVal] = useState("")
  const [stravaStatus, setStravaStatus] = useState(null)
  const [stravaBusy, setStravaBusy] = useState(false)
  const weightTimer = useRef(null)
  const sleepTimer = useRef(null)
  const momentTimer = useRef(null)

  // Load all data
  useEffect(() => {
    async function load() {
      const [e, p] = await Promise.all([
        getEntries(year, month),
        getPlan(dateStr),
      ])
      setEntries(e)
      setPlan(p?.exists ? p.plan : null)
      const todayEntry = e[dateStr] || {}
      setWeightVal(todayEntry.weight ?? "")
      setSleepVal(todayEntry.sleep ?? "")
      setEnergyVal(todayEntry.energy ?? null)
      setMomentVal(todayEntry.moment ?? "")
      setLoading(false)
    }
    load()
  }, [year, month, dateStr])

  // Strava status
  useEffect(() => {
    async function loadStrava() {
      const token = await getIdToken()
      if (!token) return
      const res = await fetch("/api/strava/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(`Strava connect failed: ${body.error || res.status}`)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } finally {
      setStravaBusy(false)
    }
  }, [])

  // --- Handlers ---

  const handleWeightChange = useCallback(
    (e) => {
      const val = e.target.value
      setWeightVal(val)
      if (weightTimer.current) clearTimeout(weightTimer.current)
      weightTimer.current = setTimeout(() => {
        const num = parseFloat(val)
        if (!isNaN(num) && num > 0) saveWeight(dateStr, num)
      }, 800)
    },
    [dateStr]
  )

  const handleSleepChange = useCallback(
    (e) => {
      const val = e.target.value
      setSleepVal(val)
      if (sleepTimer.current) clearTimeout(sleepTimer.current)
      sleepTimer.current = setTimeout(() => {
        const num = parseFloat(val)
        if (!isNaN(num) && num >= 0) saveSleep(dateStr, num)
      }, 800)
    },
    [dateStr]
  )

  const handleEnergyClick = useCallback(
    (value) => {
      setEnergyVal(value)
      saveEnergy(dateStr, value)
    },
    [dateStr]
  )

  const handleMomentChange = useCallback(
    (e) => {
      const val = e.target.value
      setMomentVal(val)
      if (momentTimer.current) clearTimeout(momentTimer.current)
      momentTimer.current = setTimeout(() => saveMoment(dateStr, val), 800)
    },
    [dateStr]
  )

  // --- Derived data ---

  if (loading) {
    return (
      <div className={`${styles.dashboard} terminal`}>
        <div className={styles.loadingState}>Loading...</div>
      </div>
    )
  }

  const planItems = plan?.items || []
  const planDone = planItems.filter((i) => i.status === "done").length

  const todayDate = dateKeyToLocalDate(dateStr)
  const dateLabel = `${DAY_NAMES[todayDate.getDay()]}, ${MONTH_NAMES[todayDate.getMonth()]} ${todayDate.getDate()}`

  return (
    <div className={`${styles.dashboard} terminal`}>
      {/* Header banner */}
      <div className={styles.hubHeader}>
        <div className={styles.hubDate}>{dateLabel}</div>
        <div className={styles.hubSummary}>
          {planItems.length > 0 && (
            <span className={styles.hubStat}>
              {planDone}/{planItems.length} plan
            </span>
          )}
        </div>
      </div>

      {/* Today's plan — floor-first */}
      <PlanSection date={dateStr} initialPlan={plan} />

      {/* Goals progress strips */}
      <GoalsProgress />

      {/* Body — weight, sleep, energy */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Body</span>
        </div>
        <div className={styles.hubInputRow}>
          <div className={styles.hubInputGroup}>
            <label>Weight (kg)</label>
            <input
              type="number"
              value={weightVal}
              onChange={handleWeightChange}
              placeholder="e.g. 75"
              step="0.1"
              min="0"
            />
          </div>
          <div className={styles.hubInputGroup}>
            <label>Sleep (hrs)</label>
            <input
              type="number"
              value={sleepVal}
              onChange={handleSleepChange}
              placeholder="e.g. 8"
              step="0.5"
              min="0"
              max="24"
            />
          </div>
          <div className={styles.hubInputGroup}>
            <label>Energy</label>
            <div className={styles.hubEnergyPills}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.hubEnergyPill} ${energyVal === n ? styles.hubEnergyPillActive : ""}`}
                  onClick={() => handleEnergyClick(n)}
                  aria-label={`Energy ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Moment */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Moment</span>
        </div>
        <textarea
          className={styles.hubMomentInput}
          value={momentVal}
          onChange={handleMomentChange}
          placeholder="What made today memorable?"
          rows={2}
        />
      </section>

      {/* Integrations */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Integrations</span>
        </div>
        <div className={styles.hubIntegrationRow}>
          <div className={styles.hubIntegrationLabel}>
            Strava
            {router.query.strava === "connected" && (
              <span className={styles.hubIntegrationFlash}> · just connected</span>
            )}
            {router.query.strava === "error" && (
              <span className={styles.hubIntegrationError}> · {router.query.reason || "failed"}</span>
            )}
          </div>
          {stravaStatus?.connected ? (
            <div className={styles.hubIntegrationStatus}>
              <span className={styles.hubIntegrationConnected}>Connected</span>
              {stravaStatus.athleteName && <span> · {stravaStatus.athleteName}</span>}
              <button
                type="button"
                className={styles.hubIntegrationBtn}
                onClick={handleStravaConnect}
                disabled={stravaBusy}
              >
                Reconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.hubIntegrationBtn}
              onClick={handleStravaConnect}
              disabled={stravaBusy}
            >
              {stravaBusy ? "Connecting..." : "Connect Strava"}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
