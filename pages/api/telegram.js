import { READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection, buildCoachSystemPrompt } from "../../lib/chatEngine"
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
  const systemPrompt = buildCoachSystemPrompt({
    surface: "telegram",
    today,
    dayName,
    currentTime,
    personality,
  })

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
