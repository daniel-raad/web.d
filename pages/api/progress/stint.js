import { adminDb } from "../../../lib/firebaseAdmin"
import {
  buildDates,
  getCurrentStint,
  goalProgressSummary,
  hitsForGoalInWindow,
  withGoalDisplayDefaults,
} from "../../../lib/stints"
import { getDateKey } from "../../../lib/dates.js"

// GET /api/progress/stint
//
// Returns the current stint window + per-goal hits across the active block.
// Goals are loaded standalone (not filtered by stintId) — the stint just
// provides the window. The UI uses this to render one row of boxes per
// active goal.

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const today = getDateKey()
  const stint = await getCurrentStint(today)
  if (!stint) return res.json({ stint: null, today, goals: [] })

  const dates = buildDates(stint.startDate, stint.endDate)
  const [goalsSnap, instSnap] = await Promise.all([
    adminDb.collection("goals").get(),
    adminDb.collection("instances")
      .where("date", ">=", stint.startDate)
      .where("date", "<=", stint.endDate)
      .get(),
  ])
  const goals = goalsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((g) => (g.state || (g.status === "archived" ? "archived" : "active")) !== "archived")
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((g, i) => withGoalDisplayDefaults(g, i))

  const instances = instSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const enriched = goals.map((g) => {
    const hits = hitsForGoalInWindow(g, instances, dates)
    const summary = goalProgressSummary(g, hits, today)
    return {
      ...g,
      hits,
      ...summary,
    }
  })

  return res.json({ stint, today, goals: enriched })
}
