import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"

// POST /api/instances    → { date, templateId, values, note?, linkedPlanItem? }
//                          creates a structured instance, optionally flips a
//                          plan item's status in the same call.
// GET  /api/instances    → ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&templateId=&goalId=
//                          returns instances in range, filtered.

export default async function handler(req, res) {
  if (req.method === "GET") {
    const startDate = req.query.startDate
    const endDate = req.query.endDate || startDate
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "")) {
      return res.status(400).json({ error: "startDate is required (YYYY-MM-DD)" })
    }
    let q = adminDb
      .collection("instances")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
    const snap = await q.get()
    let instances = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (req.query.templateId) {
      instances = instances.filter((i) => i.templateId === req.query.templateId)
    }
    if (req.query.goalId) {
      instances = instances.filter((i) => i.goalId === req.query.goalId)
    }
    instances.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return res.json({ count: instances.length, instances })
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return

    const { date, templateId, values, note, linkedPlanItem } = req.body
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" })
    }
    if (!templateId) return res.status(400).json({ error: "templateId is required" })

    const tplSnap = await adminDb.collection("taskTemplates").doc(templateId).get()
    if (!tplSnap.exists) {
      return res.status(400).json({ error: `unknown templateId '${templateId}'` })
    }
    const tpl = tplSnap.data()

    const instance = {
      date,
      templateId,
      goalId: tpl.goalId || null,
      values: values && typeof values === "object" ? values : {},
      note: note || "",
      timestamp: Date.now(),
      source: "dashboard",
      grade: null,
    }
    const ref = await adminDb.collection("instances").add(instance)

    if (linkedPlanItem) {
      const { date: planDate, itemIndex, status } = linkedPlanItem
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(planDate || "") &&
        Number.isInteger(itemIndex) &&
        itemIndex >= 0 &&
        ["planned", "done", "partial", "skipped"].includes(status)
      ) {
        const planRef = adminDb.collection("plans").doc(planDate)
        const planSnap = await planRef.get()
        if (planSnap.exists) {
          const data = planSnap.data()
          const items = Array.isArray(data.items) ? [...data.items] : []
          if (itemIndex < items.length) {
            items[itemIndex] = {
              ...items[itemIndex],
              status,
              statusUpdatedAt: Date.now(),
              linkedInstanceId: ref.id,
            }
            await planRef.update({ items })
          }
        }
      }
    }

    return res.json({ ok: true, id: ref.id, date, templateId, goalId: instance.goalId })
  }

  res.status(405).end()
}
