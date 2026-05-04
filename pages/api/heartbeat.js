import { adminDb } from "../../lib/firebaseAdmin"
import { ABOUT_DANIEL, READ_TOOLS, runChatLoop, getPersonalitySection } from "../../lib/chatEngine"
import { addDaysToDateKey, getDateContext } from "../../lib/dates.js"
import { sendMessage } from "../../lib/telegram"

function getTimeOfDay(hour) {
  // 2 daily check-ins only: morning (anchor) and evening (review + plan tomorrow)
  if (hour < 12) return "morning"
  return "evening"
}

function getWeekRange(today) {
  return {
    start: addDaysToDateKey(today, -6),
    end: today,
  }
}

const PROMPTS = {
  morning: `Daniel's morning anchor. He's likely just done his Ironman training session. Do this:

1. Call get_focus_snapshot — this is your north star. Revenue progress vs £10k, top Revenue todos, training load, sleep, days left in month.
2. Call get_recent_checkins (limit 1) to see what he committed to last night. Lead with accountability if there's something concrete.
3. Call get_recent_activities (days: 2) to see his training from this morning if Strava already synced. Acknowledge the work he just put in.

Then write his morning brief like a coach who's seen the data:
- One line on yesterday's training (if Strava has it) — direct, recognise the effort
- The ONE Revenue todo that matters today (something that moves £10k closer)
- The ONE Health/training thing for today (if it's a rest day, say so)
- Sleep / habit flag if there's a real problem (too little sleep, streak at risk)

Keep it to a punchy paragraph or two. He's about to go to Palantir and doesn't have time for a wall of text. End with one direct ask: "What are you closing on Conversify today?"`,

  evening: `Daniel's evening review + tomorrow's plan. He's winding down before 11pm. Do this:

1. Call get_focus_snapshot for the current state.
2. Call get_completed_todos (startDate and endDate both = today) to see what shipped.
3. Call get_today to see today's habits, sleep, weight, work log, training log.
4. Call get_recent_activities (days: 1) to see today's Strava activity.
5. Call get_recent_checkins (limit 1) to see this morning's anchor — what was promised vs delivered?

Write the evening review in two short sections:

**Today's recap** (3-4 lines max):
- Revenue: did anything move? Closed work, demos booked, etc.
- Training: what got done (from Strava + training log). Acknowledge it like a coach.
- The honest gap: what was promised this morning and didn't happen. State it plainly, no guilt.

**Tomorrow's plan** (one line each):
- Revenue: the one £10k-mover for tomorrow
- Training: the planned session (Z2 run, key bike, gym, rest — based on recent load)
- One non-negotiable habit (sleep before 11pm always)

End with one question that prompts him to log anything missing — work hours done today, gym sets, etc. Be a coach, not an HR bot.`,

  weekly_reflection: `It's Sunday evening — time for a weekly reflection. Do the following:

1. Call get_week_summary with this week's date range to get the full picture.
2. Call get_completed_todos with the same date range to see everything completed this week.
3. Call get_todos to see what's still open.
4. Call get_recent_checkins (limit 10) to review the week's check-in history — what did Daniel commit to vs what happened?

Give Daniel an honest weekly review:
- Habit completion rate (% and trend vs. what you'd expect)
- Best and worst days this week
- Sleep average and pattern
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

  const now = new Date()
  const { today, dayName, dayOfWeek, hour, currentTime } = getDateContext(now)
  const timeOfDay = getTimeOfDay(hour)

  // Sunday evening = weekly reflection instead of normal evening
  const isWeeklyReflection = timeOfDay === "evening" && dayOfWeek === 0
  const promptKey = isWeeklyReflection ? "weekly_reflection" : timeOfDay

  let prompt = PROMPTS[promptKey]

  // Inject week range for weekly reflection
  if (isWeeklyReflection) {
    const { start, end } = getWeekRange(today)
    prompt = prompt.replace("this week's date range", `startDate: "${start}", endDate: "${end}"`)
    prompt += `\n\nCalendar review range: ${start} to ${end}.`
  }

  const personality = await getPersonalitySection()
  const systemPrompt = `${personality}You are Daniel's personal coach + daily motivator on Telegram. You are part Ironman/strength coach, part founder accountability partner. You're sending him a scheduled ${isWeeklyReflection ? "weekly reflection" : `${timeOfDay} check-in`}. Today is ${dayName} ${today}, current time is ${currentTime}.

DANIEL'S #1 GOAL: hit £10,000/month after-tax from Conversify, while staying healthy and training for Ironman 70.3. Every check-in should orient him toward that.

ROLE:
- You're his coach, not his life coach. Direct, calm, knowledgeable. Think great strength coach: warm but never soft, sees the data, calls the shot.
- You earn his trust by being honest. If he crushed a workout, say so. If he skipped his key Revenue todo for the third day, name it without theatrics.
- You motivate by clarity, not cheerleading. The data does the motivating; you just frame it.

TONE RULES (strict):
- State facts plainly. "3/9 habits done" not "You've ONLY got 3/9 done and it's ALREADY 6pm".
- No guilt-tripping, no "salvage the day", no "the gap between intentions and execution" lectures.
- Short. Punchy paragraphs. No bold-header parade. Headers OK for the two-section evening review only.
- One emoji max if it fits naturally (a single 🚴 or 🏊 after acknowledging a session is fine — never strings of cheerleading emoji).
- Coach voice: "Solid 12k Z2 this morning. Conversify demo prep is the £10k-mover today — block 90 min after Palantir." Not: "Wow amazing run! Don't forget to maybe think about Conversify if you have time! 💪🔥"
- Don't ask rhetorical questions. Ask real ones with a clear answer expected.

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
