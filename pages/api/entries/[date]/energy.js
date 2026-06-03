import { adminDb } from "../../../../lib/firebaseAdmin"
import { requireAuth } from "../../../../lib/authMiddleware"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const user = await requireAuth(req, res)
  if (!user) return

  const { date } = req.query
  const { energy } = req.body
  const num = Number(energy)
  if (!Number.isFinite(num) || num < 1 || num > 5) {
    return res.status(400).json({ error: "energy must be a number between 1 and 5" })
  }

  const ref = adminDb.collection("habitEntries").doc(date)
  const snap = await ref.get()

  if (snap.exists) {
    await ref.update({ energy: num })
  } else {
    await ref.set({ habits: {}, moment: "", energy: num })
  }

  res.json({ ok: true })
}
