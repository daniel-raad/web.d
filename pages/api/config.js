import { adminDb } from "../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const ref = adminDb.collection("habitConfig").doc("settings")

  if (req.method === "GET") {
    const snap = await ref.get()
    if (snap.exists) return res.json(snap.data())
    return res.json({ targetDate: "2026-08-01", startDate: "2026-01-01" })
  }

  if (req.method === "POST") {
    await ref.set(req.body, { merge: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
