import { adminDb } from "../../lib/firebaseAdmin"
import { requireAuth } from "../../lib/authMiddleware"
import { DEFAULT_IRONMAN_START_DATE } from "../../components/Todos/ironmanData"

const DEFAULTS = {
  checked: {},
  startDate: DEFAULT_IRONMAN_START_DATE,
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

  if (req.method === "PUT") {
    const user = await requireAuth(req, res)
    if (!user) return
    await adminDb.collection("ironman").doc("plan").set(req.body)
    return res.json({ ok: true })
  }

  res.status(405).end()
}
