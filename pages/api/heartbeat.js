import { ABOUT_DANIEL, READ_TOOLS, runChatLoop } from "../../lib/chatEngine"
import { sendMessage } from "../../lib/telegram"

const PROMPTS = {
  morning: `Good morning Daniel! Check his todos, habits, routine, and ironman plan for today. Give him a brief, motivating rundown of what's on the plate today — key todos, which habits to focus on, and any training scheduled. Keep it punchy and actionable.`,
  midday: `It's midday. Check Daniel's habits for today and his todos. Give him a quick progress check — what's done, what's still open, and a nudge on anything he might be forgetting. Keep it short.`,
  evening: `Evening check-in. Look at Daniel's habits and todos for today. Summarize what got done, what didn't, and give an honest but encouraging reflection. Remind him to wind down and prep for tomorrow. Keep it brief.`,
}

function getTimeOfDay() {
  // GMT
  const hour = new Date().getUTCHours()
  if (hour < 11) return "morning"
  if (hour < 17) return "midday"
  return "evening"
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
  const systemPrompt = `You are Daniel's personal AI assistant sending him a scheduled ${timeOfDay} check-in on Telegram. Be concise, casual, and motivating. Today is ${today}.

MEMORY: Call get_memory first to recall context about Daniel before crafting your check-in.

${ABOUT_DANIEL}`

  try {
    const reply = await runChatLoop({
      messages: [{ role: "user", content: PROMPTS[timeOfDay] }],
      tools: READ_TOOLS,
      systemPrompt,
    })

    await sendMessage(chatId, reply || "Heartbeat check-in had nothing to report.")
    return res.status(200).json({ ok: true, timeOfDay })
  } catch (err) {
    console.error("Heartbeat error:", err)
    return res.status(500).json({ error: "Heartbeat failed" })
  }
}
