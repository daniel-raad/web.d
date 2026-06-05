import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  archiveGoal,
  archiveStint,
  bootstrapCurrentStint,
  createGoal,
  createStint,
  getStintProgress,
  patchGoal,
  patchStint,
} from "../../lib/firestore"
import { getDateKey, dateKeyToLocalDate } from "../../lib/dates.js"
import s from "../../styles/Stint.module.css"
import StintReviewForm from "./StintReviewForm"

const DEFAULT_COLORS = ["#ef4444", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#3b82f6"]
const DEFAULT_ICONS = ["🎯", "🏆", "🔥", "💪", "🏊", "💰", "📚", "✍️", "🚀", "⚡"]
const GOAL_TYPES = [
  { value: "process-cadence", label: "Process cadence" },
  { value: "outcome-leads", label: "Outcome + leads" },
  { value: "deadline-plan", label: "Deadline plan" },
]
const STATE_LABEL = { active: "Active", paused: "Paused", completed: "Done", abandoned: "Dropped", archived: "Archived" }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function pct(n) { return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—" }

function fmtRange(start, end) {
  if (!start || !end) return ""
  const a = dateKeyToLocalDate(start), b = dateKeyToLocalDate(end)
  return `${MONTHS[a.getMonth()]} ${a.getDate()} → ${MONTHS[b.getMonth()]} ${b.getDate()}`
}

function dInclusive(a, b) {
  if (!a || !b) return 0
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000) + 1
}

// --- Hero (stint header) ---

function StintHero({ stint, today, onReview, onEditIntent, onRestart, onDelete }) {
  const totalDays = dInclusive(stint.startDate, stint.endDate)
  const elapsed = today >= stint.startDate ? Math.min(totalDays, dInclusive(stint.startDate, today)) : 0
  const remaining = Math.max(0, totalDays - elapsed)
  const pctElapsed = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0
  const stintColor = "#6366f1"
  const isAlmostDone = remaining <= 7

  return (
    <div className={s.hero} style={{ "--stint-color": stintColor }}>
      <div className={s.heroDate}>The Current 75</div>
      <div className={s.heroStint}>{stint.title || `Stint ${stint.index}`}</div>
      <div className={s.heroDay}>
        <strong>Day {elapsed}</strong> of {totalDays}
        {remaining > 0 && <> · {remaining} {remaining === 1 ? "day" : "days"} left</>}
      </div>
      <div className={`${s.heroIntent} ${!stint.intent ? s.heroIntentMuted : ""}`}>
        {stint.intent || "No intent set — write the prompt for these 75 days."}
      </div>
      <div className={s.heroProgress}>
        <div className={s.heroProgressFill} style={{ width: `${pctElapsed}%` }} />
      </div>
      <div className={s.heroMeta}>
        <span>{fmtRange(stint.startDate, stint.endDate)}</span>
        <span>{pctElapsed}% of the block</span>
      </div>
      <div className={s.heroActions}>
        <button type="button" className={s.actionSecondary} onClick={onEditIntent}>Edit intent</button>
        <button type="button" className={s.actionSecondary} onClick={onRestart} title="Reset the 75-day window starting today">Restart</button>
        {isAlmostDone && (
          <button type="button" className={s.actionPrimary} onClick={onReview}>Run stint review</button>
        )}
        <button type="button" className={s.actionSecondary} onClick={onDelete} title="Delete this stint" style={{ marginLeft: "auto", opacity: 0.7 }}>Delete</button>
      </div>
    </div>
  )
}

// Add N days to a YYYY-MM-DD key. Avoids timezone surprises by working in UTC.
function addDays(key, days) {
  const [y, m, d] = key.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + days)
  const yy = t.getUTCFullYear()
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(t.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

// --- Intent editor (inline replacement of the hero text) ---

function IntentEditor({ stint, onSaved, onCancel }) {
  const [title, setTitle] = useState(stint.title || "")
  const [intent, setIntent] = useState(stint.intent || "")
  const [startDate, setStartDate] = useState(stint.startDate || "")
  const [lengthDays, setLengthDays] = useState(75)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const patch = { title, intent }
      if (startDate && startDate !== stint.startDate) {
        patch.startDate = startDate
        patch.endDate = addDays(startDate, Number(lengthDays) - 1 || 74)
      }
      await patchStint(stint.id, patch)
      onSaved?.()
    } catch (e) { setError(e.message || "Save failed") } finally { setSaving(false) }
  }

  return (
    <div className={s.form}>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Stint title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stint 1 — base + revenue" />
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Intent (one paragraph: what these 75 days are FOR)</label>
          <textarea value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Lock the training floor every week through the race + ship the AI webhook that's blocking demos." style={{ minHeight: 100 }} />
        </div>
        <div className={s.field}>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className={s.field}>
          <label>Length (days)</label>
          <input type="number" value={lengthDays} onChange={(e) => setLengthDays(e.target.value)} min="1" />
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

// --- 75-day tracker row for one goal ---

function GoalTrackerRow({ goal, onChange }) {
  const [editing, setEditing] = useState(false)
  const color = goal.color || "#6366f1"
  const days = goal.hits || []
  const state = goal.state || "active"
  const isMuted = state === "paused" || state === "abandoned" || state === "completed"

  const transition = async (next) => {
    await patchGoal(goal.id, { state: next })
    onChange?.()
  }
  const archive = async () => {
    if (!confirm(`Archive "${goal.title}"? It'll stop showing.`)) return
    await archiveGoal(goal.id)
    onChange?.()
  }

  return (
    <div
      className={s.goalRow}
      style={{ "--goal-color": color, opacity: isMuted ? 0.6 : 1 }}
    >
      <div className={s.goalRowHead}>
        <div className={s.goalRowTitleBlock}>
          <span className={s.goalRowIcon} style={{ background: `${color}26` }}>{goal.icon || "🎯"}</span>
          <div className={s.goalRowTitleText}>
            <div className={s.goalRowTitle}>
              {goal.title}
              {state !== "active" && (
                <span className={s.goalRowStateBadge}>{STATE_LABEL[state]}</span>
              )}
            </div>
            {goal.why && <div className={s.goalRowWhy}>{goal.why}</div>}
          </div>
        </div>
        <div className={s.goalRowStats}>
          <div className={s.goalRowHitRate} style={{ color }}>{pct(goal.hitRate)}</div>
          <div className={s.goalRowHitMeta}>{goal.hitsCount}/{goal.daysElapsed} days</div>
        </div>
      </div>

      <div className={s.goalRowTracker} style={{ gridTemplateColumns: `repeat(${days.length || 75}, 1fr)` }}>
        {days.map((d) => {
          const isToday = d.date === (new Date()).toISOString().slice(0, 10) // crude; safe for "is right now"
          return (
            <div
              key={d.date}
              className={`${s.trackerCell} ${isToday ? s.trackerCellToday : ""}`}
              style={d.hit ? { background: color } : undefined}
              title={`${d.date} — ${d.hit ? "hit" : "miss"}`}
            />
          )
        })}
      </div>

      <div className={s.goalRowActions}>
        <button type="button" className={s.actionTiny} onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</button>
        {state === "active" && (
          <>
            <button type="button" className={s.actionTiny} onClick={() => transition("completed")}>Done</button>
            <button type="button" className={s.actionTiny} onClick={() => transition("paused")}>Pause</button>
          </>
        )}
        {state === "paused" && <button type="button" className={s.actionTiny} onClick={() => transition("active")}>Resume</button>}
        {(state === "completed" || state === "abandoned") && <button type="button" className={s.actionTiny} onClick={() => transition("active")}>Reopen</button>}
        <button type="button" className={s.actionTiny} onClick={archive}>Archive</button>
      </div>

      {editing && <GoalEditForm goal={goal} onSaved={() => { setEditing(false); onChange?.() }} onCancel={() => setEditing(false)} />}
    </div>
  )
}

// --- Inline goal edit form ---

function GoalEditForm({ goal, onSaved, onCancel }) {
  const [values, setValues] = useState({
    title: goal.title || "",
    why: goal.why || goal.rationale || "",
    icon: goal.icon || "🎯",
    color: goal.color || DEFAULT_COLORS[0],
    type: goal.type || "process-cadence",
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
        type: values.type,
        floor: values.floor === "" ? null : Number(values.floor),
        target: values.target === "" ? null : Number(values.target),
        unit: values.unit || null,
        deadline: values.deadline || null,
      })
      onSaved?.()
    } catch (e) { setError(e.message || "Save failed") } finally { setSaving(false) }
  }

  return (
    <div className={s.form} style={{ marginTop: "0.6rem", marginBottom: 0 }}>
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
          <input value={values.why} onChange={(e) => setValues({ ...values, why: e.target.value })} placeholder="One-line anchor" />
        </div>
        <div className={s.field}>
          <label>Type</label>
          <select value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })}>
            {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label>Floor</label>
          <input type="number" value={values.floor} onChange={(e) => setValues({ ...values, floor: e.target.value })} />
        </div>
        <div className={s.field}>
          <label>Target</label>
          <input type="number" value={values.target} onChange={(e) => setValues({ ...values, target: e.target.value })} />
        </div>
        <div className={s.field}>
          <label>Unit</label>
          <input value={values.unit} onChange={(e) => setValues({ ...values, unit: e.target.value })} placeholder="min, GBP" />
        </div>
        {(values.type === "deadline-plan" || values.deadline) && (
          <div className={s.field}>
            <label>Deadline</label>
            <input type="date" value={values.deadline} onChange={(e) => setValues({ ...values, deadline: e.target.value })} />
          </div>
        )}
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.actionPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className={s.actionSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        {error && <span className={s.errorText}>{error}</span>}
      </div>
    </div>
  )
}

