import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import Header from "../../../components/Header"
import { getGoal, patchGoal, archiveGoal, getProgress } from "../../../lib/firestore"
import { getDateKey } from "../../../lib/dates.js"
import s from "../../../styles/Stint.module.css"

const STATE_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Dropped" },
]

const DEFAULT_COLORS = ["#ef4444", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#3b82f6"]
const DEFAULT_ICONS = ["🎯", "🏆", "🔥", "💪", "🏊", "💰", "📚", "✍️", "🚀", "⚡"]

function pct(n) { return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—" }

export default function GoalDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [goal, setGoal] = useState(null)
  const [recent, setRecent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const today = getDateKey()

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [g, p] = await Promise.all([getGoal(id), getProgress(60)])
      setGoal(g?.goal || null)
      setRecent(p)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading || !goal) {
    return (
      <div>
        <Head><title>Goal - Daniel Raad</title></Head>
        <Header compact />
        <div className={s.page}><div className={s.bootstrap}>Loading…</div></div>
      </div>
    )
  }

  const goalRow = (recent?.goals || []).find((g) => g.id === goal.id)
  const color = goal.color || "#6366f1"
  const sparkSeries = goalRow?.hits?.slice(-60) || []
  const hitRate = goalRow ? goalRow.hitRateAll : 0
  const streak = goalRow?.streak || { current: 0, best: 0 }

  const transition = async (state) => {
    await patchGoal(goal.id, { state })
    load()
  }

  const archive = async () => {
    if (!confirm(`Archive "${goal.title}"?`)) return
    await archiveGoal(goal.id)
    router.push("/dashboard")
  }

  return (
    <div>
      <Head><title>{goal.title} - Daniel Raad</title></Head>
      <Header compact />
      <style jsx global>{`.fixed.bottom-0 { display: none; }`}</style>
      <div className={s.page}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.85rem" }}>
          <div className={s.heroDate}>Goal detail</div>
          <Link href="/dashboard"><a className={s.linkSubtle}>&larr; Dashboard</a></Link>
        </div>

        <nav className={s.topNav}>
          <Link href="/dashboard"><a className={s.topNavLinkActive}>Today</a></Link>
          <Link href="/dashboard/stints"><a className={s.topNavLink}>Stints</a></Link>
          <Link href="/dashboard/progress"><a className={s.topNavLink}>Trend</a></Link>
        </nav>

        <div className={s.hero} style={{ "--stint-color": color }}>
          <div className={s.heroDate} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span style={{ fontSize: "1.4rem" }}>{goal.icon || "🎯"}</span>
            <span>Goal · {goal.state || "active"}</span>
          </div>
          <div className={s.heroStint}>{goal.title}</div>
          {goal.why && <div className={s.heroIntent}>{goal.why}</div>}

          <div style={{ display: "flex", gap: "2rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.04em", color }}>{pct(hitRate)}</div>
              <div className={s.heroDate}>60-day hit rate</div>
            </div>
            <div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.04em" }}>{streak.current}</div>
              <div className={s.heroDate}>Current streak (days)</div>
            </div>
            <div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.04em" }}>{streak.best}</div>
              <div className={s.heroDate}>Best streak</div>
            </div>
          </div>

          <div className={s.heroActions}>
            <button type="button" className={s.actionSecondary} onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit"}
            </button>
            {STATE_OPTIONS.map((opt) => goal.state !== opt.value && (
              <button key={opt.value} type="button" className={s.actionSecondary} onClick={() => transition(opt.value)}>
                {opt.label === "Completed" ? "Mark done" : opt.label === "Dropped" ? "Drop" : opt.label}
              </button>
            ))}
            <button type="button" className={s.actionSecondary} onClick={archive}>Archive</button>
          </div>
        </div>

        {editing && <EditForm goal={goal} onSaved={() => { setEditing(false); load() }} onCancel={() => setEditing(false)} />}

        {sparkSeries.length > 0 && (
          <section className={s.section}>
            <div className={s.sectionTitle}>Last 60 days</div>
            <div className={s.goalTile} style={{ "--goal-color": color, padding: "1rem 1.25rem" }}>
              <div className={s.goalTileSpark} style={{ gridTemplateColumns: `repeat(${sparkSeries.length}, 1fr)` }}>
                {sparkSeries.map((h) => (
                  <div
                    key={h.date}
                    className={`${s.goalTileSparkCell} ${h.date === today ? s.goalTileSparkCellToday : ""}`}
                    style={h.hit ? { background: color } : undefined}
                    title={`${h.date} — ${h.hit ? "hit" : "miss"}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={s.section}>
          <div className={s.sectionTitle}>Detail</div>
          <div className={s.form}>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label>Type</label>
                <div>{goal.type || "—"}</div>
              </div>
              <div className={s.field}>
                <label>Stint</label>
                {goal.stintId ? (
                  <Link href={`/dashboard/stints/${goal.stintId}`}><a>{goal.stintId}</a></Link>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className={s.field}>
                <label>Floor</label>
                <div>{goal.floor != null ? `${goal.floor}${goal.unit ? ` ${goal.unit}` : ""}` : "—"}</div>
              </div>
              <div className={s.field}>
                <label>Target</label>
                <div>{goal.target != null ? `${goal.target}${goal.unit ? ` ${goal.unit}` : ""}` : "—"}</div>
              </div>
              {goal.deadline && (
                <div className={s.field}>
                  <label>Deadline</label>
                  <div>{goal.deadline}</div>
                </div>
              )}
              {goal.rationale && (
                <div className={`${s.field} ${s.fieldWide}`}>
                  <label>Rationale</label>
                  <div>{goal.rationale}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function EditForm({ goal, onSaved, onCancel }) {
  const [values, setValues] = useState({
    title: goal.title || "",
    why: goal.why || goal.rationale || "",
    icon: goal.icon || "🎯",
    color: goal.color || DEFAULT_COLORS[0],
    floor: goal.floor ?? "",
    target: goal.target ?? "",
    unit: goal.unit || "",
    deadline: goal.deadline || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true); setError(null)
    try {
      await patchGoal(goal.id, {
        title: values.title,
        why: values.why || null,
        icon: values.icon,
        color: values.color,
        floor: values.floor === "" ? null : Number(values.floor),
        target: values.target === "" ? null : Number(values.target),
        unit: values.unit || null,
        deadline: values.deadline || null,
      })
      onSaved?.()
    } catch (e) { setError(e.message || "Save failed") } finally { setSaving(false) }
  }

  return (
    <div className={s.form}>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Title</label>
          <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
        </div>
        <div className={s.field}>
          <label>Icon</label>
          <div className={s.iconRow}>
            {DEFAULT_ICONS.map((i) => (
              <button key={i} type="button" className={`${s.iconBtn} ${values.icon === i ? s.iconBtnActive : ""}`} onClick={() => setValues({ ...values, icon: i })}>{i}</button>
            ))}
          </div>
        </div>
        <div className={s.field}>
          <label>Color</label>
          <div className={s.colorRow}>
            {DEFAULT_COLORS.map((c) => (
              <button key={c} type="button" className={`${s.colorSwatch} ${values.color === c ? s.colorSwatchActive : ""}`} style={{ background: c }} aria-label={c} onClick={() => setValues({ ...values, color: c })} />
            ))}
          </div>
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Why</label>
          <input value={values.why} onChange={(e) => setValues({ ...values, why: e.target.value })} />
        </div>
        <div className={s.field}><label>Floor</label><input type="number" value={values.floor} onChange={(e) => setValues({ ...values, floor: e.target.value })} /></div>
        <div className={s.field}><label>Target</label><input type="number" value={values.target} onChange={(e) => setValues({ ...values, target: e.target.value })} /></div>
        <div className={s.field}><label>Unit</label><input value={values.unit} onChange={(e) => setValues({ ...values, unit: e.target.value })} /></div>
        <div className={s.field}><label>Deadline</label><input type="date" value={values.deadline} onChange={(e) => setValues({ ...values, deadline: e.target.value })} /></div>
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.actionPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className={s.actionSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        {error && <span className={s.errorText}>{error}</span>}
      </div>
    </div>
  )
}
