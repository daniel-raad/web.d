import { useState } from "react"
import { patchStint } from "../../lib/firestore"
import s from "../../styles/Stint.module.css"

const RATINGS = [1, 2, 3, 4, 5]

// Top-level review form for a stint. The stint id is passed via `stint.id`.
export default function StintReviewForm({ stint, onSaved, onCancel }) {
  const existing = stint.review || {}
  const [rating, setRating] = useState(existing.rating ?? null)
  const [wins, setWins] = useState(existing.wins || "")
  const [misses, setMisses] = useState(existing.misses || "")
  const [nextFocus, setNextFocus] = useState(existing.nextFocus || "")
  const [body, setBody] = useState(existing.body || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true); setError(null)
    try {
      await patchStint(stint.id, { review: { rating, wins, misses, nextFocus, body } })
      onSaved?.()
    } catch (e) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className={s.sectionTitle} style={{ marginBottom: "1rem" }}>
        Stint {stint.index} review · {stint.startDate} → {stint.endDate}
      </div>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label>Rating (1-5)</label>
          <div className={s.ratingRow}>
            {RATINGS.map((n) => (
              <button
                key={n}
                type="button"
                className={`${s.ratingBtn} ${rating === n ? s.ratingBtnActive : ""}`}
                onClick={() => setRating(rating === n ? null : n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Wins (what worked)</label>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Misses (what slipped)</label>
          <textarea value={misses} onChange={(e) => setMisses(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>The one shift for next stint</label>
          <input value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.fieldWide}`}>
          <label>Long-form (optional)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="The honest read on the block. What you'd tell yourself if you could start the next one fresh." style={{ minHeight: 120 }} />
        </div>
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.actionPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save review"}</button>
        <button type="button" className={s.actionSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        {error && <span className={s.errorText}>{error}</span>}
      </div>
    </div>
  )
}
