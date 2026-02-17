import { adminDb } from "../../lib/firebaseAdmin"

const EMPTY_ROUTINE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const doc = await adminDb.collection("weeklyRoutine").doc("default").get()
    return res.json(doc.exists ? doc.data() : EMPTY_ROUTINE)
  }

  if (req.method === "POST") {
    await adminDb.collection("weeklyRoutine").doc("default").set(req.body)
    return res.json({ ok: true })
  }

  res.status(405).end()
}
