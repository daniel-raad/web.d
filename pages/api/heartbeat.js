import { ABOUT_DANIEL, READ_TOOLS, runChatLoop } from "../../lib/chatEngine"
import { sendMessage } from "../../lib/telegram"

function getTimeOfDay() {
  // GMT
  const hour = new Date().getUTCHours()
  if (hour < 11) return "morning"
  if (hour < 17) return "midday"
  return "evening"
}

function isSunday() {
  return new Date().getUTCDay() === 0
}

function getWeekRange() {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)
  start.setDate(start.getDate() - 6)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

const PROMPTS = {
  morning: `Good morning Daniel! This is his daily standup. Do the following:

1. Call get_ironman_plan with the current week number to get TODAY's specific training sessions. Tell him exactly what workout is scheduled (e.g. "45min easy run + 20min strength"), not just "training".
2. Call get_todos to get his task list. Give him a work standup: what are the key open tasks across Palantir, Conversify, and personal? Focus on what's due soon or overdue.
3. Call get_habits to see today's habit list.

Format it as a clear morning brief:
- Today's training (specific sessions)
- Work standup (top 3-5 actionable tasks for today)
- Habits to tick off

Keep it punchy and actionable. This should feel like a standup, not a novel.`,

  midday: `It's midday. Check Daniel's habits for today and his todos. Give him a quick progress check — what's done, what's still open, and a nudge on anything he might be forgetting. Keep it short.`,

  evening: `Evening check-in. Do the following:

1. Call get_habits to see what got done today and what didn't.
2. Call get_todos to see open tasks.
3. Summarize the day: what got done, what didn't, honest but encouraging.

Then end with a PLANNING QUESTION — ask Daniel what he wants to prioritize tomorrow. Be specific, e.g.:
"What's the #1 thing you want to get done tomorrow? Any tasks to carry over, or anything new on the plate?"

This should prompt him to think about and reply with tomorrow's plan. Keep it conversational.`,

  weekly_reflection: `It's Sunday evening — time for a weekly reflection. Do the following:

1. Call get_week_summary with this week's date range to get the full picture.
2. Call get_ironman_plan to see training progress.
3. Call get_todos to see what got completed and what's still open.

Give Daniel an honest weekly review:
- Habit completion rate (% and trend vs. what you'd expect)
- Best and worst days this week
- Sleep average and pattern
- Training progress — sessions completed vs. planned
- Todo throughput — what got done, what's been sitting
- One specific, actionable thing to improve next week

Be real, not just encouraging. If something slipped, say so. End with a motivating note about the week ahead. This is his weekly accountability check.`,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const secret = req.headers["x-heartbeat-secret"]
  if (secret !== process.env.HEARTBEAT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return res.status(500).json({ error: "TELEGRAM_CHAT_ID not set" })

  const timeOfDay = getTimeOfDay()
  const today = new Date().toISOString().split("T")[0]

  // Sunday evening = weekly reflection instead of normal evening
  const isWeeklyReflection = timeOfDay === "evening" && isSunday()
  const promptKey = isWeeklyReflection ? "weekly_reflection" : timeOfDay

  let prompt = PROMPTS[promptKey]

  // Inject week range for weekly reflection
  if (isWeeklyReflection) {
    const { start, end } = getWeekRange()
    prompt = prompt.replace("this week's date range", `startDate: "${start}", endDate: "${end}"`)
  }

  const systemPrompt = `You are Daniel's personal AI assistant sending him a scheduled ${isWeeklyReflection ? "weekly reflection" : `${timeOfDay} check-in`} on Telegram. Be concise, casual, and motivating. Today is ${today}.

MEMORY: Call get_memory first to recall context about Daniel before crafting your check-in.

${ABOUT_DANIEL}`

  try {
    const reply = await runChatLoop({
      messages: [{ role: "user", content: prompt }],
      tools: READ_TOOLS,
      systemPrompt,
    })

    await sendMessage(chatId, reply || "Heartbeat check-in had nothing to report.")
    return res.status(200).json({ ok: true, timeOfDay, isWeeklyReflection })
  } catch (err) {
    console.error("Heartbeat error:", err)
    return res.status(500).json({ error: "Heartbeat failed" })
  }
}
