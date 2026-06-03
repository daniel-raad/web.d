import { useState, useCallback } from "react"
import {
  updatePlanItemStatus,
  updatePlanItem,
  logInstance,
  generatePlan,
  getPlan,
} from "../../lib/firestore"
import { colorForTemplate } from "../../lib/goalColors"
import styles from "../../styles/Dashboard.module.css"

const STATUS_OPTIONS = [
  { value: "done", label: "Done" },
  { value: "partial", label: "Partial" },
  { value: "skipped", label: "Skip" },
]

const INTENSITY_VALUES = [1, 2, 3, 4, 5]

function unitFor(primitiveKey, quantityUnit) {
  if (primitiveKey === "duration") return "min"
  if (primitiveKey === "quantity") return quantityUnit || ""
  return ""
}

function formatPrimitiveValue(key, value, quantityUnit) {
  if (value == null) return null
  const unit = unitFor(key, quantityUnit)
  return unit ? `${value} ${unit}` : `${value}`
}

function formatLoggedValues(values, quantityUnit) {
  if (!values || typeof values !== "object") return null
  const parts = []
  if (values.duration != null) parts.push(`${values.duration} min`)
  if (values.quantity != null) {
    parts.push(`${values.quantity}${quantityUnit ? ` ${quantityUnit}` : ""}`)
  }
  if (values.intensity != null) parts.push(`intensity ${values.intensity}`)
  if (values.description) {
    const d = String(values.description)
    parts.push(`"${d.length > 60 ? d.slice(0, 57) + "…" : d}"`)
  }
  if (values.outcome) {
    const o = String(values.outcome)
    parts.push(`outcome: ${o.length > 60 ? o.slice(0, 57) + "…" : o}`)
  }
  return parts.join(" · ")
}

function formatFloorTarget(floor, target, quantityUnit) {
  const keys = Array.from(
    new Set([...Object.keys(floor || {}), ...Object.keys(target || {})])
  )
  return keys
    .map((k) => {
      const f = formatPrimitiveValue(k, floor?.[k], quantityUnit)
      const t = formatPrimitiveValue(k, target?.[k], quantityUnit)
      if (f && t && floor[k] !== target[k]) return `${f} → ${t}`
      if (f) return `${f} floor`
      if (t) return `→ ${t}`
      return null
    })
    .filter(Boolean)
    .join(" · ")
}

// --- Log form -------------------------------------------------------------

