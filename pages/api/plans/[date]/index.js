import { adminDb } from "../../../../lib/firebaseAdmin"
import { requireAuth } from "../../../../lib/authMiddleware"

// GET  /api/plans/[date]        → returns plan with items enriched by template metadata
// POST /api/plans/[date]        → { itemIndex, status }            updates one item's status
//                                  { itemIndex, patch: {...} }      surgical edit of any item fields
//                                  Both require auth.

const VALID_STATUSES = new Set(["planned", "done", "partial", "skipped"])
const ALLOWED_PATCH_FIELDS = ["floor", "target", "rationale", "timeSlot", "templateId", "status"]

async function enrichPlan(planData) {
  if (!planData || !Array.isArray(planData.items)) return planData
  const templatesSnap = await adminDb.collection("taskTemplates").get()
  const byId = new Map(templatesSnap.docs.map((d) => [d.id, d.data()]))

  // Pull the linked instance for each item so the UI can show what was
  // actually logged (values vs floor/target). Bounded parallelism via
  // Promise.all — plans have ~5 items so this is fine.
  const items = await Promise.all(
    planData.items.map(async (item) => {
      const tpl = byId.get(item.templateId) || {}
      let loggedInstance = null
      if (item.linkedInstanceId) {
        const instSnap = await adminDb
          .collection("instances")
          .doc(item.linkedInstanceId)
          .get()
        if (instSnap.exists) {
          const d = instSnap.data()
          loggedInstance = {
            id: instSnap.id,
            values: d.values || {},
            note: d.note || "",
            timestamp: d.timestamp || null,
          }
        }
      }
      return {
        ...item,
        label: tpl.label || item.templateId,
        emoji: tpl.emoji || "",
        primitives: tpl.primitives || [],
        quantityUnit: tpl.quantityUnit || null,
        loggedInstance,
      }
    })
  )
  return { ...planData, items }
}

export default async function handler(req, res) {
  const { date } = req.query
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" })
  }

  if (req.method === "GET") {
    const doc = await adminDb.collection("plans").doc(date).get()
    if (!doc.exists) return res.json({ date, plan: null, exists: false })
    const plan = await enrichPlan(doc.data())
    return res.json({ date, plan, exists: true })
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return

    const { itemIndex, status, patch } = req.body
    if (!Number.isInteger(itemIndex) || itemIndex < 0) {
      return res.status(400).json({ error: "itemIndex must be a non-negative integer" })
    }

    // Build the effective patch — accept either the legacy { status } shorthand
    // or the general { patch: {...} } form.
    const effectivePatch = patch && typeof patch === "object" ? { ...patch } : {}
    if (status !== undefined && effectivePatch.status === undefined) {
      effectivePatch.status = status
    }
    if (Object.keys(effectivePatch).length === 0) {
      return res.status(400).json({ error: "must provide either status or patch" })
    }

    const unknownKeys = Object.keys(effectivePatch).filter((k) => !ALLOWED_PATCH_FIELDS.includes(k))
    if (unknownKeys.length > 0) {
      return res.status(400).json({
        error: `unknown patch field(s): ${unknownKeys.join(", ")}. Allowed: ${ALLOWED_PATCH_FIELDS.join(", ")}`,
      })
    }
    if (effectivePatch.status !== undefined && !VALID_STATUSES.has(effectivePatch.status)) {
      return res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` })
    }

    const ref = adminDb.collection("plans").doc(date)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: "No plan for that date" })

    const data = snap.data()
    const items = Array.isArray(data.items) ? [...data.items] : []
    if (itemIndex >= items.length) {
      return res.status(400).json({ error: `itemIndex ${itemIndex} out of range (have ${items.length})` })
    }

    // If templateId changes, re-denormalize goalId from the new template.
    if (effectivePatch.templateId !== undefined) {
      const tplSnap = await adminDb.collection("taskTemplates").doc(effectivePatch.templateId).get()
      if (!tplSnap.exists) {
        return res.status(400).json({
          error: `unknown templateId '${effectivePatch.templateId}'`,
        })
      }
      effectivePatch.goalId = tplSnap.data().goalId || null
    }

    const next = { ...items[itemIndex], ...effectivePatch }
    if (effectivePatch.status !== undefined) next.statusUpdatedAt = Date.now()
    items[itemIndex] = next
    await ref.update({ items })
    return res.json({ ok: true, itemIndex, patched: Object.keys(effectivePatch) })
  }

  res.status(405).end()
}
