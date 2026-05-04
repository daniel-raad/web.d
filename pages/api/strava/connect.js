import crypto from "crypto"
import { requireAuth } from "../../../lib/authMiddleware"
import { adminDb } from "../../../lib/firebaseAdmin"
import { getAuthorizeUrl } from "../../../lib/strava"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_REDIRECT_URI) {
    return res.status(500).json({ error: "Strava env vars not configured" })
  }

  const state = crypto.randomBytes(16).toString("hex")
  await adminDb.collection("assistant").doc("strava_state").set({
    state,
    createdAt: Date.now(),
  })

  const url = getAuthorizeUrl(state)
  res.status(200).json({ url })
}
