import axios from "axios"

// Telegram voice/audio -> text. Claude doesn't accept audio natively, so
// we transcribe with OpenAI Whisper and feed the text into the chat loop.

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"
const MAX_BYTES = 24 * 1024 * 1024 // Whisper hard limit is 25MB

export function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function transcribeAudio(buffer, { filename = "audio.ogg", mimeType = "audio/ogg" } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    const allKeys = Object.keys(process.env).sort()
    const obsidianKeys = allKeys.filter((k) => k.startsWith("OBSIDIAN"))
    const telegramKeys = allKeys.filter((k) => k.startsWith("TELEGRAM"))
    const total = allKeys.length
    throw new Error(
      `Whisper transcription not configured. Set OPENAI_API_KEY. (debug: total=${total}, OBSIDIAN=${obsidianKeys.length}, TELEGRAM=${telegramKeys.length}, sample=${JSON.stringify(allKeys.slice(0, 15))})`
    )
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Audio too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Whisper cap is 25MB.`)
  }

  const form = new FormData()
  form.append("file", new Blob([buffer], { type: mimeType }), filename)
  form.append("model", "whisper-1")

  const res = await axios.post(WHISPER_URL, form, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
  return (res.data?.text || "").trim()
}
