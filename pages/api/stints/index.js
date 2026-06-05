import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"
import {
  computeStintEnd,
  DEFAULT_STINT_DAYS,
  loadAllStints,
  nextStintIndex,
  STINT_STATES,
} from "../../../lib/stints"
import { getDateKey } from "../../../lib/dates.js"

// GET  /api/stints       → list of stints with embedded goal IDs counts
// POST /api/stints       → create a new stint (default starts day after the
//                          latest stint ends, or today)

const ALLOWED = ["title", "intent", "state", "startDate", "endDate"]

export default async function handler(req, res) {
  if (req.method === "GET") {
    const stints = await loadAllStints()
    // Attach goal-count per stint in one extra query so the listing is cheap.
    const goalsSnap = await adminDb.collection("goals").get()
    const goalsByStint = new Map()
    for (const d of goalsSnap.docs) {
      const data = d.data()
      const sid = data.stintId
      if (!sid) continue
      goalsByStint.set(sid, (goalsByStint.get(sid) || 0) + 1)
    }
    return res.json({
      stints: stints.map((s) => ({ ...s, goalCount: goalsByStint.get(s.id) || 0 })),
      today: getDateKey(),
    })
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return
    const body = req.body || {}

    const today = getDateKey()
    const lengthDays = Number(body.lengthDays) || DEFAULT_STINT_DAYS

    let startDate = body.startDate
    if (!startDate) {
      // Default: day after the latest existing stint's endDate; else today.
      const all = await loadAllStints()
      const latestEnd = all.map((s) => s.endDate).filter(Boolean).sort().at(-1)
      startDate = latestEnd ? computeStintEnd(latestEnd, 2) : today
      // ^ computeStintEnd with length=2 returns startDate+1 day. Quick math
      // that avoids importing addDaysToDateKey separately.
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: "startDate must be YYYY-MM-DD" })
    }

    const endDate = body.endDate || computeStintEnd(startDate, lengthDays)
    const index = await nextStintIndex()
    const stintId = body.id || `stint-${index}`

    const state = body.state && STINT_STATES.includes(body.state)
      ? body.state
      : (startDate <= today && today <= endDate ? "active" : startDate > today ? "planning" : "completed")

    const doc = {
      index,
      title: body.title || `Stint ${index}`,
      intent: body.intent || "",
      startDate,
      endDate,
      state,
      review: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    for (const k of ALLOWED) if (body[k] !== undefined) doc[k] = body[k]

    await adminDb.collection("stints").doc(stintId).set(doc)
    return res.json({ ok: true, id: stintId, stint: { id: stintId, ...doc } })
  }

  return res.status(405).end()
}
