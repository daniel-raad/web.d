import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Anthropic from "@anthropic-ai/sdk"
import axios from "axios"
import { adminDb } from "./firebaseAdmin"
import { getCalendarClient, getCalendarId } from "./googleCalendar"
import { getRecentActivities, getActivitySummary, isConnected as stravaIsConnected } from "./strava"
import {
  addDaysToDateKey,
  compareDateKeys,
  getDateKey,
  zonedDateTimeToISOString,
} from "./dates.js"

// Format a calendar event start/end value. If the input is YYYY-MM-DD it
// becomes an all-day { date }; otherwise it becomes a timed { dateTime, timeZone }.
function formatCalendarTime(value, timeZone) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value }
  }
  return { dateTime: value, timeZone }
}

function completedAtToMs(value) {
  if (!value) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const ms = new Date(value).getTime()
    return Number.isFinite(ms) ? ms : null
  }
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis()
    return Number.isFinite(ms) ? ms : null
  }
  if (typeof value.toDate === "function") {
    const ms = value.toDate().getTime()
    return Number.isFinite(ms) ? ms : null
  }

  const seconds = value.seconds ?? value._seconds
  if (typeof seconds === "number") {
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0
    return seconds * 1000 + Math.floor(nanos / 1000000)
  }

  return null
}

const client = new Anthropic()

export const ABOUT_DANIEL = `Daniel Raad is a software engineer at Palantir and founder of Conversify (WhatsApp marketing platform for restaurants). He builds in public on his personal site, tracking habits, todos, and life goals. He values systems over willpower, writes raw and honestly, and is motivated by legacy and accountability.`

// Fetch the evolving personality from Firestore and format it as a system-prompt section.
// Returns an empty string if no personality has been set yet, so it's safe to concatenate.
export async function getPersonalitySection() {
  try {
    const doc = await adminDb.collection("assistant").doc("personality").get()
    const content = doc.exists ? (doc.data().content || "").trim() : ""
    if (!content) return ""
    return `PERSONALITY (your evolving voice — Daniel has asked you to speak and behave this way; call save_personality to update when he asks you to change it):\n${content}\n\n`
  } catch (e) {
    return ""
  }
}

export const READ_TOOLS = [
  {
    name: "get_today",
    description: "Get a complete snapshot of Daniel's day — habits, todos due/overdue, weight, sleep, and moment. This is the single best tool for daily check-ins. Returns everything the dashboard hub shows.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_todos",
    description: "Get Daniel's current todo list. Completed todos may have a 'note' field with context about what was done.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_habits",
    description: "Get Daniel's habits and today's completion status",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
      },
    },
  },
  {
    name: "get_recent_entries",
    description: "Get recent diary entries/moments from the habit tracker",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "string", description: "Year (e.g. 2026)" },
        month: { type: "string", description: "Month number (e.g. 3)" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "get_routine",
    description: "Get Daniel's weekly routine",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_about",
    description: "Get information about Daniel Raad",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_memory",
    description: "Read the persistent memory file. Use this at the start of conversations to recall context about Daniel — preferences, ongoing topics, things he's mentioned before.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_todo_categories",
    description:
      "Get the configured todo categories. Use this to know which categories exist when assigning or fixing todo categories.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_completed_todos",
    description: "Get todos completed within a date range. Great for evening recaps, weekly reflections, and tracking throughput.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_recent_checkins",
    description: "Get recent scheduled check-in messages (heartbeat) sent to Daniel. Use this to see what was discussed in previous check-ins — what Daniel said he'd do, what was flagged, etc. Great for continuity and accountability.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of recent check-ins to fetch (default 5)" },
      },
    },
  },
  {
    name: "get_week_summary",
    description: "Get a summary of habits, sleep, and weight data for a date range (up to 7 days). Returns per-day completions, averages, and streaks. Great for weekly reflections.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "web_search",
    description: "Search the internet for current information. Use this when Daniel asks about news, facts, research, products, events, or anything that requires up-to-date knowledge beyond what you already know.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        count: { type: "number", description: "Number of results to return (default 5, max 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_blog_posts",
    description: "List Daniel's blog posts with metadata only (no content). Posts come from two sources: 'markdown' (checked-in files, read-only) and 'firestore' (editable). Use the 'source' field to know which posts can be updated.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by type, e.g. 'daily' or 'longform'" },
        includeHidden: { type: "boolean", description: "Include hidden/personal posts. Defaults to true." },
        source: { type: "string", description: "Filter by source: 'markdown' or 'firestore'" },
      },
    },
  },
  {
    name: "get_blog_post",
    description: "Get the full raw markdown content of a blog post by slug. Works for both markdown and firestore posts. Use this before editing so you can see what's currently there.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The post slug" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_recent_activities",
    description: "Get Daniel's recent workouts from Strava (auto-synced from his Garmin watch). Returns runs, rides, swims, gym sessions etc. with distance, duration, pace, heart rate, and elevation. Use this to understand current training load before suggesting workouts.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many days back to fetch (default 14, max 90)" },
        perPage: { type: "number", description: "Max activities to return (default 30, max 100)" },
      },
    },
  },
  {
    name: "get_activity_summary",
    description: "Get a summary of Daniel's training load over a recent period — totals (distance, hours, elevation) and a breakdown by activity type. Great for weekly recaps and judging whether he's over- or under-training before suggesting today's session.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Window in days (default 7)" },
      },
    },
  },
  {
    name: "get_revenue",
    description: "Get Daniel's monthly Conversify revenue progress. Returns the current month's amount vs the £10k target, plus history of prior months. Use this whenever Daniel asks about money, progress, or before suggesting how to spend his time.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "number", description: "How many recent months of history to include (default 6)" },
      },
    },
  },
  {
    name: "get_focus_snapshot",
    description: "The single most important tool. Returns Daniel's whole picture in one call: current month revenue vs £10k, top Revenue todos, last-7-days training load, recent sleep average, and days left in the month. Call this at the start of every check-in so your suggestions are anchored to what actually moves him toward £10k/month while staying healthy. Costs one round trip — use it freely.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_calendar_events",
    description: "List events on Daniel's agent calendar for a date range. Use this before suggesting times or creating new events so you can see what's already booked. Returns event id, summary, start/end times, location, and description.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format. Defaults to today." },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format (inclusive). Defaults to startDate." },
        query: { type: "string", description: "Optional free-text search to filter events" },
        maxResults: { type: "number", description: "Max events to return (default 50, max 250)" },
        timeZone: { type: "string", description: "IANA timezone for date boundaries. Defaults to Europe/London." },
      },
    },
  },
]

