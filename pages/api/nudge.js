import { adminDb } from "../../lib/firebaseAdmin"
import { ABOUT_DANIEL, READ_TOOLS, WRITE_TOOLS, runChatLoop, getPersonalitySection } from "../../lib/chatEngine"
import { addDaysToDateKey, getDateContext } from "../../lib/dates.js"
import { sendMessage } from "../../lib/telegram"

export const config = { maxDuration: 120 }

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

async function detectNudges() {
  const now = new Date()
  const { hour, today, currentTime } = getDateContext(now)
  const nudges = []

  // Get today's habits
  const todayHabits = await getHabitsForDate(today)

  // Afternoon check: it's past 2PM London time and less than half habits done
  if (hour >= 14 && todayHabits.total > 0 && todayHabits.completed < todayHabits.total / 2) {
    nudges.push({
      type: "low_habits",
      detail: `Only ${todayHabits.completed}/${todayHabits.total} habits done and it's ${currentTime}`,
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
    recentDates.push(addDaysToDateKey(today, -i))
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
        const entry = await adminDb.collection("habitEntries").doc(addDaysToDateKey(today, -i)).get()
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

// Todo maintenance tools — read everything, but only allow category updates and deletes for cleanup
const MAINTENANCE_TOOLS = [
  ...READ_TOOLS,
  ...WRITE_TOOLS.filter((t) => ["update_todo", "delete_todo"].includes(t.name)),
]

const MAINTENANCE_SYSTEM_PROMPT = `You are a todo queue maintenance agent for Daniel Raad. Your job is to keep his todo list clean, organised, and useful. You run automatically every few hours.

${ABOUT_DANIEL}

EVERY TIME you run, regardless of what triggered you, do the following:

1. Call get_todos to see all current todos.
2. Call get_todo_categories to see the official category list.
3. Review the queue and take action:

CATEGORY HYGIENE:
- If a todo has an empty category or "Uncategorized", assign it to the best matching official category based on its text.
- If a todo's category doesn't match the official list (typo, old name), fix it to the closest official category.
- Use your judgement — "Fix deploy pipeline" is Conversify or Palantir depending on context. When ambiguous, leave it and flag it.

DUPLICATE DETECTION:
- Look for todos that are duplicates or near-duplicates (same intent, different wording).
- If you find clear duplicates, keep the one with more detail (or the one with a due date) and delete the other.
- If they're similar but not exact duplicates, flag them in your report but don't delete — Daniel should decide.

STALE ITEMS:
- Flag todos that have been open for a very long time with no due date — they might need to be archived or re-prioritised.
- Do NOT auto-complete or delete stale items. Just flag them.

RULES:
- Be conservative with deletes — only delete obvious duplicates where intent is clearly identical.
- When fixing categories, use the official category list. Don't invent new categories.
- If there are no issues, just say "Queue is clean" and stop.

RESPOND with a brief maintenance report:
- What you fixed (category changes, duplicates removed)
- What needs Daniel's attention (ambiguous categories, possible duplicates, stale items)
- Keep it to a few bullet points max. If nothing needed fixing, say so in one line.`

async function runTodoMaintenance() {
  try {
    const report = await runChatLoop({
      messages: [{ role: "user", content: "Run your todo queue maintenance check now." }],
      tools: MAINTENANCE_TOOLS,
      systemPrompt: MAINTENANCE_SYSTEM_PROMPT,
    })
    return report || null
  } catch (err) {
    console.error("Todo maintenance error:", err)
    return null
  }
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
    // Always run todo maintenance, regardless of nudge triggers
    const [nudges, maintenanceReport] = await Promise.all([detectNudges(), runTodoMaintenance()])

    const hasMaintenanceActions =
      maintenanceReport && !maintenanceReport.toLowerCase().includes("queue is clean")

    if (nudges.length === 0 && !hasMaintenanceActions) {
      return res.status(200).json({ ok: true, nudged: false, reason: "Nothing worth nudging about" })
    }

    const now = new Date()
    const { today, dayName, currentTime } = getDateContext(now)
    const nudgeSummary = nudges.map((n) => `- [${n.type}] ${n.detail}`).join("\n")

    const personality = await getPersonalitySection()
    const systemPrompt = `${personality}You are Daniel's personal AI assistant sending him a smart nudge on Telegram. You noticed something worth flagging. Today is ${dayName} ${today}, current time is ${currentTime}.

TONE RULES (strict):
- State the facts, don't guilt-trip. "3/9 habits done" not "You've ONLY got 3/9 done and it's ALREADY late".
- No "might be worth", "still time to salvage", or passive-aggressive suggestions. Just say what's open.
- Keep it to 2-4 sentences max. No headers, no emoji cheerleading, no life coaching.
- If there's a database/technical issue, state it plainly and say what needs to happen to fix it.

${ABOUT_DANIEL}`

    let userPrompt = ""

    if (nudges.length > 0) {
      userPrompt += `These were detected. State them plainly — no guilt-tripping or urgency theatrics.

Detected:
${nudgeSummary}`
    }

    if (hasMaintenanceActions) {
      userPrompt += `${nudges.length > 0 ? "\n\n" : ""}The todo maintenance agent just ran and made some changes or has items that need Daniel's attention. Include a brief section about this — keep it matter-of-fact, not dramatic.

Maintenance report:
${maintenanceReport}`
    }

    const reply = await runChatLoop({
      messages: [{ role: "user", content: userPrompt }],
      tools: READ_TOOLS,
      systemPrompt,
    })

    await sendMessage(chatId, reply || "Quick nudge — check your habits today.")
    return res.status(200).json({
      ok: true,
      nudged: true,
      nudges: nudges.map((n) => n.type),
      maintenance: hasMaintenanceActions,
    })
  } catch (err) {
    console.error("Nudge error:", err)
    return res.status(500).json({ error: "Nudge failed" })
  }
}
