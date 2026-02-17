import { adminDb } from "../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const { year, month } = req.query

  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" })
  }

  const docId = `${year}-${String(month).padStart(2, "0")}`

  if (req.method === "GET") {
    const doc = await adminDb.collection("monthHabits").doc(docId).get()
    if (doc.exists) {
      return res.json(doc.data().habits || [])
    }

    // Walk back up to 12 months to find previous habits
    let y = parseInt(year)
    let m = parseInt(month)
    for (let i = 0; i < 12; i++) {
      m--
      if (m < 1) { m = 12; y-- }
      const prevId = `${y}-${String(m).padStart(2, "0")}`
      const prevDoc = await adminDb.collection("monthHabits").doc(prevId).get()
      if (prevDoc.exists) {
        const habits = prevDoc.data().habits || []
        // Save copy for this month
        await adminDb.collection("monthHabits").doc(docId).set({ habits })
        return res.json(habits)
      }
    }

    // Fall back to global habits collection
    const snap = await adminDb.collection("habits").orderBy("order").get()
    const habits = snap.docs.map((d) => ({ id: d.id, name: d.data().name, emoji: d.data().emoji || "", order: d.data().order }))
    await adminDb.collection("monthHabits").doc(docId).set({ habits })
    return res.json(habits)
  }

  if (req.method === "POST") {
    const { name, emoji, order } = req.body
    const doc = await adminDb.collection("monthHabits").doc(docId).get()
    const habits = doc.exists ? (doc.data().habits || []) : []
    const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    habits.push({ id, name, emoji: emoji || "", order: order ?? habits.length })
    await adminDb.collection("monthHabits").doc(docId).set({ habits })
    return res.json({ id })
  }

  res.status(405).end()
}