export const WRITE_TOOLS = [
  {
    name: "add_todo",
    description: "Add a new todo item",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The todo text" },
        category: { type: "string", description: "Category for the todo" },
        dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
      },
      required: ["text"],
    },
  },
  {
    name: "update_todo",
    description: "Update a todo (mark complete, edit text, reschedule, etc.). When marking a todo complete, add a note summarizing what was done or any context worth keeping.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The todo ID" },
        text: { type: "string" },
        completed: { type: "boolean" },
        category: { type: "string" },
        dueDate: { type: "string", description: "Due date in YYYY-MM-DD format. Pass an empty string or null to clear it." },
        note: { type: "string", description: "Completion note — what was done, outcome, or context" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_todo",
    description: "Delete a todo item",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The todo ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_diary_entry",
    description: "Save a memorable moment for a specific date",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        text: { type: "string", description: "The moment/diary text" },
      },
      required: ["date", "text"],
    },
  },
  {
    name: "toggle_habit",
    description: "Mark a habit as done or undone for a date",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        habitId: { type: "string", description: "The habit ID" },
        value: { type: "boolean" },
      },
      required: ["date", "habitId", "value"],
    },
  },
  {
    name: "save_sleep",
    description: "Log sleep data for a date",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        sleep: { type: "string", description: "Sleep time (e.g. '7.5' hours or '23:00')" },
      },
      required: ["date", "sleep"],
    },
  },
  {
    name: "save_weight",
    description: "Log weight for a date",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        weight: { type: "number", description: "Weight in kg" },
      },
      required: ["date", "weight"],
    },
  },
  {
    name: "save_memory",
    description: "Update the persistent memory file. Use this to remember important things Daniel mentions — preferences, life updates, recurring topics, goals, things he wants you to remember. Write the FULL updated memory content (markdown). Be selective — only save things worth remembering across conversations.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The full markdown content to save as memory" },
      },
      required: ["content"],
    },
  },
  {
    name: "save_personality",
    description: "Update your own evolving personality — how you speak, your tone, style rules, quirks, things to do or avoid. The full content is injected into your system prompt on every future turn, so this is how you literally become whoever Daniel wants you to be. Use this ONLY when Daniel explicitly asks you to change, add, or remove something about how you talk or behave (e.g. 'be more sarcastic', 'stop using bullet points', 'call me boss'). The existing personality is already shown to you at the top of this system prompt — write the FULL updated content as a REPLACEMENT, preserving anything still relevant. Write in second person ('You are...', 'You always...') as instructions to yourself.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Full markdown content of the new personality" },
      },
      required: ["content"],
    },
  },
  {
    name: "log_work",
    description: "Append an entry to Daniel's work log for a given day. Use whenever he tells you what he did at work — Conversify, Palantir, side projects. The log captures activity, durations, what was hard, what shipped. Each call appends a timestamped line; previous entries are preserved.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What he did. Free-form, e.g. '90 min on Conversify onboarding flow — landed the Stripe webhook'" },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
        durationMin: { type: "number", description: "Optional duration in minutes" },
        project: { type: "string", description: "Optional project tag, e.g. 'Conversify', 'Palantir'" },
      },
      required: ["text"],
    },
  },
  {
    name: "log_training",
    description: "Append an entry to Daniel's training log for a given day. Use for gym/training context that Strava doesn't capture: RPE, how it felt, sets/reps for strength work, mobility sessions, recovery notes. Strava handles the numbers (distance, pace, HR) — this is for the qualitative side. Each call appends a timestamped line.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Training note, e.g. 'Squats 5x5 @ 100kg, felt heavy by set 4' or 'Z2 felt easy, HR stayed under 145'" },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
        sessionType: { type: "string", description: "Optional type: 'run', 'bike', 'swim', 'gym', 'mobility', 'rest'" },
      },
      required: ["text"],
    },
  },
  {
    name: "update_revenue",
    description: "Set or adjust Daniel's Conversify revenue for a given month. Use 'set' to overwrite the month's total, or 'add' to add a delta (e.g. when he says 'we just closed £400'). Stored in GBP, after-tax. Always confirm the amount with Daniel before writing.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format. Defaults to current month." },
        amount: { type: "number", description: "Amount in GBP (after tax)" },
        mode: { type: "string", description: "'set' to overwrite, 'add' to add a delta. Defaults to 'set'." },
        note: { type: "string", description: "Optional context — what closed, source, etc." },
      },
      required: ["amount"],
    },
  },
  {
    name: "create_blog_post",
    description: "Create a new blog post draft",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        excerpt: { type: "string" },
        content: { type: "string", description: "Markdown content" },
        tags: { type: "array", items: { type: "string" } },
        hidden: { type: "boolean", description: "Whether this is a hidden/personal post" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_blog_post",
    description: "Update a firestore-backed blog post. Only works on posts where source='firestore' (markdown posts are checked into git and read-only). Pass only the fields you want to change. To publish a hidden post, set hidden=false. To unpublish, set hidden=true.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The post slug to update" },
        title: { type: "string" },
        excerpt: { type: "string" },
        content: { type: "string", description: "Full markdown content (replaces existing)" },
        tags: { type: "array", items: { type: "string" } },
        hidden: { type: "boolean", description: "false to publish, true to unpublish" },
        type: { type: "string", description: "'daily' or 'longform'" },
        date: { type: "string", description: "Post date in YYYY-MM-DD format" },
      },
      required: ["slug"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create a new event on Daniel's agent calendar. Use this to block focus time, reminders, appointments, etc. For all-day events, pass start/end as YYYY-MM-DD. For timed events, pass ISO 8601 datetime strings (e.g. '2026-04-12T07:00:00').",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Event title" },
        start: { type: "string", description: "Start datetime (ISO 8601) or date (YYYY-MM-DD for all-day)" },
        end: { type: "string", description: "End datetime (ISO 8601) or date (YYYY-MM-DD for all-day)" },
        description: { type: "string" },
        location: { type: "string" },
        timeZone: { type: "string", description: "IANA tz, e.g. 'Europe/London'. Defaults to Europe/London." },
      },
      required: ["summary", "start", "end"],
    },
  },
  {
    name: "update_calendar_event",
    description: "Update an existing event on Daniel's agent calendar. Pass the event id from get_calendar_events. Only the fields you provide will change.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The event id" },
        summary: { type: "string" },
        start: { type: "string", description: "New start datetime or date" },
        end: { type: "string", description: "New end datetime or date" },
        description: { type: "string" },
        location: { type: "string" },
        timeZone: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "delete_calendar_event",
    description: "Delete an event from Daniel's agent calendar. This is irreversible — confirm with Daniel before deleting anything that wasn't created by the agent in this conversation.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The event id to delete" },
      },
      required: ["eventId"],
    },
  },
]

