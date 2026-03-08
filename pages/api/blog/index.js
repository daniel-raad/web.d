import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"

export default async function handler(req, res) {
  if (req.method === "POST") {
    const user = await requireAuth(req, res)
    if (!user) return

    const { title, excerpt, content, tags, type, hidden } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" })
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Check slug uniqueness
    const existing = await adminDb.collection("blogPosts").where("slug", "==", slug).limit(1).get()
    if (!existing.empty) {
      return res.status(409).json({ error: "A post with this slug already exists" })
    }

    const ref = await adminDb.collection("blogPosts").add({
      title,
      slug,
      excerpt: excerpt || "",
      content,
      tags: tags || [],
      type: type || "daily",
      hidden: hidden || false,
      date: new Date().toISOString().split("T")[0],
      source: "firestore",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return res.json({ id: ref.id, slug })
  }

  res.status(405).end()
}
