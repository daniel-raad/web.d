import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"
import {
  computeStintEnd,
  DEFAULT_STINT_DAYS,
  getCurrentStint,
  nextStintIndex,
} from "../../../lib/stints"
import { getDateKey } from "../../../lib/dates.js"

// GET  /api/stints/current     → the active stint (no goals — goals are separate via /api/progress/stint)
// POST /api/stints/current     → bootstrap: create a stint starting today if none exists

export default async function handler(req, res) {
  const today = getDateKey()

  if (req.method === "GET") {
    const stint = await getCurrentStint(today)
    return res.json({ stint, today })
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return
    const body = req.body || {}

    const existing = await getCurrentStint(today)
    if (existing) {
      return res.status(409).json({ error: "An active stint already exists", stintId: existing.id })
    }

    const lengthDays = Number(body.lengthDays) || DEFAULT_STINT_DAYS
    const startDate = body.startDate || today
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: "startDate must be YYYY-MM-DD" })
    }
    const endDate = body.endDate || computeStintEnd(startDate, lengthDays)
    const index = await nextStintIndex()
    const stintId = `stint-${index}`

    await adminDb.collection("stints").doc(stintId).set({
      index,
      title: body.title || `Stint ${index}`,
      intent: body.intent || "",
      startDate,
      endDate,
      state: "active",
      review: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return res.json({ ok: true, id: stintId })
  }

  return res.status(405).end()
}
