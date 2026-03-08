import { adminDb } from "../../lib/firebaseAdmin"
import { requireAuth } from "../../lib/authMiddleware"

export default async function handler(req, res) {
  if (req.method === "GET") {
    const snap = await adminDb.collection("habits").orderBy("order").get()
    const habits = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return res.json(habits)
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return
    const { name, emoji, order } = req.body
    const ref = await adminDb.collection("habits").add({
      name,
      emoji: emoji || "",
      order,
      active: true,
    })
    return res.json({ id: ref.id })
  }

  res.status(405).end()
}
