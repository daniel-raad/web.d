import { adminDb } from "../../lib/firebaseAdmin"

export default async function handler(req, res) {
  if (req.method === "GET") {
    const snap = await adminDb.collection("todos").orderBy("createdAt", "desc").get()
    const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return res.json(todos)
  }

  if (req.method === "POST") {
    const { text, category, dueDate } = req.body
    const ref = await adminDb.collection("todos").add({
      text,
      category: category || "",
      completed: false,
      createdAt: Date.now(),
      dueDate: dueDate || null,
      completedAt: null,
    })
    return res.json({ id: ref.id })
  }

  res.status(405).end()
}
