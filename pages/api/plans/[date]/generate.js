import { adminDb } from "../../../../lib/firebaseAdmin"
import { requireAuth } from "../../../../lib/authMiddleware"
import {
  READ_TOOLS,
  WRITE_TOOLS,
  runChatLoop,
  getPersonalitySection,
} from "../../../../lib/chatEngine"
import { getDateContext } from "../../../../lib/dates.js"

export const config = { maxDuration: 60 }

// Curated tool set — read everything goal/plan-relevant + write only propose_plan.
// We don't want a "generate plan" click to surprise-edit todos or log fake
// instances; the agent's job here is one focused write.
const PROPOSE_PLAN_TOOL = WRITE_TOOLS.find((t) => t.name === "propose_plan")
const GENERATE_TOOLS = PROPOSE_PLAN_TOOL ? [...READ_TOOLS, PROPOSE_PLAN_TOOL] : READ_TOOLS

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const user = await requireAuth(req, res)
  if (!user) return

  const { date } = req.query
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" })
  }

  const now = new Date()
  const { today, dayName, currentTime } = getDateContext(now)
  const isToday = date === today
  const isFuture = date > today
  const isPast = date < today

  const personality = await getPersonalitySection()

  // Same coach role as the heartbeat planner, but framed as on-demand for an
  // arbitrary date. Source-of-truth instruction: goals + templates collection,
  // never hardcode.
  const systemPrompt = `${personality}You are Daniel's personal coach, generating a structured daily plan on demand. Today is ${dayName} ${today}, current time is ${currentTime}. The plan you are writing is for ${date}${isToday ? " (TODAY)" : isFuture ? " (FUTURE)" : " (PAST — likely backfilling a missed plan)"}.

GOALS: Daniel's active goals live in the goals collection. Call get_goals first. The collection is the source of truth — read targets, deadlines, and lead measures from there. Never hardcode.

TEMPLATES: Call get_task_templates to load the reusable task shapes — these are the ONLY valid templateIds for propose_plan. Each carries primitives + suggestedFloor + suggestedTarget.

CONTEXT to load: get_focus_snapshot (revenue progress, training load, sleep, today's energy + 7-day avg, days to race, week-to-date per-discipline), get_today (today's logs + energy), get_recent_activities (days: 2 for fresh Strava), get_recent_checkins (limit 1 for last night's commitments).

DECISION LOGIC for ${date}:
- Energy ≤2 → recovery-shape day. Floors only. Drop quality work.
- Energy 3 → baseline. Use templates' suggestedFloor / suggestedTarget.
- Energy ≥4 AND a lead measure is short → lock a catch-up / quality session. Push the target.
- Energy ≥4 AND on-pace → maintain, don't manufacture work.
- No energy logged → use 7-day energyAvg if available, else assume 3. Note it in energyBasis.source.
${isToday ? `- It is TODAY and the current time is ${currentTime}. If we're in evening hours and nothing was done, the plan should be salvage-shaped: 1-2 floor items only (e.g. read 15 min, sleep before 11) plus the rest framed as tomorrow-prep, not full-day-prescription.` : ""}

CALL propose_plan with:
- date = "${date}"
- items = 3-5 ordered by priority. Each must use a real templateId. Each carries floor + target + a one-line rationale citing the goal / week-gap / energy${isToday ? " / how much of the day is left" : ""}.
- energyBasis = { value, source, note } explaining how energy shaped the targets.
- notes = the overall shape of the day in one sentence.

After writing the plan, respond with a one-sentence confirmation — Daniel will see the structured plan rendered on his dashboard, you don't need to re-list it.

TONE: direct, calm, coach voice. No emoji strings. State the shape plainly.`

  try {
    const reply = await runChatLoop({
      messages: [
        {
          role: "user",
          content: `Generate the plan for ${date}.`,
        },
      ],
      tools: GENERATE_TOOLS,
      systemPrompt,
      maxTokens: 1024,
      traceName: "generate-plan",
      userId: "daniel",
      metadata: { date, isToday, isFuture, isPast },
    })

    const planDoc = await adminDb.collection("plans").doc(date).get()
    if (!planDoc.exists) {
      return res.status(500).json({
        error: "Agent finished but no plan was written",
        agentReply: reply,
      })
    }
    return res.json({ ok: true, date, agentReply: reply })
  } catch (err) {
    console.error("Generate plan error:", err)
    return res.status(500).json({ error: "Failed to generate plan" })
  }
}
