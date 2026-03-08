import { adminDb } from "../../lib/firebaseAdmin"
import { requireAuth } from "../../lib/authMiddleware"

const DEFAULTS = {
  checked: {},
  startDate: "2026-03-08",
  dayOrders: {},
  sessionMoves: {},
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const doc = await adminDb.collection("ironman").doc("plan").get()
    return res.json(doc.exists ? doc.data() : DEFAULTS)
  }

  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return
    await adminDb.collection("ironman").doc("plan").set(req.body, { merge: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
