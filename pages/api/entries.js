import { adminDb } from "../../lib/firebaseAdmin"

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { year, month } = req.query
    const prefix = `${year}-${String(month).padStart(2, "0")}`
    const snap = await adminDb.collection("habitEntries").get()
    const entries = {}
    snap.docs.forEach((d) => {
      if (d.id.startsWith(prefix)) {
        entries[d.id] = d.data()
      }
    })
    return res.json(entries)
  }

  res.status(405).end()
}
