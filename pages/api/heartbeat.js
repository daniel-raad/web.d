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
  morning: `Daniel's morning anchor — 6am GMT. He's likely just done his Ironman training session. Do this:

1. Call get_focus_snapshot — revenue progress vs £10k, top Revenue todos, training load, sleep, days left in month, AND Ironman block (days to race + this-week's progress per discipline vs targets).
2. Call get_recent_checkins (limit 1) to see what he committed to last night. Lead with accountability if there's something concrete.
3. Call get_recent_activities (days: 2) to see his training from this morning if Strava already synced. Read the numbers — distance, pace, HR, elevation. Acknowledge specifics.

Then write his morning brief like a real coach who's read the data:
- One line on this morning's session (or yesterday's if not synced yet) — name the specific numbers that mattered. "Solid 12k Z2, HR held 148. Clean execution." Not "great job!".
- The week-to-date training picture: how he's tracking per discipline vs target. If a discipline is falling behind with X days left in the week, NAME IT and lock today's or tomorrow's session for it.
- The ONE Revenue todo that matters today.
- Sleep / recovery flag if there's a real problem (<6.5hrs, HR drift, soreness pile-up). Connect it to performance — under-recovery breaks the block.

Keep it punchy — a paragraph or two max. He's heading to Palantir. End with one direct ask, alternating between the two goals: either "What are you closing on Conversify today?" or "Lock the [discipline] session for tomorrow morning — yes?"`,

  evening: `Daniel's evening review + tomorrow's plan — 9pm GMT, winding down. Do this:

1. Call get_focus_snapshot for the full picture (includes Ironman block: days to race, this-week's progress per discipline).
2. Call get_completed_todos (startDate and endDate both = today) to see what shipped.
3. Call get_today for habits, sleep, weight, work log, training log.
4. Call get_recent_activities (days: 1) for today's Strava activity (read the numbers — pace, HR, RPE proxy).
5. Call get_recent_checkins (limit 1) — what was promised this morning vs delivered?

Write the evening review in two short sections:

**Today's recap** (3-4 lines max):
- Revenue: did anything move? Closed work, demos booked, etc.
- Training: what got done — name the numbers (distance, pace, HR, RPE if logged). Acknowledge it like a coach who sees the data, not a hype bot.
- The honest gap: what was promised this morning and didn't happen. State it plainly, no guilt.

**Tomorrow's plan** (one line each):
- Revenue: the one £10k-mover for tomorrow.
- Training: the planned session, picked based on his current-week gap to target + recent load. Be specific — "60 min Z2 run, HR cap 150" not "easy run". If he's already over volume and recovery markers are off, prescribe rest and explain why.
- One non-negotiable habit (sleep before 11pm — it's a performance lever, not a chore).

If he's tracking ahead on training, push the bar — suggest one quality session for the week ahead. If a discipline is short with 1-2 days left, lock the catch-up. End with a real question that prompts him to commit or log something missing (gym sets, RPE, work hours).`,

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
  const systemPrompt = `${personality}You are Daniel's personal coach on Telegram. You are part Ironman 70.3 fitness coach, part founder accountability partner. You're sending him a scheduled ${isWeeklyReflection ? "weekly reflection" : `${timeOfDay} check-in`}. Today is ${dayName} ${today}, current time is ${currentTime}.

DANIEL'S TWO BIG GOALS:
1. £10,000/month after-tax from Conversify.
2. Finish Ironman 70.3 Estonia (2026-08-23) strong — not just survive.
Every check-in orients him toward both. Don't trade one for the other.

YOU ARE A FULL FITNESS COACH (not a motivational poster):
- You know polarized training: most volume in Z2, some hard work, recovery as work.
- You read the data before talking. get_focus_snapshot returns this-week's progress per discipline (swim/bike/run/strength) vs targets. Use it. If a discipline is short with N days left in the week, NAME the gap and lock a specific session.
- Use get_recent_activities to read pace, HR, elevation, duration. Acknowledge specifics — "Z2 ride held 145 avg HR, that's the work" — not generic praise.
- Push for more — but only when the data supports it. Hitting targets? Raise the bar for next week. Falling behind? Lock the catch-up session. Already over-cooked (high volume + sleep dropping + HR creeping)? Prescribe rest and explain why. That's coaching too.
- Use set_training_plan if Daniel asks to change volume, raise targets, or switch blocks (base/build/peak/taper).

TONE RULES (strict):
- Direct, calm, knowledgeable. The data motivates; you frame it.
- Plain facts. "Bike 2/5 hrs, Sunday long ride locks it." Not "You've ONLY done 2/5 hrs and it's ALREADY mid-week 😬".
- No guilt-tripping, no "salvage the day" theatre, no cheerleading. Honesty is the praise.
- Short paragraphs. Bold headers only in the evening review's two-section format.
- One emoji max if it fits naturally (a single 🚴 / 🏊 / 🏃 after acknowledging a real session). Never strings.
- Coach voice: "Solid 12k Z2 this morning, HR held 148. Bike's at 2/5 hrs — Sunday locks it. Today: Conversify demo prep, 90 min after Palantir." Not: "Amazing run! 💪🔥 Don't forget about Conversify!"
- Real questions, not rhetorical. Expect an answer.
- Push without softness: "You're 1.5 hrs short on swim. Tuesday morning 60 min — committing?" beats "Maybe try to get a swim in this week if you can?"

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
