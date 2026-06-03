import { adminDb } from "../../lib/firebaseAdmin"
import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection } from "../../lib/chatEngine"
import { addDaysToDateKey, getDateContext } from "../../lib/dates.js"
import { sendMessage } from "../../lib/telegram"

// The evening check-in needs to write tomorrow's structured plan. Curated
// write set — only propose_plan, not the full WRITE_TOOLS surface, so the
// heartbeat agent stays read-mostly and can't surprise-edit todos or logs.
const PROPOSE_PLAN_TOOL = WRITE_TOOLS.find((t) => t.name === "propose_plan")
const EVENING_TOOLS = PROPOSE_PLAN_TOOL ? [...READ_TOOLS, PROPOSE_PLAN_TOOL] : READ_TOOLS

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

1. Call get_goals to load his active goals. These are the source of truth — read targets, deadlines, and lead measures from here, never hardcode.
2. Call get_plan with today's date to recall last night's structured plan — what was committed for today.
3. Call get_focus_snapshot — top Revenue todos, training load, sleep, ENERGY (today + 7-day avg), days left in month, AND Ironman block (days to race + this-week's progress per discipline vs targets).
4. Call get_recent_checkins (limit 1) for last night's narrative.
5. Call get_recent_activities (days: 2) to see his training from this morning if Strava already synced. Read the numbers — distance, pace, HR, elevation. Acknowledge specifics.

Then write his morning brief like a real coach who's read the data:
- One line on this morning's session (or yesterday's if not synced yet) — name the specific numbers that mattered. "Solid 12k Z2, HR held 148. Clean execution." Not "great job!".
- The plan: surface what was scheduled for today (from get_plan) — name the top 2 items by templateId with floor + target. If the plan doesn't exist (nothing was written last night), say so plainly.
- The week-to-date training picture per the relevant goal's weeklyTargets. If a lead measure is falling behind with X days left in the week, NAME IT and lock today's or tomorrow's session for it.
- The ONE Revenue todo that matters today (cross-referenced against the outcome-leads goal).
- Sleep / energy / recovery flag if there's a real problem (<6.5hrs, energy ≤2, HR drift, soreness pile-up). Connect it to performance — under-recovery breaks the block.

If today's energy isn't logged (snapshot todayLogs.energy is null), ask for it on a 1-5 scale at the end — "Energy this morning, 1-5?" — it shapes how hard the next session can be pushed.

Keep it punchy — a paragraph or two max. End with one direct ask anchored to whichever goal is most off-pace today. Alternate between Revenue and Training questions across days.`,

  evening: `Daniel's evening review + tomorrow's plan — 9pm GMT, winding down. Do this:

