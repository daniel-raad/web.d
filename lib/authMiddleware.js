import { getAuth } from "firebase-admin/auth"

const AUTHORIZED_EMAIL = "danielraadsw@gmail.com"

export async function requireAuth(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" })
    return null
  }

  try {
    const token = authHeader.split("Bearer ")[1]
    const decoded = await getAuth().verifyIdToken(token)
    if (decoded.email !== AUTHORIZED_EMAIL) {
      res.status(403).json({ error: "Forbidden" })
      return null
    }
    return decoded
  } catch (e) {
    res.status(401).json({ error: "Invalid token" })
    return null
  }
}
