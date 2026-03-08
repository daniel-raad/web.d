import { adminDb } from "../../../lib/firebaseAdmin"
import { requireAuth } from "../../../lib/authMiddleware"

async function findPostBySlug(slug) {
  const snap = await adminDb.collection("blogPosts").where("slug", "==", slug).limit(1).get()
  if (!snap.empty) return snap.docs[0]

  const doc = await adminDb.collection("blogPosts").doc(slug).get()
  if (doc.exists) return doc

  return null
}

export default async function handler(req, res) {
  const { slug } = req.query

  if (req.method === "GET") {
    const doc = await findPostBySlug(slug)
    if (!doc) return res.status(404).json({ error: "Post not found" })
    return res.json({ id: doc.id, ...doc.data() })
  }

  if (req.method === "PUT") {
    const user = await requireAuth(req, res)
    if (!user) return

    const doc = await findPostBySlug(slug)
    if (!doc) return res.status(404).json({ error: "Post not found" })

    const { title, excerpt, content, tags, type, hidden, date } = req.body
    const updates = { updatedAt: Date.now() }
    if (title !== undefined) updates.title = title
    if (excerpt !== undefined) updates.excerpt = excerpt
    if (content !== undefined) updates.content = content
    if (tags !== undefined) updates.tags = tags
    if (type !== undefined) updates.type = type
    if (hidden !== undefined) updates.hidden = hidden
    if (date !== undefined) updates.date = date

    // Update slug if title changed
    if (title) {
      updates.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    }

    await adminDb.collection("blogPosts").doc(doc.id).update(updates)
    return res.json({ ok: true, slug: updates.slug || slug })
  }

  if (req.method === "DELETE") {
    const user = await requireAuth(req, res)
    if (!user) return

    const doc = await findPostBySlug(slug)
    if (!doc) return res.status(404).json({ error: "Post not found" })

    await adminDb.collection("blogPosts").doc(doc.id).delete()
    return res.json({ ok: true })
  }

  res.status(405).end()
}
