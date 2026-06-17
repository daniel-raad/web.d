import axios from "axios"
import {
  READ_TOOLS,
  WRITE_TOOLS,
  VAULT_TOOLS,
  runChatLoop,
  getPersonalitySection,
  buildCoachSystemPrompt,
} from "../../lib/chatEngine"
import { getRecentHistory, saveMessages } from "../../lib/chatHistory"
import { getDateContext } from "../../lib/dates.js"
import { sendMessage } from "../../lib/telegram"
import { transcribeAudio } from "../../lib/whisper"

export const config = {
  maxDuration: 60,
  api: { bodyParser: { sizeLimit: "10mb" } },
}

const TELEGRAM_FILE_URL = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function downloadTelegramFile(fileId) {
  const meta = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: fileId } })
  const filePath = meta.data?.result?.file_path
  if (!filePath) throw new Error("Telegram getFile returned no file_path")
  const res = await axios.get(`${TELEGRAM_FILE_URL}/${filePath}`, { responseType: "arraybuffer" })
  return { buffer: Buffer.from(res.data), filePath }
}

function inferImageMime(filePath = "") {
  const ext = filePath.toLowerCase().split(".").pop()
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  if (ext === "gif") return "image/gif"
  return "image/jpeg"
}

// Build the per-turn payload sent to Claude (rich, with image blocks) and a
// compact text version persisted to chatHistory (Firestore docs cap at 1MB,
// and we don't want base64 photos bloating future turns either).
async function buildUserMessage(message) {
  const blocks = []
  const historyParts = []
  const caption = (message.caption || "").trim()

  // PHOTOS → vision input. Pick the largest size Telegram offered.
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1]
    const { buffer, filePath } = await downloadTelegramFile(largest.file_id)
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: inferImageMime(filePath),
        data: buffer.toString("base64"),
      },
    })
    historyParts.push(`[photo${caption ? `: ${caption}` : ""}]`)
  }

  // VOICE NOTE → Whisper transcription.
  if (message.voice?.file_id) {
    const { buffer } = await downloadTelegramFile(message.voice.file_id)
    const text = await transcribeAudio(buffer, {
      filename: "voice.ogg",
      mimeType: message.voice.mime_type || "audio/ogg",
    })
    blocks.push({ type: "text", text: `[voice note transcript]\n${text}` })
    historyParts.push(`[voice]: ${text}`)
  }

  // AUDIO FILE → same flow as voice.
  if (message.audio?.file_id) {
    const { buffer } = await downloadTelegramFile(message.audio.file_id)
    const text = await transcribeAudio(buffer, {
      filename: message.audio.file_name || "audio.mp3",
      mimeType: message.audio.mime_type || "audio/mpeg",
    })
    blocks.push({ type: "text", text: `[audio transcript]\n${text}` })
    historyParts.push(`[audio]: ${text}`)
  }

  // TEXT or caption — last so the trailing block is always text. Multi-block
  // user messages must end on text for Claude's vision turn to work cleanly.
  const trailingText = (message.text || caption || "").trim()
  if (trailingText) {
    blocks.push({ type: "text", text: trailingText })
    if (!message.photo) historyParts.push(trailingText)
  } else if (blocks.length > 0 && blocks[blocks.length - 1].type !== "text") {
    // Ensure the message ends on text so the model is prompted to respond.
    blocks.push({ type: "text", text: "(captured above)" })
  }

  if (blocks.length === 0) return null

  return {
    forClaude: { role: "user", content: blocks },
    forHistory: { role: "user", content: historyParts.join(" ") || "(media)" },
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { message } = req.body
  if (!message) return res.status(200).json({ ok: true })

  const chatId = String(message.chat.id)
  if (chatId !== process.env.TELEGRAM_CHAT_ID) {
    return res.status(200).json({ ok: true })
  }

  const now = new Date()
  const { today, dayName, currentTime } = getDateContext(now)
  const tools = [...READ_TOOLS, ...WRITE_TOOLS, ...VAULT_TOOLS]
  const personality = await getPersonalitySection()
  const systemPrompt = buildCoachSystemPrompt({
    surface: "telegram",
    today,
    dayName,
    currentTime,
    personality,
  })

  try {
    const built = await buildUserMessage(message)
    if (!built) return res.status(200).json({ ok: true })

    const history = await getRecentHistory(chatId)
    const messages = [...history, built.forClaude]

    const reply = await runChatLoop({
      messages,
      tools,
      systemPrompt,
      model: "claude-sonnet-4-5",
      maxTokens: 2048,
    })

    await saveMessages(chatId, [
      ...history,
      built.forHistory,
      { role: "assistant", content: reply || "Done." },
    ])

    await sendMessage(chatId, reply || "Done.")
  } catch (err) {
    console.error("Telegram handler error:", err)
    await sendMessage(chatId, `Something went wrong: ${err.message}`)
  }

  return res.status(200).json({ ok: true })
}
