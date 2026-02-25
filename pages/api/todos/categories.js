import { adminDb } from "../../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const docRef = adminDb.collection("todoCategories").doc("config")

  if (req.method === "GET") {
    const doc = await docRef.get()
    if (!doc.exists) {
      return res.json({ categories: [] })
    }
    return res.json(doc.data())
  }

  if (req.method === "PUT") {
    const { categories } = req.body
    await docRef.set({ categories })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
