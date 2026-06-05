import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import Header from "../../../components/Header"
import { getStint, patchStint } from "../../../lib/firestore"
import { getDateKey, dateKeyToLocalDate } from "../../../lib/dates.js"
import StintReviewForm from "../../../components/Dashboard/StintReviewForm"
import s from "../../../styles/Stint.module.css"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function fmt(d) {
  if (!d) return ""
  const dt = dateKeyToLocalDate(d)
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
}

function pct(n) { return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—" }

// Add N days to a YYYY-MM-DD key (UTC math to avoid TZ drift).
function addDays(key, days) {
  const [y, m, d] = key.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + days)
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`
}

function StintEditForm({ stint, onSaved, onCancel }) {
  const [title, setTitle] = useState(stint.title || "")
  const [intent, setIntent] = useState(stint.intent || "")
  const [startDate, setStartDate] = useState(stint.startDate || "")
  const [endDate, setEndDate] = useState(stint.endDate || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // If only startDate changes, recompute endDate as start+74 (75-day window)
  const onStartChange = (e) => {
    const next = e.target.value
    setStartDate(next)
    if (next) setEndDate(addDays(next, 74))
  }

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const patch = { title, intent }
      if (startDate && startDate !== stint.startDate) patch.startDate = startDate
      if (endDate && endDate !== stint.endDate) patch.endDate = endDate
      await patchStint(stint.id, patch)
      onSaved?.()
    } catch (e) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.reviewForm} style={{ marginTop: "1.2rem" }}>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Name</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stint 1 — base + revenue" />
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Intent</label>
          <textarea value={intent} onChange={(e) => setIntent(e.target.value)} style={{ minHeight: 100 }} />
        </div>
        <div className={s.field}>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={onStartChange} />
        </div>
        <div className={s.field}>
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.actionPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className={s.actionSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        {error && <span className={s.errorText}>{error}</span>}
      </div>
    </div>
  )
}

export default function StintDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [stint, setStint] = useState(null)
  const [today, setToday] = useState(getDateKey())
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getStint(id)
      setStint(res?.stint || null)
      setToday(res?.today || getDateKey())
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading || !stint) {
    return (
      <div>
        <Head><title>Stint - Daniel Raad</title></Head>
        <Header compact />
        <div className={s.page}><div className={s.bootstrap}>Loading…</div></div>
      </div>
    )
  }

  const stintColor = "#6366f1"
  const goals = stint.goals || []

  return (
    <div>
      <Head><title>{stint.title} - Daniel Raad</title></Head>
      <Header compact />
      <style jsx global>{`.fixed.bottom-0 { display: none; }`}</style>
      <div className={s.page}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.85rem" }}>
          <div className={s.heroDate}>Stint detail</div>
          <Link href="/dashboard"><a className={s.linkSubtle}>&larr; Dashboard</a></Link>
        </div>

        <nav className={s.topNav}>
          <Link href="/dashboard"><a className={s.topNavLink}>Today</a></Link>
          <Link href="/dashboard/stints"><a className={s.topNavLinkActive}>Stints</a></Link>
          <Link href="/dashboard/progress"><a className={s.topNavLink}>Trend</a></Link>
        </nav>

        <div className={s.hero} style={{ "--stint-color": stintColor }}>
          <div className={s.heroDate}>{stint.state}</div>
          <div className={s.heroStint}>{stint.title || `Stint ${stint.index}`}</div>
          <div className={s.heroDay}>{fmt(stint.startDate)} → {fmt(stint.endDate)}</div>
          {stint.intent && <div className={s.heroIntent}>{stint.intent}</div>}

          <div className={s.heroActions}>
            <button type="button" className={s.actionSecondary} onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit"}
            </button>
            <button type="button" className={s.actionPrimary} onClick={() => setReviewing((v) => !v)}>
              {reviewing ? "Close review" : (stint.review ? "Edit review" : "Write review")}
            </button>
          </div>

          {editing && (
            <StintEditForm
              stint={stint}
              onSaved={() => { setEditing(false); load() }}
              onCancel={() => setEditing(false)}
            />
          )}

          {reviewing && (
            <div className={s.reviewForm} style={{ marginTop: "1.2rem", "--stint-color": stintColor }}>
              <StintReviewForm
                stint={stint}
                onSaved={() => { setReviewing(false); load() }}
                onCancel={() => setReviewing(false)}
              />
            </div>
          )}

          {!reviewing && stint.review && (
            <div style={{ marginTop: "1.4rem", padding: "1rem 1.2rem", borderRadius: 12, background: "rgba(127,127,127,0.08)" }}>
              <div className={s.sectionTitle} style={{ marginBottom: "0.6rem" }}>Review</div>
              {stint.review.rating != null && <div style={{ marginBottom: "0.5rem" }}><strong>Rating</strong> {stint.review.rating}/5</div>}
              {stint.review.wins && <div style={{ marginBottom: "0.5rem" }}><strong>Wins:</strong> {stint.review.wins}</div>}
              {stint.review.misses && <div style={{ marginBottom: "0.5rem" }}><strong>Misses:</strong> {stint.review.misses}</div>}
              {stint.review.nextFocus && <div style={{ marginBottom: "0.5rem" }}><strong>Next:</strong> {stint.review.nextFocus}</div>}
              {stint.review.body && <div style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{stint.review.body}</div>}
            </div>
          )}
        </div>

        <section className={s.section}>
          <div className={s.sectionTitle}>Goals · {goals.length}</div>
          <div className={s.goalGrid}>
            {goals.map((g) => {
              const color = g.color || "#6366f1"
              return (
                <Link key={g.id} href={`/dashboard/goals/${g.id}`}>
                  <a className={s.goalTile} style={{ "--goal-color": color }}>
                    <div className={s.goalTileHead}>
                      <span className={s.goalTileIcon} style={{ background: `${color}26` }}>{g.icon || "🎯"}</span>
                      <span className={s.goalTileTitle}>{g.title}</span>
                    </div>
                    {g.why && <div className={s.goalTileWhy}>&ldquo;{g.why}&rdquo;</div>}
                    <div className={s.goalTileStats}>
                      <div className={s.goalTileHitRate}>{pct(g.hitRate)}</div>
                      <div className={s.goalTileHitMeta}>{g.hitsCount}/{g.daysElapsed} days</div>
                    </div>
                  </a>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
