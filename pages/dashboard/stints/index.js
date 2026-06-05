import Head from "next/head"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import Header from "../../../components/Header"
import { deleteStintHard, getStints } from "../../../lib/firestore"
import { getDateKey, dateKeyToLocalDate } from "../../../lib/dates.js"
import s from "../../../styles/Stint.module.css"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function fmt(d) {
  if (!d) return ""
  const dt = dateKeyToLocalDate(d)
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
}

export default function StintsIndex() {
  const [stints, setStints] = useState([])
  const [today, setToday] = useState(getDateKey())
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStints()
      setStints(res.stints || [])
      setToday(res.today || getDateKey())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (e, id, title) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Permanently delete "${title}"? This can't be undone.`)) return
    try {
      await deleteStintHard(id)
      load()
    } catch (err) {
      alert(err.message || "Delete failed")
    }
  }

  const visible = showArchived ? stints : stints.filter((st) => st.state !== "archived")
  const archivedCount = stints.filter((st) => st.state === "archived").length

  return (
    <div>
      <Head><title>Stints - Daniel Raad</title></Head>
      <Header compact />
      <style jsx global>{`.fixed.bottom-0 { display: none; }`}</style>
      <div className={s.page}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.85rem" }}>
          <div className={s.heroDate}>The Stints</div>
          <Link href="/dashboard"><a className={s.linkSubtle}>&larr; Dashboard</a></Link>
        </div>

        <nav className={s.topNav}>
          <Link href="/dashboard"><a className={s.topNavLink}>Today</a></Link>
          <Link href="/dashboard/stints"><a className={s.topNavLinkActive}>Stints</a></Link>
          <Link href="/dashboard/progress"><a className={s.topNavLink}>Trend</a></Link>
        </nav>

        <div style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.4rem" }}>
          Every 75
        </div>
        <div style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Past, present, future blocks. Click any stint to read its review or edit it.
        </div>

        {loading && <div className={s.bootstrap}>Loading…</div>}

        {!loading && visible.length === 0 && (
          <div className={s.bootstrap}>
            <div className={s.bootstrapTitle}>No stints to show</div>
            <div className={s.bootstrapBody}>
              {stints.length === 0 ? "Head back to the dashboard to start your first one." : "Everything here is archived."}
            </div>
            {stints.length === 0 && <Link href="/dashboard"><a className={s.actionPrimary}>Go to dashboard</a></Link>}
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className={s.stintsHistory}>
            {visible.map((st) => {
              const isArchived = st.state === "archived"
              const isCurrent = !isArchived && st.startDate <= today && today <= st.endDate
              const stateClass = isCurrent
                ? s.stateActive
                : st.state === "completed"
                ? s.stateCompleted
                : st.state === "planning"
                ? s.statePlanning
                : ""
              const stateLabel = isCurrent ? "Now" : st.state
              return (
                <div key={st.id} style={{ position: "relative" }}>
                  <Link href={`/dashboard/stints/${st.id}`}>
                    <a className={s.stintHistoryCard}>
                      <div className={s.stintHistoryHead}>
                        <span className={s.stintHistoryTitle}>{st.title || `Stint ${st.index}`}</span>
                        <span className={`${s.stintHistoryStateBadge} ${stateClass}`}>{stateLabel}</span>
                      </div>
                      <div className={s.stintHistoryDates}>
                        {fmt(st.startDate)} → {fmt(st.endDate)} · {st.goalCount} goal{st.goalCount === 1 ? "" : "s"}
                      </div>
                      {st.intent && <div className={s.stintHistoryIntent}>&ldquo;{st.intent}&rdquo;</div>}
                    </a>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => remove(e, st.id, st.title || `Stint ${st.index}`)}
                    title="Permanently delete"
                    aria-label="Permanently delete"
                    className={s.stintDeleteBtn}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {archivedCount > 0 && (
          <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
            <button
              type="button"
              className={s.linkSubtle}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem" }}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? `Hide ${archivedCount} archived` : `Show ${archivedCount} archived`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
