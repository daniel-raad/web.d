// Telegram voice/audio -> text. Claude doesn't accept audio natively, so
// we transcribe with OpenAI Whisper and feed the text into the chat loop.
// Uses native fetch (Node 18+) so web FormData/Blob serialise correctly —
// axios 0.25 doesn't support web FormData and needs the `form-data` package.

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"
const MAX_BYTES = 24 * 1024 * 1024 // Whisper hard limit is 25MB

export function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function transcribeAudio(buffer, { filename = "audio.ogg", mimeType = "audio/ogg" } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Whisper transcription not configured. Set OPENAI_API_KEY.")
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Audio too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Whisper cap is 25MB.`)
  }

  const form = new FormData()
  form.append("file", new Blob([buffer], { type: mimeType }), filename)
  form.append("model", "whisper-1")

  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Whisper API ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data?.text || "").trim()
}