export async function executeTool(name, input) {
  switch (name) {
    case "get_today": {
      const today = getDateKey()
      const [year, month] = today.split("-")
      const monthKey = `${year}-${month}`

      // Fetch everything in parallel
      const [habitsDoc, entryDoc, todosSnap] = await Promise.all([
        adminDb.collection("monthHabits").doc(monthKey).get(),
        adminDb.collection("habitEntries").doc(today).get(),
        adminDb.collection("todos").where("completed", "==", false).get(),
      ])

      // Habits
      const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
      const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
      const completions = entry.habits || {}
      const habitList = habits.map((h) => ({
        id: h.id,
        name: h.name,
        done: completions[h.id] === true,
      }))
      const habitsDone = habits.filter((h) => completions[h.id] === true).length

      // Todos — due today or overdue
      const allActive = todosSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const dueTodos = allActive
        .filter((t) => t.dueDate && t.dueDate <= today)
        .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
        .map((t) => ({
          id: t.id,
          text: t.text,
          category: t.category,
          dueDate: t.dueDate,
          overdueDays: compareDateKeys(today, t.dueDate),
        }))
      const unscheduledCount = allActive.filter((t) => !t.dueDate).length
      const totalActiveCount = allActive.length

      return {
        today,
        habits: {
          list: habitList,
          summary: `${habitsDone}/${habits.length} done`,
        },
        todos: {
          dueToday: dueTodos,
          unscheduledCount,
          totalActiveCount,
        },
        weight: entry.weight || null,
        sleep: entry.sleep || null,
        moment: entry.moment || "",
        workLog: entry.workLog || "",
        trainingLog: entry.trainingLog || "",
      }
    }
    case "get_todos": {
      const snap = await adminDb.collection("todos").where("completed", "==", false).get()
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }
    case "get_habits": {
      const date = input.date || getDateKey()
      const [year, month] = date.split("-")
      const docId = `${year}-${month}`
      const habitsDoc = await adminDb.collection("monthHabits").doc(docId).get()
      const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
      const entryDoc = await adminDb.collection("habitEntries").doc(date).get()
      const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
      const completions = entry.habits || {}
      const completed = habits.filter((h) => completions[h.id] === true).length
      const habitList = habits.map((h) => ({
        id: h.id,
        name: h.name,
        done: completions[h.id] === true,
      }))
      return { date, habits: habitList, summary: `${completed}/${habits.length} done`, moment: entry.moment || "" }
    }
    case "get_recent_entries": {
      const prefix = `${input.year}-${String(input.month).padStart(2, "0")}`
      const snap = await adminDb.collection("habitEntries")
        .where("__name__", ">=", prefix)
        .where("__name__", "<=", prefix + "\uf8ff")
        .get()
      return snap.docs.map((d) => ({ date: d.id, ...d.data() }))
    }
    case "get_routine": {
      const doc = await adminDb.collection("weeklyRoutine").doc("default").get()
      return doc.exists ? doc.data() : {}
    }
    case "get_about": {
      return { bio: ABOUT_DANIEL }
    }
    case "get_completed_todos": {
      const startIso = zonedDateTimeToISOString(input.startDate, { hour: 0, minute: 0, second: 0 })
      const endIso = zonedDateTimeToISOString(input.endDate, { hour: 23, minute: 59, second: 59 })
      const startMs = startIso ? new Date(startIso).getTime() : NaN
      const endMs = endIso ? new Date(endIso).getTime() : NaN
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return { error: "startDate and endDate must be valid YYYY-MM-DD dates" }
      }

      const snap = await adminDb.collection("todos")
        .where("completed", "==", true)
        .get()
      return snap.docs
        .map((d) => {
          const todo = { id: d.id, ...d.data() }
          const completedAtMs = completedAtToMs(todo.completedAt)
          return {
            ...todo,
            completedAtMs,
            completedDate: completedAtMs ? getDateKey(new Date(completedAtMs)) : null,
          }
        })
        .filter((todo) => todo.completedAtMs && todo.completedAtMs >= startMs && todo.completedAtMs <= endMs)
        .sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0))
    }
    case "get_recent_checkins": {
      const limit = input.limit || 5
      const snap = await adminDb.collection("checkins")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get()
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    }
    case "get_todo_categories": {
      const doc = await adminDb.collection("todoCategories").doc("config").get()
      return doc.exists ? { categories: doc.data().categories || [] } : { categories: [] }
    }
    case "get_memory": {
      const doc = await adminDb.collection("assistant").doc("memory").get()
      return doc.exists ? { memory: doc.data().content } : { memory: "" }
    }
    case "get_week_summary": {
      const days = []

      // Get habit definitions for relevant months
      const months = new Set()
      for (let date = input.startDate; compareDateKeys(date, input.endDate) <= 0; date = addDaysToDateKey(date, 1)) {
        months.add(date.slice(0, 7))
      }
      const habitsByMonth = {}
      for (const m of months) {
        const doc = await adminDb.collection("monthHabits").doc(m).get()
        habitsByMonth[m] = doc.exists ? doc.data().habits || [] : []
      }

      // Get each day's data
      for (let date = input.startDate; compareDateKeys(date, input.endDate) <= 0; date = addDaysToDateKey(date, 1)) {
        const monthKey = date.slice(0, 7)
        const habits = habitsByMonth[monthKey] || []
        const entryDoc = await adminDb.collection("habitEntries").doc(date).get()
        const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
        const completions = entry.habits || {}
        const completed = habits.filter((h) => completions[h.id] === true).length
        days.push({
          date,
          habits: `${completed}/${habits.length}`,
          habitDetails: habits.map((h) => ({ name: h.name, done: completions[h.id] === true })),
          sleep: entry.sleep || null,
          weight: entry.weight || null,
          moment: entry.moment || "",
        })
      }

      // Compute averages
      const sleepValues = days.map((d) => parseFloat(d.sleep)).filter((v) => !isNaN(v))
      const weightValues = days.map((d) => d.weight).filter((v) => v != null)
      const habitRates = days.map((d) => {
        const [done, total] = d.habits.split("/").map(Number)
        return total > 0 ? done / total : 0
      })

      return {
        days,
        averages: {
          habitCompletion: habitRates.length > 0 ? `${Math.round((habitRates.reduce((a, b) => a + b, 0) / habitRates.length) * 100)}%` : "N/A",
          sleep: sleepValues.length > 0 ? `${(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1)}hrs` : "N/A",
          weight: weightValues.length > 0 ? `${(weightValues.reduce((a, b) => a + b, 0) / weightValues.length).toFixed(1)}kg` : "N/A",
        },
      }
    }
    case "web_search": {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY
      if (!apiKey) return { error: "Web search is not configured (missing BRAVE_SEARCH_API_KEY)" }
      const count = Math.min(input.count || 5, 10)
      try {
        const res = await axios.get("https://api.search.brave.com/res/v1/web/search", {
          params: { q: input.query, count },
          headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
        })
        const results = (res.data.web?.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        }))
        return { query: input.query, results }
      } catch (e) {
        return { error: `Search failed: ${e.message}` }
      }
    }
    case "list_blog_posts": {
      const includeHidden = input.includeHidden === undefined ? true : !!input.includeHidden
      const wantSource = input.source
      const wantType = input.type
      const posts = []

      if (wantSource !== "firestore") {
        const postsDir = path.join(process.cwd(), "posts")
        for (const t of ["daily", "longform"]) {
          if (wantType && wantType !== t) continue
          const dir = path.join(postsDir, t)
          if (!fs.existsSync(dir)) continue
          for (const fileName of fs.readdirSync(dir)) {
            if (!fileName.endsWith(".md")) continue
            const slug = fileName.replace(/\.md$/, "")
            const fileContents = fs.readFileSync(path.join(dir, fileName), "utf8")
            const { data } = matter(fileContents)
            posts.push({
              slug,
              type: t,
              source: "markdown",
              title: data.title || "",
              excerpt: data.excerpt || "",
              date: data.date || "",
              tags: data.tags || [],
              hidden: !!data.hidden,
            })
          }
        }
      }

      if (wantSource !== "markdown") {
        const snap = await adminDb.collection("blogPosts").get()
        for (const doc of snap.docs) {
          const d = doc.data()
          const t = d.type || "daily"
          if (wantType && wantType !== t) continue
          posts.push({
            slug: d.slug || doc.id,
            type: t,
            source: "firestore",
            title: d.title || "",
            excerpt: d.excerpt || "",
            date: d.date || "",
            tags: d.tags || [],
            hidden: !!d.hidden,
          })
        }
      }

      const filtered = includeHidden ? posts : posts.filter((p) => !p.hidden)
      filtered.sort((a, b) => (a.date < b.date ? 1 : -1))
      return { posts: filtered, count: filtered.length }
    }
    case "get_blog_post": {
      const slug = input.slug
      if (!slug) return { error: "slug is required" }

      // Markdown sources first
      const postsDir = path.join(process.cwd(), "posts")
      for (const t of ["daily", "longform"]) {
        const fullPath = path.join(postsDir, t, `${slug}.md`)
        if (fs.existsSync(fullPath)) {
          const fileContents = fs.readFileSync(fullPath, "utf8")
          const { data, content } = matter(fileContents)
          return {
            slug,
            type: t,
            source: "markdown",
            editable: false,
            title: data.title || "",
            excerpt: data.excerpt || "",
            date: data.date || "",
            tags: data.tags || [],
            hidden: !!data.hidden,
            content,
          }
        }
      }

      // Firestore — try slug field, then doc id
      let docSnap = null
      const bySlug = await adminDb.collection("blogPosts").where("slug", "==", slug).limit(1).get()
      if (!bySlug.empty) {
        docSnap = bySlug.docs[0]
      } else {
        const byId = await adminDb.collection("blogPosts").doc(slug).get()
        if (byId.exists) docSnap = byId
      }
      if (!docSnap) return { error: `No blog post found with slug '${slug}'` }
      const d = docSnap.data()
      return {
        slug: d.slug || docSnap.id,
        docId: docSnap.id,
        type: d.type || "daily",
        source: "firestore",
        editable: true,
        title: d.title || "",
        excerpt: d.excerpt || "",
        date: d.date || "",
        tags: d.tags || [],
        hidden: !!d.hidden,
        content: d.content || "",
      }
    }
    case "get_recent_activities": {
      try {
        if (!(await stravaIsConnected())) {
          return { error: "Strava is not connected yet. Tell Daniel to connect Strava from the dashboard." }
        }
        const days = Math.min(input.days || 14, 90)
        const perPage = Math.min(input.perPage || 30, 100)
        const activities = await getRecentActivities({ days, perPage })
        return { days, count: activities.length, activities }
      } catch (e) {
        return { error: `Strava fetch failed: ${e.message}` }
      }
    }
    case "get_activity_summary": {
      try {
        if (!(await stravaIsConnected())) {
          return { error: "Strava is not connected yet. Tell Daniel to connect Strava from the dashboard." }
        }
        const days = input.days || 7
        return await getActivitySummary({ days })
      } catch (e) {
        return { error: `Strava summary failed: ${e.message}` }
      }
    }
    case "get_revenue": {
      const months = input.months || 6
      const doc = await adminDb.collection("assistant").doc("revenue").get()
      const data = doc.exists ? doc.data() : {}
      const monthlyMap = data.monthly || {}
      const today = getDateKey()
      const currentMonth = today.slice(0, 7)
      const monthly = Object.entries(monthlyMap)
        .map(([month, value]) => ({
          month,
          amount: typeof value === "number" ? value : (value?.amount || 0),
          note: typeof value === "object" ? value.note || "" : "",
        }))
        .sort((a, b) => (a.month < b.month ? 1 : -1))
        .slice(0, months)
      const currentAmount = (() => {
        const v = monthlyMap[currentMonth]
        if (typeof v === "number") return v
        if (typeof v === "object" && v) return v.amount || 0
        return 0
      })()
      const target = 10000
      return {
        currentMonth,
        currentAmount,
        target,
        progressPct: Math.round((currentAmount / target) * 100),
        gapToTarget: Math.max(0, target - currentAmount),
        monthly,
      }
    }
    case "get_focus_snapshot": {
      const today = getDateKey()
      const currentMonth = today.slice(0, 7)
      const [year, month] = today.split("-")
      const monthKey = `${year}-${month}`

      // Days left in the month
      const lastOfMonth = new Date(Number(year), Number(month), 0).getDate()
      const dayOfMonth = Number(today.split("-")[2])
      const daysLeftInMonth = Math.max(0, lastOfMonth - dayOfMonth)

      // Parallel fetches: revenue, todos, habits-month-config, today's entry, last 7 days of habit entries
      const sevenDaysAgo = addDaysToDateKey(today, -6)
      const [revDoc, todosSnap, habitsDoc, todayEntryDoc] = await Promise.all([
        adminDb.collection("assistant").doc("revenue").get(),
        adminDb.collection("todos").where("completed", "==", false).get(),
        adminDb.collection("monthHabits").doc(monthKey).get(),
        adminDb.collection("habitEntries").doc(today).get(),
      ])
      const todayEntry = todayEntryDoc.exists ? todayEntryDoc.data() : {}
      const revenue = revDoc.exists ? revDoc.data() : {}
      const monthlyMap = revenue.monthly || {}
      const v = monthlyMap[currentMonth]
      const currentAmount =
        typeof v === "number" ? v : typeof v === "object" && v ? v.amount || 0 : 0

      // Top Revenue todos: due/overdue first, then unscheduled
      const allActive = todosSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const revenueTodos = allActive.filter((t) => (t.category || "").toLowerCase() === "revenue")
      const dueOrOverdue = revenueTodos
        .filter((t) => t.dueDate && t.dueDate <= today)
        .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      const upcoming = revenueTodos
        .filter((t) => t.dueDate && t.dueDate > today)
        .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      const unscheduled = revenueTodos.filter((t) => !t.dueDate)
      const topRevenueTodos = [...dueOrOverdue, ...upcoming, ...unscheduled]
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          text: t.text,
          dueDate: t.dueDate || null,
          overdueDays: t.dueDate ? compareDateKeys(today, t.dueDate) : null,
        }))

      // Last 7 days habit entries → sleep avg + habit completion
      const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
      const sleepValues = []
      let habitDays = 0
      let habitDone = 0
      for (let d = sevenDaysAgo; compareDateKeys(d, today) <= 0; d = addDaysToDateKey(d, 1)) {
        const entryDoc = await adminDb.collection("habitEntries").doc(d).get()
        if (!entryDoc.exists) continue
        const entry = entryDoc.data()
        if (entry.sleep != null && !isNaN(parseFloat(entry.sleep))) {
          sleepValues.push(parseFloat(entry.sleep))
        }
        const completions = entry.habits || {}
        const dayDone = habits.filter((h) => completions[h.id] === true).length
        habitDays += 1
        habitDone += dayDone
      }
      const sleepAvg = sleepValues.length
        ? +(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1)
        : null

      // Training load from Strava — best-effort, swallow if not connected
      let training = null
      try {
        if (await stravaIsConnected()) {
          const summary = await getActivitySummary({ days: 7 })
          training = {
            activities: summary.totals.activities,
            distanceKm: summary.totals.distanceKm,
            hours: summary.totals.hours,
            byType: summary.byType,
          }
        }
      } catch (e) {
        training = { error: e.message }
      }

      return {
        today,
        daysLeftInMonth,
        revenue: {
          currentMonth,
          currentAmount,
          target: 10000,
          progressPct: Math.round((currentAmount / 10000) * 100),
          gapToTarget: Math.max(0, 10000 - currentAmount),
        },
        topRevenueTodos,
        revenueTodoCount: revenueTodos.length,
        todayLogs: {
          workLog: todayEntry.workLog || "",
          trainingLog: todayEntry.trainingLog || "",
          moment: todayEntry.moment || "",
        },
        last7Days: {
          sleepAvgHours: sleepAvg,
          habitCompletion:
            habits.length > 0 && habitDays > 0
              ? `${Math.round((habitDone / (habits.length * habitDays)) * 100)}%`
              : "N/A",
        },
        training,
      }
    }
    case "log_work": {
      const date = input.date || getDateKey()
      const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })
      const tag = input.project ? `[${input.project}]` : ""
      const dur = input.durationMin ? ` (${input.durationMin}m)` : ""
      const line = `[${time}]${tag ? " " + tag : ""}${dur} ${input.text}`
      const ref = adminDb.collection("habitEntries").doc(date)
      const snap = await ref.get()
      const existing = snap.exists ? snap.data().workLog || "" : ""
      const next = existing ? `${existing}\n${line}` : line
      if (snap.exists) {
        await ref.update({ workLog: next })
      } else {
        await ref.set({ habits: {}, moment: "", workLog: next })
      }
      return { ok: true, date, appended: line }
    }
    case "log_training": {
      const date = input.date || getDateKey()
      const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })
      const tag = input.sessionType ? `[${input.sessionType}]` : ""
      const line = `[${time}]${tag ? " " + tag : ""} ${input.text}`
      const ref = adminDb.collection("habitEntries").doc(date)
      const snap = await ref.get()
      const existing = snap.exists ? snap.data().trainingLog || "" : ""
      const next = existing ? `${existing}\n${line}` : line
      if (snap.exists) {
        await ref.update({ trainingLog: next })
      } else {
        await ref.set({ habits: {}, moment: "", trainingLog: next })
      }
      return { ok: true, date, appended: line }
    }
    case "update_revenue": {
      const month = input.month || getDateKey().slice(0, 7)
      const mode = input.mode || "set"
      const ref = adminDb.collection("assistant").doc("revenue")
      const snap = await ref.get()
      const data = snap.exists ? snap.data() : {}
      const monthly = data.monthly || {}
      const existing = monthly[month]
      const existingAmount =
        typeof existing === "number"
          ? existing
          : typeof existing === "object" && existing
          ? existing.amount || 0
          : 0
      const newAmount = mode === "add" ? existingAmount + input.amount : input.amount
      monthly[month] = {
        amount: newAmount,
        note: input.note || (typeof existing === "object" ? existing?.note : "") || "",
        updatedAt: Date.now(),
      }
      await ref.set({ monthly, updatedAt: Date.now() }, { merge: true })
      return {
        ok: true,
        month,
        amount: newAmount,
        target: 10000,
        progressPct: Math.round((newAmount / 10000) * 100),
        gapToTarget: Math.max(0, 10000 - newAmount),
      }
    }
    case "get_calendar_events": {
      try {
        const calendar = getCalendarClient()
        const calendarId = getCalendarId()
        const tz = input.timeZone || "Europe/London"
        const startDate = input.startDate || getDateKey()
        const endDate = input.endDate || startDate
        const timeMin = zonedDateTimeToISOString(startDate, { hour: 0, minute: 0, second: 0 }, tz)
        const timeMax = zonedDateTimeToISOString(endDate, { hour: 23, minute: 59, second: 59 }, tz)
        if (!timeMin || !timeMax) return { error: "startDate and endDate must be valid YYYY-MM-DD dates" }
        const maxResults = Math.min(input.maxResults || 50, 250)

        const res = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          timeZone: tz,
          maxResults,
          singleEvents: true,
          orderBy: "startTime",
          q: input.query || undefined,
        })

        const events = (res.data.items || []).map((e) => ({
          id: e.id,
          summary: e.summary || "(no title)",
          start: e.start?.dateTime || e.start?.date || null,
          end: e.end?.dateTime || e.end?.date || null,
          allDay: !!e.start?.date,
          location: e.location || "",
          description: e.description || "",
          status: e.status,
        }))
        return { calendarId, startDate, endDate, count: events.length, events }
      } catch (e) {
        return { error: `Calendar fetch failed: ${e.message}` }
      }
    }
    case "add_todo": {
      const ref = await adminDb.collection("todos").add({
        text: input.text,
        category: input.category || "",
        completed: false,
        createdAt: Date.now(),
        dueDate: input.dueDate || null,
        completedAt: null,
      })
      return { id: ref.id, ok: true }
    }
    case "update_todo": {
      const { id, ...data } = input
      if (data.completed === true) data.completedAt = Date.now()
      if (data.completed === false) data.completedAt = null
      await adminDb.collection("todos").doc(id).update(data)
      return { ok: true }
    }
    case "delete_todo": {
      await adminDb.collection("todos").doc(input.id).delete()
      return { ok: true }
    }
    case "add_diary_entry": {
      const ref = adminDb.collection("habitEntries").doc(input.date)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.update({ moment: input.text })
      } else {
        await ref.set({ habits: {}, moment: input.text })
      }
      return { ok: true }
    }
    case "toggle_habit": {
      const ref = adminDb.collection("habitEntries").doc(input.date)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.update({ [`habits.${input.habitId}`]: input.value })
      } else {
        await ref.set({ habits: { [input.habitId]: input.value }, moment: "" })
      }
      return { ok: true }
    }
    case "save_sleep": {
      const ref = adminDb.collection("habitEntries").doc(input.date)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.update({ sleep: input.sleep })
      } else {
        await ref.set({ habits: {}, moment: "", sleep: input.sleep })
      }
      return { ok: true }
    }
    case "save_weight": {
      const ref = adminDb.collection("habitEntries").doc(input.date)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.update({ weight: input.weight })
      } else {
        await ref.set({ habits: {}, moment: "", weight: input.weight })
      }
      return { ok: true }
    }
    case "save_memory": {
      await adminDb.collection("assistant").doc("memory").set({ content: input.content, updatedAt: Date.now() })
      return { ok: true }
    }
    case "save_personality": {
      await adminDb.collection("assistant").doc("personality").set({ content: input.content, updatedAt: Date.now() })
      return { ok: true }
    }
    case "create_blog_post": {
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      const ref = await adminDb.collection("blogPosts").add({
        title: input.title,
        slug,
        excerpt: input.excerpt || "",
        content: input.content,
        tags: input.tags || [],
        type: "daily",
        hidden: input.hidden || false,
        source: "firestore",
        date: getDateKey(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      return { id: ref.id, slug, ok: true }
    }
    case "update_blog_post": {
      const slug = input.slug
      if (!slug) return { error: "slug is required" }

      // Refuse markdown posts — they're checked into git
      const postsDir = path.join(process.cwd(), "posts")
      for (const t of ["daily", "longform"]) {
        if (fs.existsSync(path.join(postsDir, t, `${slug}.md`))) {
          return { error: `'${slug}' is a markdown post checked into git. The agent can only edit firestore-backed posts. Use create_blog_post to make a new firestore version, or edit the markdown file via a code commit.` }
        }
      }

      // Find the firestore doc — by slug field, then by doc id
      let docRef = null
      const bySlug = await adminDb.collection("blogPosts").where("slug", "==", slug).limit(1).get()
      if (!bySlug.empty) {
        docRef = bySlug.docs[0].ref
      } else {
        const byId = await adminDb.collection("blogPosts").doc(slug).get()
        if (byId.exists) docRef = byId.ref
      }
      if (!docRef) return { error: `No firestore blog post found with slug '${slug}'` }

      const updates = { updatedAt: Date.now() }
      const allowed = ["title", "excerpt", "content", "tags", "hidden", "type", "date"]
      for (const field of allowed) {
        if (input[field] !== undefined) updates[field] = input[field]
      }
      if (Object.keys(updates).length === 1) {
        return { error: "No fields to update — pass at least one of: " + allowed.join(", ") }
      }
      await docRef.update(updates)
      return { ok: true, slug, updated: Object.keys(updates).filter((k) => k !== "updatedAt") }
    }
    case "create_calendar_event": {
      try {
        const calendar = getCalendarClient()
        const calendarId = getCalendarId()
        const tz = input.timeZone || "Europe/London"
        const res = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: input.summary,
            description: input.description || undefined,
            location: input.location || undefined,
            start: formatCalendarTime(input.start, tz),
            end: formatCalendarTime(input.end, tz),
          },
        })
        return {
          ok: true,
          eventId: res.data.id,
          htmlLink: res.data.htmlLink,
          summary: res.data.summary,
        }
      } catch (e) {
        return { error: `Create event failed: ${e.message}` }
      }
    }
    case "update_calendar_event": {
      try {
        const calendar = getCalendarClient()
        const calendarId = getCalendarId()
        const tz = input.timeZone || "Europe/London"
        const requestBody = {}
        if (input.summary !== undefined) requestBody.summary = input.summary
        if (input.description !== undefined) requestBody.description = input.description
        if (input.location !== undefined) requestBody.location = input.location
        if (input.start !== undefined) requestBody.start = formatCalendarTime(input.start, tz)
        if (input.end !== undefined) requestBody.end = formatCalendarTime(input.end, tz)
        if (Object.keys(requestBody).length === 0) {
          return { error: "No fields to update" }
        }
        const res = await calendar.events.patch({
          calendarId,
          eventId: input.eventId,
          requestBody,
        })
        return {
          ok: true,
          eventId: res.data.id,
          summary: res.data.summary,
          updated: Object.keys(requestBody),
        }
      } catch (e) {
        return { error: `Update event failed: ${e.message}` }
      }
    }
    case "delete_calendar_event": {
      try {
        const calendar = getCalendarClient()
        const calendarId = getCalendarId()
        await calendar.events.delete({ calendarId, eventId: input.eventId })
        return { ok: true, eventId: input.eventId }
      } catch (e) {
        return { error: `Delete event failed: ${e.message}` }
      }
    }
    default:
      return { error: "Unknown tool" }
  }
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514"

export async function runChatLoop({ messages, tools, systemPrompt, model, maxTokens }) {
  const useModel = model || DEFAULT_MODEL
  const useMaxTokens = maxTokens || 1024
  let claudeMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let response = await client.messages.create({
    model: useModel,
    max_tokens: useMaxTokens,
    system: systemPrompt,
    tools,
    messages: claudeMessages,
  })

  while (response.stop_reason === "tool_use") {
    const toolBlocks = response.content.filter((b) => b.type === "tool_use")
    const toolResults = []

    for (const block of toolBlocks) {
      const toolNames = tools.map((t) => t.name)
      if (!toolNames.includes(block.name)) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Error: Tool not available.",
        })
        continue
      }

      let result
      try {
        result = await executeTool(block.name, block.input)
      } catch (e) {
        result = { error: e.message || "Tool execution failed" }
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      })
    }

    claudeMessages = [
      ...claudeMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ]

    response = await client.messages.create({
      model: useModel,
      max_tokens: useMaxTokens,
      system: systemPrompt,
      tools,
      messages: claudeMessages,
    })
  }

  const textBlock = response.content.find((b) => b.type === "text")
  return textBlock ? textBlock.text : ""
}
