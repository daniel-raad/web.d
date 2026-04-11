import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  const { id } = req.query

  if (req.method === "PUT") {
    const updates = { ...req.body }
    if (updates.completed === true) updates.completedAt = Date.now()
    if (updates.completed === false) updates.completedAt = null

    await adminDb.collection("todos").doc(id).update(updates)
    return res.json({ ok: true })
  }

  if (req.method === "DELETE") {
    await adminDb.collection("todos").doc(id).delete()
    return res.json({ ok: true })
  }

  res.status(405).end()
}
