import { adminDb } from "../../lib/firebaseAdmin"
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

1. Call get_recent_checkins (limit 3) to see what was discussed in last night's evening check-in. If Daniel replied with plans or priorities, hold him to them.
2. Call get_ironman_plan with the current week number to get TODAY's specific training sessions. Tell him exactly what workout is scheduled (e.g. "45min easy run + 20min strength"), not just "training".
3. Call get_todos to get his task list. Give him a work standup: what are the key open tasks across Palantir, Conversify, and personal? Focus on what's due soon or overdue.
4. Call get_habits to see today's habit list.

Format it as a clear morning brief:
- Accountability (if he said he'd do something last night, lead with that)
- Today's training (specific sessions)
- Work standup (top 3-5 actionable tasks for today)
- Habits to tick off

Keep it punchy and actionable. This should feel like a standup, not a novel.`,

  midday: `It's midday. Check Daniel's habits for today and his todos. Give him a quick progress check — what's done, what's still open, and a nudge on anything he might be forgetting. Keep it short.`,

  evening: `Evening check-in. Do the following:

1. Call get_recent_checkins (limit 3) to see what was said in this morning's standup — what did Daniel commit to today?
2. Call get_habits to see what got done today and what didn't.
3. Call get_completed_todos with today's date as both startDate and endDate to see what was actually finished today.
4. Call get_todos to see what's still open.
5. Compare what Daniel said he'd do (from morning check-in) vs what actually got done. Be honest about the gap if there is one.

Summarize the day: what got done (including any completion notes on todos), what didn't, honest but encouraging.

Then end with a PLANNING QUESTION — ask Daniel what he wants to prioritize tomorrow. Be specific, e.g.:
"What's the #1 thing you want to get done tomorrow? Any tasks to carry over, or anything new on the plate?"

This should prompt him to think about and reply with tomorrow's plan. Keep it conversational.`,

  weekly_reflection: `It's Sunday evening — time for a weekly reflection. Do the following:

1. Call get_week_summary with this week's date range to get the full picture.
2. Call get_ironman_plan to see training progress.
3. Call get_completed_todos with the same date range to see everything completed this week.
4. Call get_todos to see what's still open.
5. Call get_recent_checkins (limit 10) to review the week's check-in history — what did Daniel commit to vs what happened?

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
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
  const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} GMT`

  // Sunday evening = weekly reflection instead of normal evening
  const isWeeklyReflection = timeOfDay === "evening" && isSunday()
  const promptKey = isWeeklyReflection ? "weekly_reflection" : timeOfDay

  let prompt = PROMPTS[promptKey]

  // Inject week range for weekly reflection
  if (isWeeklyReflection) {
    const { start, end } = getWeekRange()
    prompt = prompt.replace("this week's date range", `startDate: "${start}", endDate: "${end}"`)
  }

  const systemPrompt = `You are Daniel's personal AI assistant sending him a scheduled ${isWeeklyReflection ? "weekly reflection" : `${timeOfDay} check-in`} on Telegram. Be concise, casual, and motivating. Today is ${dayName} ${today}, current time is ${currentTime}.

MEMORY: Call get_memory first to recall context about Daniel before crafting your check-in.

${ABOUT_DANIEL}`

  try {
    const reply = await runChatLoop({
      messages: [{ role: "user", content: prompt }],
      tools: READ_TOOLS,
      systemPrompt,
      maxTokens: isWeeklyReflection ? 2048 : 1024,
    })

    const message = reply || "Heartbeat check-in had nothing to report."
    await sendMessage(chatId, message)

    // Store check-in for continuity — so future check-ins can reference past ones
    await adminDb.collection("checkins").add({
      date: today,
      timeOfDay: isWeeklyReflection ? "weekly_reflection" : timeOfDay,
      content: message,
      timestamp: Date.now(),
    })

    return res.status(200).json({ ok: true, timeOfDay, isWeeklyReflection })
  } catch (err) {
    console.error("Heartbeat error:", err)
    return res.status(500).json({ error: "Heartbeat failed" })
  }
}
