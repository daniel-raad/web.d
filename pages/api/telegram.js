import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop } from "../../lib/chatEngine"
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

  const today = new Date().toISOString().split("T")[0]
  const tools = [...READ_TOOLS, ...WRITE_TOOLS]
  const systemPrompt = `You are Daniel's personal AI assistant, messaging him on Telegram. You have full access to read and modify his todos, habits, diary entries, routine, and blog drafts. Be concise and casual — this is a chat app, keep messages short. Today is ${today}.

MEMORY: At the start of each conversation, call get_memory to recall context about Daniel. When he shares something worth remembering (preferences, life updates, goals, decisions), call save_memory to update the memory file. Be selective — only save things that matter across conversations.

${ABOUT_DANIEL}`

  try {
    const reply = await runChatLoop({
      messages: [{ role: "user", content: message.text }],
      tools,
      systemPrompt,
      model: "claude-haiku-4-5-20251001",
    })

    await sendMessage(chatId, reply || "Done.")
  } catch (err) {
    console.error("Telegram handler error:", err)
    await sendMessage(chatId, "Something went wrong. Check the logs.")
  }

  return res.status(200).json({ ok: true })
}
