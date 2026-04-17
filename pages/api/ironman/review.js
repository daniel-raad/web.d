import { getTrainingRealitySnapshot } from "../../../lib/ironmanReview"

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  try {
    const rangeDays = req.query.rangeDays ? Number(req.query.rangeDays) : 14
    const snapshot = await getTrainingRealitySnapshot({
      today: req.query.date,
      rangeDays,
    })
    return res.json(snapshot)
  } catch (err) {
    console.error("Ironman review error:", err)
    return res.status(500).json({ error: "Failed to build Ironman review" })
  }
}
