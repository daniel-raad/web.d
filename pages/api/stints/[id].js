import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"
import {
  computeStintEnd,
  hitsForGoalInWindow,
  loadActiveGoals,
  STINT_STATES,
  withGoalDisplayDefaults,
  buildDates,
} from "../../../lib/stints"
import { getDateKey } from "../../../lib/dates.js"

// GET    /api/stints/[id]   → single stint with embedded goals + per-goal hits in window
// PATCH  /api/stints/[id]   → edit dates / title / intent / state / review
// DELETE /api/stints/[id]   → archive (?hard=1 hard delete)

const EDITABLE = ["title", "intent", "state", "startDate", "endDate"]

async function loadOne(id) {
  const snap = await adminDb.collection("stints").doc(id).get()
  if (!snap.exists) return null
  const stint = { id: snap.id, ...snap.data() }
  const goals = (await loadActiveGoals()).map((g, i) => withGoalDisplayDefaults(g, i))
  const dates = buildDates(stint.startDate, stint.endDate)
  const instSnap = await adminDb.collection("instances")
    .where("date", ">=", stint.startDate)
    .where("date", "<=", stint.endDate)
    .get()
  const instances = instSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const today = getDateKey()
  const enrichedGoals = goals.map((g) => {
    const hits = hitsForGoalInWindow(g, instances, dates)
    const upToToday = hits.filter((h) => h.date <= today)
    const hitsCount = upToToday.filter((h) => h.hit).length
    const hitRate = upToToday.length > 0 ? hitsCount / upToToday.length : 0
    return { ...g, hits, hitsCount, hitRate, daysElapsed: upToToday.length, daysTotal: dates.length }
  })

  return { ...stint, goals: enrichedGoals, dates }
}

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: "id required" })

  if (req.method === "GET") {
    const stint = await loadOne(id)
    if (!stint) return res.status(404).json({ error: "Stint not found" })
    return res.json({ stint, today: getDateKey() })
  }

  if (req.method === "PATCH") {
    const user = await requireAuth(req, res)
    if (!user) return
    const ref = adminDb.collection("stints").doc(id)
    const before = await ref.get()
    if (!before.exists) return res.status(404).json({ error: "Stint not found" })

    const body = req.body || {}
    const patch = {}
    for (const k of EDITABLE) if (body[k] !== undefined) patch[k] = body[k]
    if (patch.state && !STINT_STATES.includes(patch.state)) {
      return res.status(400).json({ error: `invalid state. allowed: ${STINT_STATES.join(", ")}` })
    }

    // length-driven endDate recompute when only lengthDays is provided
    if (body.lengthDays && !body.endDate) {
      const start = body.startDate || before.data().startDate
      patch.endDate = computeStintEnd(start, body.lengthDays)
    }

    // Review write
    if ("review" in body) {
      if (body.review === null) {
        patch.review = null
      } else {
        patch.review = {
          rating: body.review.rating ?? null,
          wins: body.review.wins || "",
          misses: body.review.misses || "",
          nextFocus: body.review.nextFocus || "",
          body: body.review.body || "",
          completedAt: Date.now(),
        }
        if (patch.state === undefined) patch.state = "completed"
      }
    }

    patch.updatedAt = Date.now()
    await ref.set(patch, { merge: true })
    const after = await loadOne(id)
    return res.json({ ok: true, stint: after })
  }

  if (req.method === "DELETE") {
    const user = await requireAuth(req, res)
    if (!user) return
    const ref = adminDb.collection("stints").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: "Stint not found" })
    if (req.query.hard === "1") {
      await ref.delete()
      return res.json({ ok: true, action: "hard-deleted", id })
    }
    await ref.set({ state: "archived", updatedAt: Date.now() }, { merge: true })
    return res.json({ ok: true, action: "archived", id })
  }

  return res.status(405).end()
}
