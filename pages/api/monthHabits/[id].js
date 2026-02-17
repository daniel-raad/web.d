import { adminDb } from "../../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const { id, year, month } = req.query

  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" })
  }

  const docId = `${year}-${String(month).padStart(2, "0")}`

  if (req.method === "PUT") {
    const doc = await adminDb.collection("monthHabits").doc(docId).get()
    if (!doc.exists) return res.status(404).json({ error: "month not found" })
    const habits = (doc.data().habits || []).map((h) =>
      h.id === id ? { ...h, ...req.body } : h
    )
    await adminDb.collection("monthHabits").doc(docId).set({ habits })
    return res.json({ ok: true })
  }

  if (req.method === "DELETE") {
    const doc = await adminDb.collection("monthHabits").doc(docId).get()
    if (!doc.exists) return res.status(404).json({ error: "month not found" })
    const habits = (doc.data().habits || []).filter((h) => h.id !== id)
    await adminDb.collection("monthHabits").doc(docId).set({ habits })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