// --- New goal form ---

function NewGoalForm({ used, onCreated, onCancel }) {
  const [title, setTitle] = useState("")
  const [why, setWhy] = useState("")
  const [type, setType] = useState("process-cadence")
  const [icon, setIcon] = useState("🎯")
  const [color, setColor] = useState(DEFAULT_COLORS.find((c) => !used.includes(c)) || DEFAULT_COLORS[0])
  const [floor, setFloor] = useState("")
  const [target, setTarget] = useState("")
  const [unit, setUnit] = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    if (!title.trim()) { setError("Title required"); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        title: title.trim(),
        type, icon, color,
        why: why.trim() || undefined,
        floor: floor === "" ? undefined : Number(floor),
        target: target === "" ? undefined : Number(target),
        unit: unit || undefined,
        deadline: deadline || undefined,
      }
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
      await createGoal(payload)
      onCreated?.()
    } catch (e) { setError(e.message || "Create failed") } finally { setSaving(false) }
  }

  return (
    <div className={s.form}>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish Ironman 70.3" />
        </div>
        <div className={s.field}>
          <label>Icon</label>
          <div className={s.iconRow}>
            {DEFAULT_ICONS.map((i) => (
              <button key={i} type="button" className={`${s.iconBtn} ${icon === i ? s.iconBtnActive : ""}`} onClick={() => setIcon(i)}>{i}</button>
            ))}
          </div>
        </div>
        <div className={s.field}>
          <label>Color</label>
          <div className={s.colorRow}>
            {DEFAULT_COLORS.map((c) => (
              <button key={c} type="button" className={`${s.colorSwatch} ${color === c ? s.colorSwatchActive : ""}`} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Why</label>
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One-line anchor" />
        </div>
        <div className={s.field}>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label>Floor</label>
          <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
        </div>
        <div className={s.field}>
          <label>Target</label>
          <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className={s.field}>
          <label>Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="min, GBP" />
        </div>
        {type === "deadline-plan" && (
          <div className={s.field}>
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        )}
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.actionPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Add goal"}</button>
        <button type="button" className={s.actionSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        {error && <span className={s.errorText}>{error}</span>}
      </div>
    </div>
  )
}

// --- Bootstrap ---

function BootstrapPanel({ onBooted }) {
  const [intent, setIntent] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = async () => {
    setBusy(true); setError(null)
    try {
      await bootstrapCurrentStint({ intent: intent.trim() || undefined })
      onBooted?.()
    } catch (e) { setError(e.message || "Failed to start stint") } finally { setBusy(false) }
  }
  return (
    <div className={s.bootstrap}>
      <div className={s.bootstrapTitle}>Start your first stint</div>
      <div className={s.bootstrapBody}>A stint is a 75-day block. Write the intent — what these days are FOR. Your goals are tracked across the window.</div>
      <div className={s.form} style={{ background: "transparent", border: "none", padding: 0, marginBottom: "1rem" }}>
        <div className={s.formGrid}>
          <div className={`${s.field} ${s.fieldWide}`}>
            <label>Intent (the prompt for the block)</label>
            <textarea value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Lock the training floor every week through the race + ship the AI webhook that's blocking demos." />
          </div>
        </div>
      </div>
      <div className={s.heroActions} style={{ justifyContent: "center" }}>
        <button type="button" className={s.actionPrimary} onClick={start} disabled={busy}>{busy ? "Starting…" : "Start the stint"}</button>
      </div>
      {error && <div className={s.errorText} style={{ marginTop: "0.6rem", textAlign: "center" }}>{error}</div>}
      <div style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-faint)" }}>
        <Link href="/dashboard/stints"><a className={s.linkSubtle}>View past stints &rarr;</a></Link>
      </div>
    </div>
  )
}

// --- After current stint ends ---

function StartNextStintPanel({ onCreated }) {
  const [intent, setIntent] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = async () => {
    setBusy(true); setError(null)
    try {
      await createStint({ intent: intent.trim() || undefined })
      onCreated?.()
    } catch (e) { setError(e.message || "Create failed") } finally { setBusy(false) }
  }
  return (
    <div className={s.bootstrap}>
      <div className={s.bootstrapTitle}>Start the next stint</div>
      <div className={s.bootstrapBody}>The last 75 just ended. Write the intent for the next block.</div>
      <div className={s.form} style={{ background: "transparent", border: "none", padding: 0, marginBottom: "1rem" }}>
        <div className={s.formGrid}>
          <div className={`${s.field} ${s.fieldWide}`}>
            <label>Intent</label>
            <textarea value={intent} onChange={(e) => setIntent(e.target.value)} />
          </div>
        </div>
      </div>
      <button type="button" className={s.actionPrimary} onClick={start} disabled={busy}>{busy ? "Starting…" : "Start the next 75"}</button>
      {error && <div className={s.errorText} style={{ marginTop: "0.6rem" }}>{error}</div>}
      <div style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-faint)" }}>
        <Link href="/dashboard/stints"><a className={s.linkSubtle}>View past stints &rarr;</a></Link>
      </div>
    </div>
  )
}

// --- Top-level ---

export default function StintBoard({ onChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [editingIntent, setEditingIntent] = useState(false)
  const today = getDateKey()

  const load = useCallback(async () => {
    const res = await getStintProgress()
    setData(res)
    setLoading(false)
    onChange?.()
  }, [onChange])

  useEffect(() => { load() }, [load])

  if (loading) return <div className={s.bootstrap}>Loading…</div>

  const stint = data?.stint || null
  const goals = data?.goals || []

  if (!stint) return <BootstrapPanel onBooted={load} />

  const stintEnded = stint.endDate && stint.endDate < today
  if (stintEnded && stint.state === "completed") {
    return <StartNextStintPanel onCreated={load} />
  }

  const visibleGoals = goals.filter((g) => g.state !== "archived")
  const activeCount = visibleGoals.filter((g) => g.state === "active").length
  const usedColors = visibleGoals.map((g) => g.color)

  return (
    <>
      {editingIntent ? (
        <IntentEditor
          stint={stint}
          onSaved={() => { setEditingIntent(false); load() }}
          onCancel={() => setEditingIntent(false)}
        />
      ) : (
        <StintHero
          stint={stint}
          today={today}
          onReview={() => setReviewing((v) => !v)}
          onEditIntent={() => setEditingIntent(true)}
          onRestart={async () => {
            if (!confirm("Restart this stint from today? The 75-day window resets to begin now.")) return
            await patchStint(stint.id, { startDate: today, endDate: addDays(today, 74) })
            load()
          }}
          onDelete={async () => {
            if (!confirm("Delete this stint? It will be archived (goals + plans stay).")) return
            await archiveStint(stint.id)
            load()
          }}
        />
      )}

      {reviewing && (
        <div className={s.reviewForm} style={{ "--stint-color": "#6366f1" }}>
          <StintReviewForm stint={stint} onSaved={() => { setReviewing(false); load() }} onCancel={() => setReviewing(false)} />
        </div>
      )}

      <section className={s.section}>
        <div className={s.sectionHead}>
          <div className={s.sectionTitle}>Goals · {activeCount} active</div>
          {!adding && <button type="button" className={s.linkSubtle} onClick={() => setAdding(true)}>+ Add</button>}
        </div>

        {adding && (
          <NewGoalForm used={usedColors} onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); load() }} />
        )}

        <div className={s.goalRowList}>
          {visibleGoals.map((g) => <GoalTrackerRow key={g.id} goal={g} onChange={load} />)}
          {visibleGoals.length === 0 && !adding && (
            <button type="button" className={s.addGoalTile} onClick={() => setAdding(true)}>+ Add your first goal</button>
          )}
        </div>
      </section>
    </>
  )
}
