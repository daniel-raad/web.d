import { requireAuth } from "../../../lib/authMiddleware"
import { getRecentActivities, isConnected as stravaIsConnected } from "../../../lib/strava"
import { disciplineFor } from "../../../lib/trainingPlan"

export default async function handler(req, res) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).end()
  }

  if (!(await stravaIsConnected())) {
    return res.status(200).json({ connected: false, activities: [] })
  }

  const days = Math.min(parseInt(req.query.days, 10) || 14, 90)
  const activities = await getRecentActivities({ days, perPage: 50 })
  const enriched = activities.map((a) => ({ ...a, discipline: disciplineFor(a.type) }))
  return res.status(200).json({ connected: true, days, activities: enriched })
}
