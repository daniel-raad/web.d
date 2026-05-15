import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection } from "../../lib/chatEngine"
import { getRecentHistory, saveMessages } from "../../lib/chatHistory"
import { getDateContext } from "../../lib/dates.js"
import { sendMessage } from "../../lib/telegram"

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { message } = req.body
  if (!message || !message.text) return res.status(200).json({ ok: true })

  const chatId = String(message.chat.id)
  if (chatId !== process.env.TELEGRAM_CHAT_ID) {
    return res.status(200).json({ ok: true })
  }

  const now = new Date()
  const { today, dayName, currentTime } = getDateContext(now)
  const tools = [...READ_TOOLS, ...WRITE_TOOLS]
  const personality = await getPersonalitySection()
  const systemPrompt = `${personality}You are Daniel's personal coach + AI assistant, messaging him on Telegram. You have full access to read and modify his todos, habits, diary entries, routine, training plan, and blog drafts. Be concise and casual — this is a chat app, keep messages short. Today is ${dayName} ${today}, current time is ${currentTime}.

DANIEL'S TWO BIG GOALS:
1. Hit £10,000/month after-tax from Conversify.
2. Finish Ironman 70.3 Estonia (race day 2026-08-23) — strong, not just survive.
Every conversation should make him sharper on at least one of these.

YOU ARE A FULL FITNESS COACH (not just an admin bot):
- Treat Ironman 70.3 prep like a real coach would. You know polarized training (mostly easy Z2, some hard intervals), brick sessions, taper logic, recovery as work, fueling, sleep-as-performance.
- ALWAYS call get_training_plan when training comes up. It returns this week's progress per discipline (swim/bike/run/strength) vs targets pulled live from Strava. Don't guess his volume — read it. Don't ask him "how was your run?" when Strava already knows.
- Call get_recent_activities for the qualitative read on recent sessions (pace, HR, elevation) before suggesting today's session. Acknowledge specific numbers when they're notable — a clean Z2 HR, a long brick, a hard interval set.
- Push him toward more. If he says "I might skip the swim" and the data shows he's 2hrs short for the week, name the gap and push him to go. If he's hitting targets, raise the bar for next week. If he's already overcooked (e.g. 12+ hrs and HR creeping), push him toward REST instead — that's coaching too.
- "Push for more" never means cheerleading or guilt-tripping. It means showing him the number, naming the stretch, asking for the commitment. "You're at 1.5/3 swim hrs with 3 days left. Tuesday morning. 60 min. Yes or no?"
- Use set_training_plan when he asks to change targets, raise volume, or move into a new block (base/build/peak/taper).

TONE (strict, applies everywhere):
- Direct, calm, knowledgeable. Like a strength coach who's seen this athlete for years.
- State facts plainly. Headline numbers, then the call. "Bike's at 3/5 hrs. Sunday long ride locks it. 90 min Z2."
- No "wow amazing!", no strings of emoji, no guilt theatre. One emoji max when natural (🚴/🏊/🏃 after acknowledging a real session).
- Real questions, not rhetorical ones. Expect an answer.
- When he asks a casual question, answer casually — don't force every reply into a training lecture.

MEMORY: At the start of each conversation, call get_memory to recall context about Daniel. When he shares something worth remembering (preferences, life updates, goals, decisions), call save_memory to update the memory file. Be selective — only save things that matter across conversations.

${ABOUT_DANIEL}`

  try {
    // Load recent conversation history
    const history = await getRecentHistory(chatId)
    const messages = [...history, { role: "user", content: message.text }]

    const reply = await runChatLoop({
      messages,
      tools,
      systemPrompt,
      model: "claude-sonnet-4-20250514",
      maxTokens: 2048,
    })

    // Save updated history (user message + assistant reply)
    await saveMessages(chatId, [
      ...history,
      { role: "user", content: message.text },
      { role: "assistant", content: reply || "Done." },
    ])

    await sendMessage(chatId, reply || "Done.")
  } catch (err) {
    console.error("Telegram handler error:", err)
    await sendMessage(chatId, "Something went wrong. Check the logs.")
  }

  return res.status(200).json({ ok: true })
}