1. Call get_goals to load active goals. The goals collection is the source of truth — read targets, deadlines, and lead measures from here.
2. Call get_task_templates to see the reusable task shapes and their suggestedFloor / suggestedTarget. These are the only valid templateIds for propose_plan.
3. Call get_focus_snapshot for the full picture (today's energy, 7-day energy avg, sleep, training load, Ironman block).
4. Call get_completed_todos (startDate and endDate both = today) to see what shipped.
5. Call get_today for sleep, weight, energy, work log, training log.
6. Call get_recent_activities (days: 1) for today's Strava activity (read the numbers — pace, HR, RPE proxy).
7. Call get_recent_checkins (limit 1) — what was promised this morning vs delivered?

Then DECIDE tomorrow's shape. Use this logic:
- Energy ≤2 → recovery day. Pick floors only. Drop any quality session.
- Energy 3 → baseline. Templates' suggestedFloor / suggestedTarget as-is.
- Energy ≥4 AND a lead measure is short → lock a quality / catch-up session. Push the target.
- Energy ≥4 AND on-pace → maintain. Don't manufacture work.
- No energy logged → use 7-day energyAvg if available, else assume 3. Note it in energyBasis.source.

Call propose_plan with:
- date = TOMORROW (today + 1 in YYYY-MM-DD)
- items = 3-5 items, ordered by priority. Each must use a real templateId. Each carries floor + target + a one-line rationale citing the goal / week-gap / energy.
- energyBasis = { value, source, note } explaining how energy shaped the targets.
- notes = the overall shape of tomorrow in one sentence.

After writing the plan, send Telegram in this format:

**Today's recap** (3-4 lines max):
- Revenue: did anything move? Closed work, demos booked, etc.
- Training: what got done — name the numbers (distance, pace, HR, RPE if logged). Coach voice, not hype.
- The honest gap: what was promised this morning and didn't happen. Plain.

**Tomorrow's plan** (mirror what you wrote via propose_plan — one line per item):
- TemplateId · floor → target · rationale.

End with one real question. If today's energy isn't logged (todayLogs.energy is null), ask for it: "Energy today, 1-5?" — it'll inform the morning. Otherwise ask Daniel to commit or log the most important missing thing.`,

  weekly_reflection: `It's Sunday evening — time for a weekly reflection. Do the following:

1. Call get_week_summary with this week's date range to get the full picture.
2. Call get_completed_todos with the same date range to see everything completed this week.
3. Call get_todos to see what's still open.
4. Call get_recent_checkins (limit 10) to review the week's check-in history — what did Daniel commit to vs what happened?

Give Daniel an honest weekly review:
- Goal-by-goal hit-rate: for each active goal, floor-hits / days in window, plus the gap to target. Call out the goal that's furthest off-pace.
- Best and worst days this week (by instance volume / energy)
- Sleep + energy average and pattern
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
  // ?force=morning | evening | weekly_reflection lets us test out of band — gated
  // by the secret so it's not a public surface.
  const force = String(req.query.force || "").toLowerCase()
  const timeOfDay = force === "morning" || force === "evening" ? force : getTimeOfDay(hour)

  // Sunday evening = weekly reflection instead of normal evening
  const isWeeklyReflection =
    force === "weekly_reflection" || (timeOfDay === "evening" && dayOfWeek === 0 && !force)
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

GOALS: Daniel's active goals live in the goals collection — call get_goals at the start of every check-in to load them. The collection is the source of truth. Do NOT hardcode targets, deadlines, or thresholds in your replies; read them from the goal docs.

Each goal has a TYPE that tells you how to evaluate progress:
- deadline-plan: fixed deadline + weeklyTargets (lead measures). Progress = on-pace vs deadline AND weekly targets hit.
- outcome-leads: a target outcome (£, users) + leadMeasures. Progress = current vs target on the outcome AND consistency on lead measures.
- process-cadence: no endpoint, just floor + target + primaryPrimitive (e.g. duration). Progress = hit-rate of floor over a rolling window.

Every check-in orients him toward all active goals. Don't trade one for another.

YOU ARE A FULL FITNESS COACH (not a motivational poster):
- You know polarized training: most volume in Z2, some hard work, recovery as work.
- You read the data before talking. get_focus_snapshot returns this-week's progress per discipline vs targets. Use it. If a lead measure is short with N days left in the week, NAME the gap and lock a specific session.
- Use get_recent_activities to read pace, HR, elevation, duration. Acknowledge specifics — "Z2 ride held 145 avg HR, that's the work" — not generic praise.
- Push for more — but only when the data supports it AND energy supports it. Hitting targets? Raise the bar for next week. Falling behind? Lock the catch-up session. Already over-cooked (high volume + sleep dropping + HR creeping + energy ≤2)? Prescribe rest and explain why. That's coaching too.
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

  // Evening check-in writes tomorrow's plan via propose_plan; morning + weekly
  // reflection are read-only.
  const tools = timeOfDay === "evening" && !isWeeklyReflection ? EVENING_TOOLS : READ_TOOLS

  try {
    const reply = await runChatLoop({
      messages: [{ role: "user", content: prompt }],
      tools,
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
