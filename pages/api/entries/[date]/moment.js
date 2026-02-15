import { adminDb } from "../../../../lib/firebaseAdmin"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { date } = req.query
  const { text } = req.body
  const ref = adminDb.collection("habitEntries").doc(date)
  const snap = await ref.get()

  if (snap.exists) {
    await ref.update({ moment: text })
  } else {
    await ref.set({ habits: {}, moment: text })
  }

  res.json({ ok: true })
}
