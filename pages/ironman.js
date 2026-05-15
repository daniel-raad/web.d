import { useEffect, useMemo, useState } from "react"
import Head from "next/head"
import Header from "../components/Header"
import Link from "next/link"
import { useAuth, getIdToken } from "../lib/AuthContext"
import styles from "../styles/Ironman.module.css"

const DISCIPLINES = ["swim", "bike", "run", "strength"]
const DISCIPLINE_EMOJI = { swim: "🏊", bike: "🚴", run: "🏃", strength: "🏋️", other: "•" }

function formatHours(h) {
  if (h == null) return "—"
  return `${h.toFixed(1)}h`
}

function formatSessionDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })
}

function formatSessionStats(s) {
  const parts = []
  if (s.distanceKm) parts.push(`${s.distanceKm.toFixed(1)}km`)
  if (s.movingMinutes) {
    const h = Math.floor(s.movingMinutes / 60)
    const m = s.movingMinutes % 60
    parts.push(h > 0 ? `${h}h ${m}m` : `${m}m`)
  }
  if (s.avgHeartRate) parts.push(`${Math.round(s.avgHeartRate)}bpm`)
  return parts.join(" · ")
}

export default function IronmanPage() {
  const { user, loading: authLoading, signIn } = useAuth()
  const [plan, setPlan] = useState(null)
  const [sessions, setSessions] = useState([])
  const [stravaConnected, setStravaConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = await getIdToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [planRes, sessRes] = await Promise.all([
          fetch("/api/ironman/plan", { headers }),
          fetch("/api/ironman/sessions?days=14", { headers }),
        ])
        if (cancelled) return
        if (planRes.ok) {
          const p = await planRes.json()
          setPlan(p)
          setDraft({
            targetsHoursPerWeek: { ...p.targetsHoursPerWeek },
            raceDate: p.raceDate,
            notes: p.notes || "",
          })
        }
        if (sessRes.ok) {
          const s = await sessRes.json()
          setStravaConnected(s.connected !== false)
          setSessions(s.activities || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleTargetChange = (discipline, value) => {
    setDraft((d) => ({
      ...d,
      targetsHoursPerWeek: { ...d.targetsHoursPerWeek, [discipline]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = await getIdToken()
      const targets = {}
      for (const d of DISCIPLINES) {
        const raw = draft.targetsHoursPerWeek[d]
        const num = typeof raw === "number" ? raw : parseFloat(raw)
        targets[d] = Number.isFinite(num) ? num : 0
      }
      const res = await fetch("/api/ironman/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetsHoursPerWeek: targets,
          raceDate: draft.raceDate,
          notes: draft.notes,
        }),
      })
      if (res.ok) {
        // Reload plan with fresh week progress
        const planRes = await fetch("/api/ironman/plan", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (planRes.ok) {
          const p = await planRes.json()
          setPlan(p)
        }
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1800)
      }
    } finally {
      setSaving(false)
    }
  }

  const groupedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
  }, [sessions])

  if (authLoading) {
    return (
      <div>
        <Head>
          <title>Ironman — Daniel Raad</title>
        </Head>
        <Header compact />
        <div className={styles.page}>
          <div className={styles.empty}>Loading…</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <Head>
          <title>Ironman — Daniel Raad</title>
        </Head>
        <Header compact />
        <div className={styles.page}>
          <div className={styles.signedOut}>
            Sign in to see training plan + Strava data.
            <br />
            <button type="button" onClick={signIn}>Sign in with Google</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Ironman — Daniel Raad</title>
        <meta name="description" content="Ironman 70.3 Estonia training tracker" />
      </Head>
      <Header compact />

      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <div className={`${styles.page} terminal`}>
        {/* Countdown */}
        <div className={styles.countdownCard}>
          <div>
            <div className={styles.countdownTitle}>Race day</div>
            <div className={styles.countdownRace}>
              <span className={styles.countdownRaceRed}>IRON</span>MAN <span className={styles.countdownRaceRed}>70.3</span> Estonia
            </div>
            <div className={styles.countdownDate}>{plan?.raceDate || "2026-08-23"}</div>
          </div>
          <div>
            <div className={styles.countdownDays}>{plan?.daysToRace ?? "—"}</div>
            <div className={styles.countdownDaysLabel}>days to go</div>
          </div>
        </div>

        {/* This week vs targets */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>This week</span>
            <span className={styles.sectionMeta}>
              {plan?.weekStart ? `from ${plan.weekStart}` : ""}
            </span>
          </div>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : !plan ? (
            <div className={styles.empty}>No plan yet.</div>
          ) : (
            <>
              {plan.progress.map((p) => {
                const complete = p.pct >= 100
                return (
                  <div key={p.discipline} className={styles.weekRow}>
                    <div className={styles.weekDiscipline}>
                      <span className={styles.weekDisciplineEmoji}>{DISCIPLINE_EMOJI[p.discipline]}</span>
                      {p.discipline}
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill} ${complete ? styles.barFillComplete : ""}`}
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <div className={styles.weekStats}>
                      <span className={styles.weekStatsDone}>{formatHours(p.doneHours)}</span>
                      {" / "}
                      {formatHours(p.targetHours)}
                    </div>
                  </div>
                )
              })}
              <div className={styles.weekTotalRow}>
                <span className={styles.weekTotalLabel}>Total</span>
                <span className={styles.weekTotalValue}>
                  {formatHours(plan.totals.doneHours)} / {formatHours(plan.totals.targetHours)} · {plan.totals.pct}%
                </span>
              </div>
              {plan.notes && <div className={styles.notes}>{plan.notes}</div>}
              {plan.stravaError && (
                <div className={styles.connectStrava}>
                  Strava not connected.{" "}
                  <Link href="/dashboard">
                    <a>Connect on the dashboard</a>
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* Edit targets */}
        {draft && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Weekly targets</span>
              <span className={styles.sectionMeta}>hours / week</span>
            </div>
            <div className={styles.targetsGrid}>
              {DISCIPLINES.map((d) => (
                <div key={d} className={styles.targetGroup}>
                  <label className={styles.targetLabel}>
                    {DISCIPLINE_EMOJI[d]} {d}
                  </label>
                  <input
                    className={styles.targetInput}
                    type="number"
                    step="0.5"
                    min="0"
                    value={draft.targetsHoursPerWeek[d] ?? ""}
                    onChange={(e) => handleTargetChange(d, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <textarea
              className={styles.notesInput}
              value={draft.notes}
              onChange={(e) => setDraft((x) => ({ ...x, notes: e.target.value }))}
              placeholder="Block focus / notes (e.g. base, build, peak, taper)"
              rows={2}
            />
            <div className={styles.targetsActions}>
              {savedFlash && <span className={styles.savedFlash}>Saved</span>}
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
        )}

        {/* Recent sessions */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Recent sessions</span>
            <span className={styles.sectionMeta}>last 14 days</span>
          </div>
          {!stravaConnected ? (
            <div className={styles.connectStrava}>
              Strava not connected.{" "}
              <Link href="/dashboard">
                <a>Connect on the dashboard</a>
              </Link>
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className={styles.empty}>No sessions in the last 14 days.</div>
          ) : (
            <div className={styles.sessions}>
              {groupedSessions.map((s) => (
                <div key={s.id} className={styles.sessionRow}>
                  <div className={styles.sessionDate}>{formatSessionDate(s.startDate)}</div>
                  <div className={styles.sessionMain}>
                    <span className={styles.sessionName}>
                      {DISCIPLINE_EMOJI[s.discipline] || "•"} {s.name}
                    </span>
                    <span className={styles.sessionType}>{s.type}</span>
                  </div>
                  <div className={styles.sessionStats}>{formatSessionStats(s)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
