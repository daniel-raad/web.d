import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"
import {
  DEFAULT_GOAL_COLORS,
  DEFAULT_GOAL_ICONS,
  GOAL_STATES,
  slugifyTitle,
  withGoalDisplayDefaults,
} from "../../../lib/stints"
import { getDateKey } from "../../../lib/dates.js"

// GET  /api/goals               → list (default: non-archived; ?archived=1 includes archived)
// POST /api/goals               → create a goal (standalone — not tied to any stint)

const ALLOWED = [
  "title", "type", "priority", "rationale", "why", "color", "icon",
  "target", "floor", "unit", "cadence", "deadline",
  "primaryPrimitive", "weeklyTargets", "leadMeasures",
  "leadMeasureTemplates", "window", "context",
  "state",
]

export default async function handler(req, res) {
  if (req.method === "GET") {
    const snap = await adminDb.collection("goals").get()
    let goals = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (req.query.archived !== "1") {
      goals = goals.filter((g) => (g.state || (g.status === "archived" ? "archived" : "active")) !== "archived")
    }
    goals.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    return res.json({
      goals: goals.map((g, i) => withGoalDisplayDefaults(g, i)),
      today: getDateKey(),
    })
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return
    const body = req.body || {}
    if (!body.title) return res.status(400).json({ error: "title is required" })

    const id = body.id || slugifyTitle(body.title)
    if (!id) return res.status(400).json({ error: "could not derive id from title" })
    const existing = await adminDb.collection("goals").doc(id).get()
    if (existing.exists) return res.status(409).json({ error: `Goal "${id}" already exists` })

    const total = (await adminDb.collection("goals").get()).size
    const doc = {
      status: "active",
      state: body.state && GOAL_STATES.includes(body.state) ? body.state : "active",
      priority: typeof body.priority === "number" ? body.priority : total + 1,
      color: body.color || DEFAULT_GOAL_COLORS[total % DEFAULT_GOAL_COLORS.length],
      icon: body.icon || DEFAULT_GOAL_ICONS[total % DEFAULT_GOAL_ICONS.length],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    for (const k of ALLOWED) if (body[k] !== undefined) doc[k] = body[k]

    await adminDb.collection("goals").doc(id).set(doc)
    const after = await adminDb.collection("goals").doc(id).get()
    return res.json({ ok: true, goal: { id, ...after.data() } })
  }

  return res.status(405).end()
}
