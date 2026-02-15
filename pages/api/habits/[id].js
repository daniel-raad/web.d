import { adminDb } from "../../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === "PUT") {
    await adminDb.collection("habits").doc(id).update(req.body)
    return res.json({ ok: true })
  }

  if (req.method === "DELETE") {
    await adminDb.collection("habits").doc(id).delete()
    return res.json({ ok: true })
  }

  res.status(405).end()
}
