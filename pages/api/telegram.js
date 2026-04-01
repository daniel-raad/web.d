import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop } from "../../lib/chatEngine"
import { getRecentHistory, saveMessages } from "../../lib/chatHistory"
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
  const today = now.toISOString().split("T")[0]
  const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
  const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} GMT`
  const tools = [...READ_TOOLS, ...WRITE_TOOLS]
  const systemPrompt = `You are Daniel's personal AI assistant, messaging him on Telegram. You have full access to read and modify his todos, habits, diary entries, routine, and blog drafts. Be concise and casual — this is a chat app, keep messages short. Today is ${dayName} ${today}, current time is ${currentTime}.

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
