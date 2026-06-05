import { adminDb } from "../../../../lib/firebaseAdmin"
import { requireAuth } from "../../../../lib/authMiddleware"
import { GOAL_STATES, withGoalDisplayDefaults } from "../../../../lib/stints"

// GET    /api/goals/[id]    → single goal
// PATCH  /api/goals/[id]    → partial update (incl. state transitions and stintId reassign)
// DELETE /api/goals/[id]    → archive (?hard=1 hard delete)

const ALLOWED = [
  "title", "type", "priority", "rationale", "why", "color", "icon",
  "target", "floor", "unit", "cadence", "deadline",
  "primaryPrimitive", "weeklyTargets", "leadMeasures",
  "leadMeasureTemplates", "window", "context",
  "state", "stintId", "completion",
]

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: "id required" })

  if (req.method === "GET") {
    const snap = await adminDb.collection("goals").doc(id).get()
    if (!snap.exists) return res.status(404).json({ error: "Goal not found" })
    return res.json({ goal: withGoalDisplayDefaults({ id: snap.id, ...snap.data() }, 0) })
  }

  if (req.method === "PATCH") {
    const user = await requireAuth(req, res)
    if (!user) return
    const ref = adminDb.collection("goals").doc(id)
    const before = await ref.get()
    if (!before.exists) return res.status(404).json({ error: "Goal not found" })
    const existing = before.data()

    const body = req.body || {}
    const patch = {}
    for (const k of ALLOWED) if (body[k] !== undefined) patch[k] = body[k]
    if (patch.state && !GOAL_STATES.includes(patch.state)) {
      return res.status(400).json({ error: `invalid state. allowed: ${GOAL_STATES.join(", ")}` })
    }

    // If flipping to completed and no completion payload, stamp one.
    if (patch.state === "completed" && existing.state !== "completed") {
      patch.completion = {
        completedAt: Date.now(),
        reflection: (body.completion && body.completion.reflection) || "",
        ...(patch.completion || {}),
      }
    }

    patch.updatedAt = Date.now()
    await ref.set(patch, { merge: true })
    const after = await ref.get()
    return res.json({ ok: true, goal: withGoalDisplayDefaults({ id, ...after.data() }, 0) })
  }

  if (req.method === "DELETE") {
    const user = await requireAuth(req, res)
    if (!user) return
    const ref = adminDb.collection("goals").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: "Goal not found" })
    if (req.query.hard === "1") {
      await ref.delete()
      return res.json({ ok: true, action: "hard-deleted", id })
    }
    await ref.set({ state: "archived", status: "archived", updatedAt: Date.now() }, { merge: true })
    return res.json({ ok: true, action: "archived", id })
  }

  return res.status(405).end()
}
