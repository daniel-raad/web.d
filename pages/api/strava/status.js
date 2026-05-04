import { requireAuth } from "../../../lib/authMiddleware"
import { adminDb } from "../../../lib/firebaseAdmin"

export default async function handler(req, res) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const snap = await adminDb.collection("assistant").doc("strava").get()
  if (!snap.exists) return res.status(200).json({ connected: false })

  const { athleteName, athleteId, connectedAt, expiresAt } = snap.data()
  res.status(200).json({
    connected: true,
    athleteName: athleteName || null,
    athleteId: athleteId || null,
    connectedAt: connectedAt || null,
    expiresAt: expiresAt || null,
  })
}
