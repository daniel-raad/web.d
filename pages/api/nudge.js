import { adminDb } from "../../lib/firebaseAdmin"
import { ABOUT_DANIEL, READ_TOOLS, runChatLoop } from "../../lib/chatEngine"
import { sendMessage } from "../../lib/telegram"

export const config = { maxDuration: 60 }

async function getHabitsForDate(date) {
  const [year, month] = date.split("-")
  const habitsDoc = await adminDb.collection("monthHabits").doc(`${year}-${month}`).get()
  const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
  const entryDoc = await adminDb.collection("habitEntries").doc(date).get()
  const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
  const completions = entry.habits || {}
  const completed = habits.filter((h) => completions[h.id] === true).length
  return { total: habits.length, completed, sleep: entry.sleep || null }
}

function formatDate(d) {
  return d.toISOString().split("T")[0]
}

async function detectNudges() {
  const now = new Date()
  const hour = now.getUTCHours()
  const today = formatDate(now)
  const nudges = []

  // Get today's habits
  const todayHabits = await getHabitsForDate(today)

  // Afternoon check: it's past 2PM GMT and less than half habits done
  if (hour >= 14 && todayHabits.total > 0 && todayHabits.completed < todayHabits.total / 2) {
    nudges.push({
      type: "low_habits",
      detail: `Only ${todayHabits.completed}/${todayHabits.total} habits done and it's past 2PM`,
    })
  }

  // Check overdue todos
  const todosSnap = await adminDb.collection("todos").where("completed", "==", false).get()
  const overdueTodos = todosSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => t.dueDate && t.dueDate < today)
  if (overdueTodos.length >= 3) {
    nudges.push({
      type: "overdue_todos",
      detail: `${overdueTodos.length} overdue todos: ${overdueTodos.slice(0, 3).map((t) => t.text).join(", ")}`,
    })
  }

  // Check sleep pattern — last 3 days
  const recentDates = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    recentDates.push(formatDate(d))
  }
  const sleepData = []
  for (const date of recentDates) {
    const entry = await adminDb.collection("habitEntries").doc(date).get()
    if (entry.exists && entry.data().sleep) {
      const hours = parseFloat(entry.data().sleep)
      if (!isNaN(hours)) sleepData.push(hours)
    }
  }
  if (sleepData.length >= 2) {
    const avg = sleepData.reduce((a, b) => a + b, 0) / sleepData.length
    if (avg < 6.5) {
      nudges.push({
        type: "low_sleep",
        detail: `Average sleep over last ${sleepData.length} days: ${avg.toFixed(1)}hrs`,
      })
    }
  }

  // Check habit streaks at risk — look for habits done 3+ days in a row that weren't done today
  if (hour >= 18 && todayHabits.total > 0) {
    const habitsDoc = await adminDb.collection("monthHabits").doc(today.slice(0, 7)).get()
    const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
    const todayEntry = await adminDb.collection("habitEntries").doc(today).get()
    const todayCompletions = todayEntry.exists ? todayEntry.data().habits || {} : {}

    for (const habit of habits) {
      if (todayCompletions[habit.id]) continue // already done today

      // Check if done 3 days in a row before today
      let streak = 0
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const entry = await adminDb.collection("habitEntries").doc(formatDate(d)).get()
        if (entry.exists && entry.data().habits?.[habit.id]) streak++
        else break
      }
      if (streak >= 3) {
        nudges.push({
          type: "streak_at_risk",
          detail: `${habit.name} has a ${streak}-day streak that'll break if not done today`,
        })
      }
    }
  }

  return nudges
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const secret = req.headers["x-heartbeat-secret"]
  if (secret !== process.env.HEARTBEAT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return res.status(500).json({ error: "TELEGRAM_CHAT_ID not set" })

  try {
    const nudges = await detectNudges()

    if (nudges.length === 0) {
      return res.status(200).json({ ok: true, nudged: false, reason: "Nothing worth nudging about" })
    }

    const today = new Date().toISOString().split("T")[0]
    const nudgeSummary = nudges.map((n) => `- [${n.type}] ${n.detail}`).join("\n")

    const systemPrompt = `You are Daniel's personal AI assistant sending him a smart nudge on Telegram. You're not a scheduled check-in — you're reaching out because you noticed something that deserves attention. Be concise, casual, and helpful. Don't be preachy. Today is ${today}.

${ABOUT_DANIEL}`

    const userPrompt = `The following patterns were detected that might be worth nudging Daniel about. Craft a short, helpful Telegram message. Only mention what's actually useful — don't pad it. If a streak is at risk, make that feel urgent but not naggy.

Detected:
${nudgeSummary}`

    const reply = await runChatLoop({
      messages: [{ role: "user", content: userPrompt }],
      tools: READ_TOOLS,
      systemPrompt,
    })

    await sendMessage(chatId, reply || "Quick nudge — check your habits today.")
    return res.status(200).json({ ok: true, nudged: true, nudges: nudges.map((n) => n.type) })
  } catch (err) {
    console.error("Nudge error:", err)
    return res.status(500).json({ error: "Nudge failed" })
  }
}
