import { requireAuth } from "../../../lib/authMiddleware"
import { getPlan, setPlan, getCurrentWeekProgress } from "../../../lib/trainingPlan"

export default async function handler(req, res) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (req.method === "GET") {
    const progress = await getCurrentWeekProgress()
    return res.status(200).json(progress)
  }

  if (req.method === "POST") {
    const { targetsHoursPerWeek, raceDate, notes } = req.body || {}
    const updated = await setPlan({ targetsHoursPerWeek, raceDate, notes })
    return res.status(200).json(updated)
  }

  res.setHeader("Allow", "GET, POST")
  return res.status(405).end()
}
