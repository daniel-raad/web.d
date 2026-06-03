import { getAuth } from "firebase-admin/auth"
import { READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection, buildSystemPrompt } from "../../lib/chatEngine"
import { getDateContext } from "../../lib/dates.js"
import { checkRateLimit } from "../../lib/rateLimit"

const AUTHORIZED_EMAIL = "danielraadsw@gmail.com"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" })
  }

  // Check auth
  let isAuthed = false
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split("Bearer ")[1]
      const decoded = await getAuth().verifyIdToken(token)
      if (decoded.email === AUTHORIZED_EMAIL) {
        isAuthed = true
      }
    } catch (e) {
      // Not authed, continue as public
    }
  }

  // Rate limit public visitors only
  if (!isAuthed) {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"
    const { allowed, retryAfter } = await checkRateLimit(ip)
    if (!allowed) {
      return res.status(429).json({ error: "Rate limit exceeded", retryAfter })
    }
  }

  const tools = isAuthed ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS

  const now = new Date()
  const { today, dayName, currentTime } = getDateContext(now)
  const personality = isAuthed ? await getPersonalitySection() : ""
  const systemPrompt = buildSystemPrompt({ isAuthed, today, dayName, currentTime, personality })

  try {
    const reply = await runChatLoop({
      messages,
      tools,
      systemPrompt,
      traceName: isAuthed ? "chat-daniel" : "chat-visitor",
      userId: isAuthed ? "daniel" : "visitor",
      metadata: { authed: isAuthed },
    })
    return res.json({ reply })
  } catch (err) {
    console.error("Chat API error:", err)
    return res.status(500).json({ error: "Failed to generate response" })
  }
}