function LogForm({ item, date, itemIndex, onSaved, onClose }) {
  const primitives = item.primitives || []
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Drop empties so we don't write `{ duration: "" }` etc.
      const clean = {}
      for (const [k, v] of Object.entries(values)) {
        if (v === "" || v == null) continue
        if (["duration", "quantity", "intensity"].includes(k)) {
          const n = Number(v)
          if (!Number.isFinite(n)) continue
          clean[k] = n
        } else {
          clean[k] = v
        }
      }
      await logInstance({
        date,
        templateId: item.templateId,
        values: clean,
        linkedPlanItem: { date, itemIndex, status: "done" },
      })
      if (onSaved) onSaved()
    } catch (e) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.planLogForm}>
      <div className={styles.planLogFormGrid}>
        {primitives.map((p) => {
          if (p === "intensity") {
            return (
              <div key={p} className={styles.planLogField}>
                <label>Intensity</label>
                <div className={styles.hubEnergyPills}>
                  {INTENSITY_VALUES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.hubEnergyPill} ${values.intensity === n ? styles.hubEnergyPillActive : ""}`}
                      onClick={() => setValues((v) => ({ ...v, intensity: v.intensity === n ? null : n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          if (p === "duration" || p === "quantity") {
            const unit = unitFor(p, item.quantityUnit)
            return (
              <div key={p} className={styles.planLogField}>
                <label>{p === "duration" ? "Duration" : "Quantity"}{unit ? ` (${unit})` : ""}</label>
                <input
                  type="number"
                  step={p === "duration" ? "1" : "any"}
                  min="0"
                  value={values[p] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
                  placeholder=""
                />
              </div>
            )
          }
          if (p === "description" || p === "outcome") {
            return (
              <div key={p} className={`${styles.planLogField} ${styles.planLogFieldWide}`}>
                <label>{p === "description" ? "Description" : "Outcome"}</label>
                <textarea
                  rows={2}
                  value={values[p] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
                  placeholder=""
                />
              </div>
            )
          }
          return null
        })}
      </div>
      <div className={styles.planFormActions}>
        <button type="button" className={styles.planFormSave} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Log"}
        </button>
        <button type="button" className={styles.planFormCancel} onClick={onClose} disabled={saving}>
          Close
        </button>
        {error && <span className={styles.planGenerateError}>{error}</span>}
      </div>
    </div>
  )
}

// --- Edit form ------------------------------------------------------------

function EditForm({ item, date, itemIndex, onSaved, onClose }) {
  const primitives = item.primitives || []
  const showQuantity = primitives.includes("quantity")
  const showDuration = primitives.includes("duration")

  const [floorDuration, setFloorDuration] = useState(item.floor?.duration ?? "")
  const [targetDuration, setTargetDuration] = useState(item.target?.duration ?? "")
  const [floorQuantity, setFloorQuantity] = useState(item.floor?.quantity ?? "")
  const [targetQuantity, setTargetQuantity] = useState(item.target?.quantity ?? "")
  const [rationale, setRationale] = useState(item.rationale ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const floor = {}
      const target = {}
      const num = (v) => {
        if (v === "" || v == null) return undefined
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
      }
      if (showDuration) {
        const f = num(floorDuration)
        const t = num(targetDuration)
        if (f !== undefined) floor.duration = f
        if (t !== undefined) target.duration = t
      }
      if (showQuantity) {
        const f = num(floorQuantity)
        const t = num(targetQuantity)
        if (f !== undefined) floor.quantity = f
        if (t !== undefined) target.quantity = t
      }
      const patch = { rationale }
      if (Object.keys(floor).length > 0) patch.floor = floor
      if (Object.keys(target).length > 0) patch.target = target
      await updatePlanItem(date, itemIndex, patch)
      if (onSaved) onSaved()
    } catch (e) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.planLogForm}>
      <div className={styles.planLogFormGrid}>
        {showDuration && (
          <>
            <div className={styles.planLogField}>
              <label>Floor duration (min)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={floorDuration}
                onChange={(e) => setFloorDuration(e.target.value)}
              />
            </div>
            <div className={styles.planLogField}>
              <label>Target duration (min)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value)}
              />
            </div>
          </>
        )}
        {showQuantity && (
          <>
            <div className={styles.planLogField}>
              <label>Floor {item.quantityUnit || "qty"}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={floorQuantity}
                onChange={(e) => setFloorQuantity(e.target.value)}
              />
            </div>
            <div className={styles.planLogField}>
              <label>Target {item.quantityUnit || "qty"}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
              />
            </div>
          </>
        )}
        <div className={`${styles.planLogField} ${styles.planLogFieldWide}`}>
          <label>Rationale</label>
          <textarea
            rows={2}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.planFormActions}>
        <button type="button" className={styles.planFormSave} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className={styles.planFormCancel} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        {error && <span className={styles.planGenerateError}>{error}</span>}
      </div>
    </div>
  )
}

// --- Main PlanSection -----------------------------------------------------

export default function PlanSection({ date, initialPlan, onChange }) {
  const [plan, setPlan] = useState(initialPlan)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [expanded, setExpanded] = useState(null) // { idx, mode: "log" | "edit" }

  const refreshPlan = useCallback(async () => {
    const res = await getPlan(date)
    setPlan(res?.exists ? res.plan : null)
  }, [date])

  const handleStatusClick = useCallback(
    async (itemIndex, status) => {
      const current = plan?.items?.[itemIndex]?.status

      if (status === "done") {
        // Done click — always flip to done and open the log form.
        // If already done with form open, close the form (no status change).
        if (current === "done" && expanded?.idx === itemIndex && expanded?.mode === "log") {
          setExpanded(null)
          return
        }
        setPlan((prev) => {
          if (!prev) return prev
          const items = [...prev.items]
          items[itemIndex] = { ...items[itemIndex], status: "done" }
          return { ...prev, items }
        })
        setExpanded({ idx: itemIndex, mode: "log" })
        await updatePlanItemStatus(date, itemIndex, "done")
        if (onChange) onChange()
        return
      }

      // Partial / Skip — toggle off if active, otherwise set.
      const nextStatus = current === status ? "planned" : status
      setPlan((prev) => {
        if (!prev) return prev
        const items = [...prev.items]
        items[itemIndex] = { ...items[itemIndex], status: nextStatus }
        return { ...prev, items }
      })
      if (expanded?.idx === itemIndex) setExpanded(null)
      await updatePlanItemStatus(date, itemIndex, nextStatus)
      if (onChange) onChange()
    },
    [plan, expanded, date, onChange]
  )

  const handleEditClick = useCallback(
    (itemIndex) => {
      setExpanded((prev) => {
        if (prev?.idx === itemIndex && prev?.mode === "edit") return null
        return { idx: itemIndex, mode: "edit" }
      })
    },
    []
  )

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      await generatePlan(date)
      await refreshPlan()
      if (onChange) onChange()
    } catch (err) {
      setGenerateError(err.message || "Failed to generate plan")
    } finally {
      setGenerating(false)
    }
  }, [date, refreshPlan, onChange])

  if (!plan) {
    return (
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionTitle}>Today&apos;s plan</span>
        </div>
        <div className={styles.hubEmpty}>
          No plan written yet. Tonight&apos;s 9pm check-in writes tomorrow&apos;s — or
          generate one now.
        </div>
        <div className={styles.planGenerateRow}>
          <button
            type="button"
            className={styles.planGenerateBtn}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate plan"}
          </button>
          {generateError && (
            <span className={styles.planGenerateError}>{generateError}</span>
          )}
        </div>
      </section>
    )
  }

  const items = plan.items || []
  const doneCount = items.filter((i) => i.status === "done").length

  return (
    <section className={styles.hubSection}>
      <div className={styles.hubSectionHeader}>
        <span className={styles.hubSectionTitle}>
          Today&apos;s plan
          <span className={styles.hubSectionCount}>
            {doneCount}/{items.length}
          </span>
        </span>
        {plan.energyBasis?.value != null && (
          <span className={styles.planEnergyBasis}>
            energy {plan.energyBasis.value}
            {plan.energyBasis.source ? ` · ${plan.energyBasis.source}` : ""}
          </span>
        )}
      </div>

      {plan.notes && <div className={styles.planNotes}>{plan.notes}</div>}

      <div className={styles.planItemList}>
        {items.map((item, idx) => {
          const status = item.status || "planned"
          const isDone = status === "done"
          const isSkipped = status === "skipped"
          const range = formatFloorTarget(item.floor, item.target, item.quantityUnit)
          const isExpanded = expanded?.idx === idx
          const mode = isExpanded ? expanded.mode : null
          const accent = colorForTemplate(item.templateId)
          return (
            <div
              key={`${item.templateId}-${idx}`}
              className={`${styles.planItem} ${isDone ? styles.planItemDone : ""} ${isSkipped ? styles.planItemSkipped : ""}`}
              style={{ borderLeft: `3px solid ${accent}` }}
            >
              <div className={styles.planItemHeader}>
                <div className={styles.planItemTitle}>
                  {item.emoji && (
                    <span className={styles.planItemEmoji}>{item.emoji}</span>
                  )}
                  <span className={styles.planItemLabel}>
                    {item.label || item.templateId}
                  </span>
                  {range && <span className={styles.planItemRange}>{range}</span>}
                </div>
                <div className={styles.planItemStatusBtns}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`${styles.planStatusBtn} ${status === s.value ? styles.planStatusBtnActive : ""}`}
                      onClick={() => handleStatusClick(idx, s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.planStatusBtn} ${mode === "edit" ? styles.planStatusBtnActive : ""}`}
                    onClick={() => handleEditClick(idx)}
                    title="Edit item"
                    aria-label="Edit item"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {item.rationale && (
                <div className={styles.planItemRationale}>{item.rationale}</div>
              )}
              {item.timeSlot && (
                <div className={styles.planItemTimeSlot}>{item.timeSlot}</div>
              )}
              {item.loggedInstance && (
                <div className={styles.planItemLogged}>
                  <span className={styles.planItemLoggedTag}>logged</span>
                  {formatLoggedValues(item.loggedInstance.values, item.quantityUnit) || "(no values captured)"}
                </div>
              )}
              {isExpanded && mode === "log" && (
                <LogForm
                  item={item}
                  date={date}
                  itemIndex={idx}
                  onSaved={() => {
                    setExpanded(null)
                    refreshPlan()
                    if (onChange) onChange()
                  }}
                  onClose={() => setExpanded(null)}
                />
              )}
              {isExpanded && mode === "edit" && (
                <EditForm
                  item={item}
                  date={date}
                  itemIndex={idx}
                  onSaved={() => {
                    setExpanded(null)
                    refreshPlan()
                    if (onChange) onChange()
                  }}
                  onClose={() => setExpanded(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
