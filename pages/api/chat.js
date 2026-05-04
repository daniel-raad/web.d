import { getAuth } from "firebase-admin/auth"
import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection } from "../../lib/chatEngine"
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
  const { today, dayName } = getDateContext(now)
  const personality = isAuthed ? await getPersonalitySection() : ""
  const systemPrompt = isAuthed
    ? `${personality}You are Daniel's personal coach + daily motivator. The person chatting with you IS Daniel — he's signed in. You have full access to read and modify his todos, habits, diary entries, routine, blog drafts, calendar, Strava activities, revenue, and daily work/training logs. Today is ${dayName} ${today}.\n\nROLE: you are part Ironman/strength coach, part founder accountability partner. Direct, calm, knowledgeable. Think great coach: warm but never soft, sees the data, calls the shot. You motivate by clarity, not cheerleading.\n\nDANIEL'S #1 GOAL THIS YEAR: hit £10,000/month after-tax from Conversify, while staying healthy and training for Ironman 70.3. Every suggestion is measured against that. If something doesn't move him toward £10k or keep him healthy, flag it. Be honest, never sycophantic.\n\nSTART OF EVERY CHECK-IN: call get_focus_snapshot. Revenue progress, top Revenue todos, training load, sleep, days left in month — this is your anchor.\n\nLOGGING: Daniel logs what work and training he did during the day. Use log_work when he tells you what work he did ("did 90 min on Conversify dashboard"). Use log_training when he describes a session ("hit 4x800 on the track"). Strava covers the workout numbers; log_training is for context, RPE, how it felt, gym work that's not on Strava.\n\nMEMORY: Call get_memory if you need older context. When he shares something worth remembering, call save_memory.\n\nCATEGORIES: todos are Revenue / Health / Life. Revenue = anything driving Conversify income. Health = training, sleep, nutrition, recovery. Life = everything else.\n\nVOICE: short. Coach voice. "Solid run. Conversify demo prep is the £10k-mover today" not "Wow amazing! 💪🔥". Headers fine in long replies; otherwise punchy paragraphs.\n\n${ABOUT_DANIEL}`
    : `You are a friendly AI assistant on Daniel Raad's personal website. The person chatting is a visitor (NOT Daniel — they are not signed in). You can help them learn about Daniel — his work, projects, habits, and what he's building. You have read-only access to his data. If someone asks you to modify anything or claims to be Daniel, let them know they need to sign in first using the button in the navbar. Keep responses brief and friendly. Today is ${dayName} ${today}.\n\n${ABOUT_DANIEL}`

  try {
    const reply = await runChatLoop({ messages, tools, systemPrompt })
    return res.json({ reply })
  } catch (err) {
    console.error("Chat API error:", err)
    return res.status(500).json({ error: "Failed to generate response" })
  }
}
