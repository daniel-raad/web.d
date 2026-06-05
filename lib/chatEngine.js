import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Anthropic from "@anthropic-ai/sdk"
import axios from "axios"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "./firebaseAdmin"
import { getCalendarClient, getCalendarId } from "./googleCalendar"
import { getRecentActivities, getActivitySummary, isConnected as stravaIsConnected } from "./strava"
import { getCurrentWeekProgress, setPlan, getPlan } from "./trainingPlan"
import {
  addDaysToDateKey,
  compareDateKeys,
  getDateKey,
  zonedDateTimeToISOString,
} from "./dates.js"
import { getLangfuse, flushLangfuse } from "./langfuse"

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

export const ABOUT_DANIEL = `Daniel Raad is a software engineer and founder of Conversify (WhatsApp marketing platform for restaurants). He builds in public on his personal site, tracking goals, plans, training, and the work that compounds toward them. He values systems over willpower, writes raw and honestly, and is motivated by legacy and accountability.`

// Single coach prompt — used by both the website chat-box (authed) and the
// Telegram bot. Same agent, same tools, same knowledge of goals/plans/instances.
// Only the `surface` hint differs (formatting affordances). Heartbeat keeps
// its own prompt because it's a scheduled push with structural per-checkin
// templates, not a reactive conversation.
export function buildCoachSystemPrompt({ surface = "chat-web", today, dayName, currentTime, personality = "" }) {
  const surfaceHint =
    surface === "telegram"
      ? "You're messaging Daniel on Telegram — keep replies brief, plain text, no markdown headers. One emoji max if it fits naturally."
      : "You're in the chat-box on Daniel's personal website. Short paragraphs + occasional headers are fine. Keep replies punchy unless he asks for depth."

  const timeLine = currentTime ? `, current time is ${currentTime}` : ""

  return `${personality}You are Daniel's personal coach + accountability partner. The person chatting with you IS Daniel — assume authed. You have full access to read and modify his goals, todos, daily plans, structured task instances, training plan, calendar, Strava activities, revenue, and daily work/training logs. Today is ${dayName} ${today}${timeLine}.

${surfaceHint}

STINTS — the chassis. Daniel runs his life in 75-day stints. Each stint owns up to 4 GOALS that share the same window. At the end you write ONE review (per stint, not per goal) and roll into the next.

ALWAYS call get_current_stint at the start of any planning, check-in, or goal conversation. It returns the active stint AND its goals enriched with hit-rate so far. If stint is null, surface the orphan goals and offer to start a new stint with them (use start_stint).

EVERY DAILY MESSAGE orients in this order: the stint (intent + day X/75), the goals inside it, today's plan. Never let a plan item slip in that doesn't trace to a goal in the current stint.

When the stint is at or near day 75, prompt Daniel for the review and call complete_stint. To begin the next, call start_stint with a fresh intent and the goals carried forward / dropped / added.

Each goal has a TYPE that tells you how to evaluate progress:
- deadline-plan: fixed deadline + weeklyTargets (e.g. Ironman race + per-discipline weekly hour targets).
- outcome-leads: target outcome + leadMeasures (e.g. Conversify monthly revenue).
- process-cadence: floor + target on a primary primitive, no endpoint (e.g. reading minutes/day).

PLAN — the structured daily plan: Each day has a plans/{date} doc with items {templateId, floor, target, rationale, status}. The evening heartbeat writes tomorrow's plan via propose_plan. When Daniel asks you to write or revise a plan mid-stream ("write today's plan", "redo tomorrow"), call propose_plan after loading goals + task templates + today's energy. Floor is the minimum-won-day; target is the ideal.

LOGGING:
- log_instance is the primary structured log path — when Daniel reports a real session (a run, a Conversify build block, a read session), capture it as an instance with values (duration, intensity, quantity, description, outcome). Pass linkedPlanItem to flip the matching plan item to done/partial in the same call.
- log_work and log_training still work for free-form context — both now ALSO write a basic instance behind the scenes when the project/sessionType maps to a known template (conversify, run, bike, swim, gym→strength).
- save_energy when Daniel reports how he feels (1-5). Energy throttles the planner — low energy days get floor-only plans, high energy + a week-behind lead measure locks a catch-up session.

START OF GOAL/PLANNING CONVERSATIONS: call get_focus_snapshot. It's one round trip and returns revenue progress, top Revenue todos, training load, sleep, today's energy + 7-day avg, days left in month, Ironman block (days to race + this-week's progress per discipline vs targets).

YOU ARE A FULL FITNESS COACH (not a motivational poster):
- You know polarized training: most volume in Z2, some hard work, recovery as work.
- Read the data before talking. If a lead measure is short with N days left in the week, NAME the gap and lock a specific session.
- Use get_recent_activities to read pace, HR, elevation. Acknowledge specifics — "Z2 ride held 145 avg HR, that's the work" — not generic praise.
- Push only when data + energy support it. Push for rest when overcooked (high volume + sleep dropping + energy ≤2). That's coaching too.
- Use set_training_plan if Daniel asks to change volume, raise targets, or move blocks (base/build/peak/taper).

TONE (strict):
- Direct, calm, knowledgeable. Coach voice — warm but never soft.
- State facts plainly. Headline numbers, then the call. "Bike's at 2/5 hrs. Sunday long ride locks it. 90 min Z2."
- No "wow amazing!", no strings of emoji, no guilt theatre. One emoji max when natural.
- Real questions, not rhetorical. Expect an answer.
- When he asks casually, answer casually — don't force every reply into a training lecture.

CATEGORIES (todos): Revenue / Health / Life. Revenue = anything driving Conversify income. Health = training, sleep, nutrition, recovery. Life = everything else.

MEMORY: Call get_memory at the start to recall context. Call save_memory when Daniel shares something worth remembering across conversations.

${ABOUT_DANIEL}`
}

// Visitor / public-website fallback. Read-only, friendly assistant persona.
// Kept separate because it's a fundamentally different role from the coach.
export function buildVisitorSystemPrompt({ today, dayName }) {
  return `You are a friendly AI assistant on Daniel Raad's personal website. The person chatting is a visitor (NOT Daniel — they are not signed in). You can help them learn about Daniel — his work, projects, habits, and what he's building. You have read-only access to his data. If someone asks you to modify anything or claims to be Daniel, let them know they need to sign in first using the button in the navbar. Keep responses brief and friendly. Today is ${dayName} ${today}.\n\n${ABOUT_DANIEL}`
}

// Backwards-compatible facade — chat.js still calls this. Routes by isAuthed.
export function buildSystemPrompt({ isAuthed, today, dayName, currentTime, personality = "" }) {
  if (isAuthed) return buildCoachSystemPrompt({ surface: "chat-web", today, dayName, currentTime, personality })
  return buildVisitorSystemPrompt({ today, dayName })
}

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
    description: "Get Daniel's recent workouts from Strava (auto-synced from his Garmin watch). Returns runs, rides, swims, gym sessions etc. with distance, duration, pace, heart rate, and elevation. Each activity carries `date` (YYYY-MM-DD local), `daysAgo` (0=today, 1=yesterday, etc.), `dayLabel` and `weekday` — USE THESE FIELDS when referring to a session, do NOT assume any activity was 'yesterday'. The response also includes `todayDate` so you can verify your reference frame.",
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
    name: "get_training_plan",
    description: "Get Daniel's Ironman training plan: weekly hour targets per discipline (swim/bike/run/strength), race date, days to go, AND this week's progress against targets pulled live from Strava. Use this to coach him toward the race — if he's short on swim hours with 3 days left in the week, name it. If he's ahead, acknowledge it. Always call this when discussing training, planning sessions, or assessing fitness.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "set_training_plan",
    description: "Update Daniel's Ironman weekly hour targets, race date, or block notes. Use this when he asks to change his training volume (e.g. 'bump bike to 7hrs', 'we're in taper, drop everything 30%') or set focus notes for the current block. Only pass the fields you want to change — others are preserved.",
    input_schema: {
      type: "object",
      properties: {
        targetsHoursPerWeek: {
          type: "object",
          description: "Weekly hour targets per discipline. Pass only disciplines you want to change.",
          properties: {
            swim: { type: "number" },
            bike: { type: "number" },
            run: { type: "number" },
            strength: { type: "number" },
          },
        },
        raceDate: { type: "string", description: "Race date in YYYY-MM-DD format" },
        notes: { type: "string", description: "Free-form notes about the current training block / focus" },
      },
    },
  },
  {
    name: "get_revenue",
    description: "Get Daniel's monthly after-tax income progress (across any stream — Conversify, contracts, consulting, etc.). Returns the current month's amount vs the £10k target, plus history of prior months. Use this whenever Daniel asks about money, progress, or before suggesting how to spend his time.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "number", description: "How many recent months of history to include (default 6)" },
      },
    },
  },
  {
    name: "get_focus_snapshot",
    description: "The single most important tool. Returns Daniel's whole picture in one call: current month after-tax income vs £10k (any stream), top Revenue todos, last-7-days training load, recent sleep average, days left in the month, AND his Ironman block — days to race, this week's progress per discipline (swim/bike/run/strength) vs targets. Call this at the start of every check-in so suggestions are anchored to what actually moves him toward £10k while training for Ironman 70.3. Costs one round trip — use it freely.",
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
  {
    name: "get_current_stint",
    description: "Get Daniel's CURRENT 75-DAY STINT — the operational frame for everything he's doing right now. Returns the stint (startDate, endDate, intent, state, days remaining) AND the up-to-4 goals inside it, each enriched with hit-rate over the stint window. Call this at the start of any planning, check-in, or goal conversation — it replaces the older get_goals call. If no stint is active, returns stint=null and surfaces any orphan goals that need to be attached.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_stints",
    description: "List all of Daniel's stints (past, current, future). Use when he asks about his history, wants to see prior reviews, or asks 'when did stint X end?'. Each list entry includes title, intent, dates, state, and goalCount; for full goal details on a specific stint use get_current_stint (for the active one) or a follow-up read.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_goals",
    description: "Get individual goals from the goals collection. Defaults to non-archived goals across all stints. You usually want get_current_stint instead — it returns goals embedded in the active stint with hit-rates already computed.",
    input_schema: {
      type: "object",
      properties: {
        stintId: { type: "string", description: "Only return goals in this stint." },
        state: { type: "string", description: "Filter by state (active|completed|abandoned|archived). Default returns non-archived." },
      },
    },
  },
  {
    name: "get_task_templates",
    description: "Get Daniel's task templates — the reusable shapes for what gets planned and logged. Each template declares which primitives apply (duration, intensity, quantity, description, outcome), links to a goal, and carries a suggestedFloor + suggestedTarget. Use this with get_goals to know what to put in tomorrow's plan.",
    input_schema: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "Optional — only return templates linked to this goal id." },
      },
    },
  },
  {
    name: "get_instances",
    description: "Get structured task instances (logged sessions) for a date range, optionally filtered by templateId or goalId. Each instance carries the values captured (duration, intensity, quantity, description, outcome) plus a source field. Use for richer recaps than the free-form workLog/trainingLog text and for grading.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD. Defaults to today." },
        endDate: { type: "string", description: "End date YYYY-MM-DD (inclusive). Defaults to startDate." },
        templateId: { type: "string", description: "Optional filter by template id." },
        goalId: { type: "string", description: "Optional filter by goal id." },
        limit: { type: "number", description: "Max instances to return (default 50, max 200)." },
      },
    },
  },
  {
    name: "get_plan",
    description: "Get the structured plan for a date (typically today or tomorrow). Returns the items list with floor/target per task and the rationale that was written when the plan was generated. Use in the morning to recall what was committed last night, and to check whether the plan matches today's energy.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
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
    name: "update_plan_item",
    description: "Surgically edit a single item in an existing plan — change floor, target, rationale, time slot, templateId, or status without overwriting the whole plan. Use this when Daniel asks for a specific tweak (\"bump tomorrow's bike to 90 min\", \"change today's run rationale to a tempo focus\") instead of re-running propose_plan. Pass only the fields you want to change in patch.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Plan date YYYY-MM-DD." },
        itemIndex: { type: "number", description: "Index of the item in plans/{date}.items (0-based)." },
        patch: {
          type: "object",
          description: "Partial update — only fields to change. Allowed: floor (object), target (object), rationale (string), timeSlot (string), templateId (string — validated against registry), status (planned | done | partial | skipped).",
        },
      },
      required: ["date", "itemIndex", "patch"],
    },
  },
  {
    name: "log_instance",
    description: "Log a structured task instance — the new primary log path. Each instance ties to a templateId (which carries the goal link) and captures whatever primitives apply: duration, intensity, quantity, description, outcome. Use this whenever Daniel reports doing a real session (a run, a Conversify build block, a read session). For free-form context without enough structure, fall back to log_work / log_training — both still work and ALSO write a basic instance behind the scenes. Optionally link to a plan item to flip its status to done/partial in the same call.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date YYYY-MM-DD. Defaults to today." },
        templateId: { type: "string", description: "ID from taskTemplates (e.g. 'run', 'conversify', 'read')." },
        values: {
          type: "object",
          description: "Captured primitives. Pass only the ones that apply to this template. Keys: duration (min), intensity (1-5), quantity (units per template.quantityUnit), description (text), outcome (text).",
        },
        note: { type: "string", description: "Optional free-form note in addition to description/outcome." },
        linkedPlanItem: {
          type: "object",
          description: "Optional back-link to a plan item to flip its status.",
          properties: {
            date: { type: "string", description: "Plan date YYYY-MM-DD." },
            itemIndex: { type: "number", description: "Index of the item in plans/{date}.items." },
            status: { type: "string", description: "New status: done | partial | skipped" },
          },
          required: ["date", "itemIndex", "status"],
        },
      },
      required: ["templateId", "values"],
    },
  },
  {
    name: "propose_plan",
    description: "Write the structured plan for a date — typically tomorrow, called from the evening check-in. The plan is the floor-first version of the day: each item carries a floor (minimum-won-day) AND a target (ideal). Pulls from goals + task templates + today's energy. Each item must reference a real templateId from get_task_templates. Overwrites any existing plan for that date — idempotent re-runs are fine.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date the plan is FOR, YYYY-MM-DD. Usually tomorrow." },
        items: {
          type: "array",
          description: "The plan items — one per task. Order matters; first is the day's priority.",
          items: {
            type: "object",
            properties: {
              templateId: { type: "string", description: "ID from taskTemplates (e.g. 'run', 'conversify', 'read')." },
              floor: {
                type: "object",
                description: "Minimum-won-day values per primitive. e.g. { duration: 30 } means 30 min counts as a win.",
              },
              target: {
                type: "object",
                description: "Ideal values per primitive. e.g. { duration: 60 }.",
              },
              rationale: {
                type: "string",
                description: "One line: WHY this is on tomorrow's plan and at this size. Reference the goal, the week-to-date gap, or energy.",
              },
              timeSlot: { type: "string", description: "Optional rough window, e.g. '06:00-07:00' or 'evening'." },
            },
            required: ["templateId", "floor", "rationale"],
          },
        },
        energyBasis: {
          type: "object",
          description: "How energy shaped the plan. Carry it forward so morning brief can explain the choices.",
          properties: {
            value: { type: "number", description: "Energy value used, 1-5." },
            source: { type: "string", description: "Where it came from: 'today', 'yesterday', or '7d-avg'." },
            note: { type: "string", description: "One line on how it shaped the targets (e.g. 'pulled run target down from 75 to 60 min')." },
          },
        },
        notes: { type: "string", description: "Free-form overall plan notes — what's the shape of tomorrow." },
      },
      required: ["date", "items"],
    },
  },
  {
    name: "save_energy",
    description: "Log Daniel's subjective energy for a date on a 1-5 scale. 1 = drained / sick / no juice. 3 = baseline workday. 5 = peak / fresh / can push hard. Energy throttles the planner — log it when Daniel shares how he's feeling (\"flat today\", \"buzzing\", \"crushed\"). Always confirm the value back to him.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        energy: { type: "number", description: "Energy 1-5 (integer)" },
      },
      required: ["date", "energy"],
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
    description: "Set or adjust Daniel's after-tax income for a given month (any stream — Conversify, contracts, consulting). Use 'set' to overwrite the month's total, or 'add' to add a delta (e.g. when he says 'we just closed £400'). Stored in GBP, after-tax. Always confirm the amount and the source with Daniel before writing.",
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
  {
    name: "upsert_goal",
    description: "Create or update a goal in the goals collection. The goals collection is the source of truth for the planner — use this whenever Daniel asks to add a new goal, rename one, change its target/floor/deadline, edit lead measures, or archive it. Pass `id` to update an existing goal; omit to create a new one (id will be derived from title). Pass only the fields you want to change — others are preserved. Use `status: 'archived'` instead of deleting unless Daniel explicitly asks for deletion.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Existing goal id to update. Omit to create a new goal." },
        type: { type: "string", description: "deadline-plan | outcome-leads | process-cadence" },
        title: { type: "string" },
        status: { type: "string", description: "active | paused | archived" },
        priority: { type: "number" },
        rationale: { type: "string", description: "Why this goal matters — read by the coach when framing check-ins." },
        target: { type: "number", description: "Outcome target (outcome-leads) or aspirational primitive target (process-cadence)." },
        floor: { type: "number", description: "Minimum acceptable level (process-cadence)." },
        unit: { type: "string", description: "GBP, minutes, steps, etc." },
        cadence: { type: "string", description: "daily | weekly | monthly" },
        deadline: { type: "string", description: "YYYY-MM-DD (deadline-plan only)." },
        primaryPrimitive: { type: "string", description: "duration | intensity | quantity | description | outcome (process-cadence)." },
        weeklyTargets: { type: "object", description: "Per-discipline weekly targets (deadline-plan, e.g. { run: 3, bike: 5 })." },
        leadMeasures: { type: "array", items: { type: "string" }, description: "Human-readable lead measures (outcome-leads)." },
        leadMeasureTemplates: { type: "array", items: { type: "string" }, description: "TemplateIds whose instances feed this goal." },
        window: { type: "number", description: "Rolling hit-rate window in days (process-cadence)." },
        context: { type: "object", description: "Free-form context (e.g. monthlySalaryGBP)." },
        state: { type: "string", description: "Goal state within its stint: active | completed | abandoned | archived. Defaults to 'active' on create." },
        why: { type: "string", description: "One-line tagline anchoring why this goal matters — separate from rationale." },
        color: { type: "string", description: "Hex color for the goal card (e.g. '#ef4444')." },
        icon: { type: "string", description: "Single emoji for the goal." },
        stintId: { type: "string", description: "Which stint this goal belongs to. Defaults to the currently-active stint when creating." },
      },
    },
  },
  {
    name: "delete_goal",
    description: "Hard-delete a goal from the goals collection. Prefer upsert_goal with status='archived' unless Daniel explicitly asks for deletion. This is irreversible.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The goal id to delete." },
      },
      required: ["id"],
    },
  },
  {
    name: "start_stint",
    description: "Start a NEW 75-day stint. Use when Daniel says 'start the next stint' or 'kick off a new block'. The stint is just a window + intent paragraph — goals are standalone and tracked across whichever stint window is active. There can only be ONE active stint at a time.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label, e.g. 'Stint 1 — base + revenue'." },
        intent: { type: "string", description: "One paragraph: what these 75 days are FOR. The theme/prompt that anchors the block." },
        startDate: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
        lengthDays: { type: "number", description: "Defaults to 75." },
      },
      required: ["intent"],
    },
  },
  {
    name: "complete_stint",
    description: "End the current stint with a review covering all goals. Use when the stint's 75 days are up (or Daniel calls it early). Writes the review to the stint and flips state to completed. After completing, call start_stint to begin the next one.",
    input_schema: {
      type: "object",
      properties: {
        stintId: { type: "string", description: "Stint id to complete. Defaults to the currently-active one." },
        review: {
          type: "object",
          description: "The end-of-stint review.",
          properties: {
            rating: { type: "number", description: "1-5 self-rating." },
            wins: { type: "string", description: "What worked. Be honest, name specifics." },
            misses: { type: "string", description: "What slipped. Where did the plan break?" },
            nextFocus: { type: "string", description: "The one shift for the next stint." },
            body: { type: "string", description: "Optional long-form reflection." },
          },
          required: ["wins", "misses"],
        },
      },
      required: ["review"],
    },
  },
  {
    name: "patch_stint",
    description: "Update an existing stint — rename it, edit its intent, shift its dates, or change its state. Use when Daniel asks to rename a stint ('call stint 2 \"race recovery\"'), revise the intent, fix the window, or archive/restore it. Pass only the fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        stintId: { type: "string", description: "Stint id to update. Defaults to the currently-active stint if omitted." },
        title: { type: "string", description: "Short name for the stint." },
        intent: { type: "string", description: "The block's intent / prompt — what these 75 days are FOR." },
        startDate: { type: "string", description: "YYYY-MM-DD. When changing, also update endDate (or pass lengthDays to recompute)." },
        endDate: { type: "string", description: "YYYY-MM-DD (inclusive)." },
        lengthDays: { type: "number", description: "Optional helper: recompute endDate as startDate + lengthDays - 1. Ignored when endDate is given." },
        state: { type: "string", description: "planning | active | completed | archived" },
      },
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
        energy: entry.energy ?? null,
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
        return { todayDate: getDateKey(), days, count: activities.length, activities }
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
    case "get_training_plan": {
      try {
        return await getCurrentWeekProgress()
      } catch (e) {
        return { error: `Training plan fetch failed: ${e.message}` }
      }
    }
    case "set_training_plan": {
      try {
        const updated = await setPlan({
          targetsHoursPerWeek: input.targetsHoursPerWeek,
          raceDate: input.raceDate,
          notes: input.notes,
        })
        return { ok: true, plan: updated }
      } catch (e) {
        return { error: `Training plan update failed: ${e.message}` }
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

      // Last 7 days habit entries → sleep avg + energy avg + habit completion
      const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
      const sleepValues = []
      const energyValues = []
      let habitDays = 0
      let habitDone = 0
      for (let d = sevenDaysAgo; compareDateKeys(d, today) <= 0; d = addDaysToDateKey(d, 1)) {
        const entryDoc = await adminDb.collection("habitEntries").doc(d).get()
        if (!entryDoc.exists) continue
        const entry = entryDoc.data()
        if (entry.sleep != null && !isNaN(parseFloat(entry.sleep))) {
          sleepValues.push(parseFloat(entry.sleep))
        }
        if (entry.energy != null && Number.isFinite(Number(entry.energy))) {
          energyValues.push(Number(entry.energy))
        }
        const completions = entry.habits || {}
        const dayDone = habits.filter((h) => completions[h.id] === true).length
        habitDays += 1
        habitDone += dayDone
      }
      const sleepAvg = sleepValues.length
        ? +(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1)
        : null
      const energyAvg = energyValues.length
        ? +(energyValues.reduce((a, b) => a + b, 0) / energyValues.length).toFixed(1)
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

      // Ironman training plan — current week vs targets, race countdown
      let ironman = null
      try {
        const wp = await getCurrentWeekProgress()
        ironman = {
          daysToRace: wp.daysToRace,
          weekStart: wp.weekStart,
          totals: wp.totals,
          progress: wp.progress,
          notes: wp.notes,
        }
      } catch (e) {
        ironman = { error: e.message }
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
          energy: todayEntry.energy ?? null,
          sleep: todayEntry.sleep ?? null,
        },
        last7Days: {
          sleepAvgHours: sleepAvg,
          energyAvg,
          energySamples: energyValues.length,
          habitCompletion:
            habits.length > 0 && habitDays > 0
              ? `${Math.round((habitDone / (habits.length * habitDays)) * 100)}%`
              : "N/A",
        },
        training,
        ironman,
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

      // Dual-write structured instance when project maps to a known template.
      let instanceId = null
      const projectKey = (input.project || "").toLowerCase().trim()
      if (projectKey) {
        const tplSnap = await adminDb.collection("taskTemplates").doc(projectKey).get()
        if (tplSnap.exists) {
          const tpl = tplSnap.data()
          const values = { description: input.text }
          if (input.durationMin) values.duration = input.durationMin
          const instRef = await adminDb.collection("instances").add({
            date,
            templateId: projectKey,
            goalId: tpl.goalId || null,
            values,
            note: "",
            timestamp: Date.now(),
            source: "log_work",
            grade: null,
          })
          instanceId = instRef.id
        }
      }

      return { ok: true, date, appended: line, instanceId }
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

      // Dual-write structured instance when sessionType maps to a known template.
      // mobility / rest stay text-only — no template covers them.
      const TRAINING_TYPE_TO_TEMPLATE = {
        run: "run", bike: "bike", swim: "swim", gym: "strength", strength: "strength",
      }
      const templateId = TRAINING_TYPE_TO_TEMPLATE[(input.sessionType || "").toLowerCase()]
      let instanceId = null
      if (templateId) {
        const tplSnap = await adminDb.collection("taskTemplates").doc(templateId).get()
        if (tplSnap.exists) {
          const tpl = tplSnap.data()
          const instRef = await adminDb.collection("instances").add({
            date,
            templateId,
            goalId: tpl.goalId || null,
            values: { description: input.text },
            note: "",
            timestamp: Date.now(),
            source: "log_training",
            grade: null,
          })
          instanceId = instRef.id
        }
      }

      return { ok: true, date, appended: line, instanceId }
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
    case "get_goals": {
      const snap = await adminDb.collection("goals").get()
      let goals = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const wantState = input.state
      if (!wantState) {
        goals = goals.filter((g) => (g.state || (g.status === "archived" ? "archived" : "active")) !== "archived")
      } else if (wantState !== "all") {
        goals = goals.filter((g) => (g.state || "active") === wantState)
      }
      goals.sort((a, b) => (a.priority || 99) - (b.priority || 99))
      return { count: goals.length, goals }
    }
    case "get_current_stint": {
      const { getCurrentStint, loadActiveGoals, hitsForGoalInWindow, buildDates, withGoalDisplayDefaults } = await import("./stints.js")
      const today = getDateKey()
      const stint = await getCurrentStint(today)
      if (!stint) return { stint: null, today }
      const dates = buildDates(stint.startDate, stint.endDate)
      const goals = (await loadActiveGoals()).map((g, i) => withGoalDisplayDefaults(g, i))
      const instSnap = await adminDb.collection("instances")
        .where("date", ">=", stint.startDate)
        .where("date", "<=", stint.endDate)
        .get()
      const instances = instSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const enrichedGoals = goals.map((g) => {
        const hits = hitsForGoalInWindow(g, instances, dates)
        const upToToday = hits.filter((h) => h.date <= today)
        const hitsCount = upToToday.filter((h) => h.hit).length
        const hitRate = upToToday.length > 0 ? hitsCount / upToToday.length : 0
        return { ...g, hitsCount, hitRate, daysElapsed: upToToday.length, daysTotal: dates.length }
      })
      return { stint: { ...stint, goals: enrichedGoals }, today }
    }
    case "get_stints": {
      const { loadAllStints } = await import("./stints.js")
      const stints = await loadAllStints()
      const goalsSnap = await adminDb.collection("goals").get()
      const byStint = new Map()
      for (const d of goalsSnap.docs) {
        const sid = d.data().stintId
        if (!sid) continue
        byStint.set(sid, (byStint.get(sid) || 0) + 1)
      }
      return {
        count: stints.length,
        stints: stints.map((s) => ({ ...s, goalCount: byStint.get(s.id) || 0 })),
      }
    }
    case "upsert_goal": {
      // Whitelist of editable fields — we never let the agent stamp arbitrary
      // keys onto a goal doc.
      const ALLOWED = [
        "type", "title", "status", "state", "priority", "rationale", "why",
        "target", "floor", "unit", "cadence", "deadline", "color", "icon",
        "primaryPrimitive", "weeklyTargets", "leadMeasures",
        "leadMeasureTemplates", "window", "context",
        "completion",
      ]
      const patch = {}
      for (const k of ALLOWED) if (input[k] !== undefined) patch[k] = input[k]

      let id = input.id
      if (id) {
        const ref = adminDb.collection("goals").doc(id)
        const snap = await ref.get()
        if (!snap.exists) return { error: `Goal "${id}" not found. Omit id to create a new one.` }
        await ref.set({ ...patch, updatedAt: Date.now() }, { merge: true })
        const after = await ref.get()
        return { ok: true, action: "updated", goal: { id, ...after.data() } }
      }

      if (!input.title) return { error: "title is required to create a new goal" }
      if (!input.type) return { error: "type is required to create a new goal (deadline-plan | outcome-leads | process-cadence)" }
      // Slugify title into a kebab-case id.
      id = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
      const existing = await adminDb.collection("goals").doc(id).get()
      if (existing.exists) {
        return { error: `Goal id "${id}" already exists. Pass id="${id}" to update it instead.` }
      }
      await adminDb.collection("goals").doc(id).set({
        status: "active",
        priority: 5,
        ...patch,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      const after = await adminDb.collection("goals").doc(id).get()
      return { ok: true, action: "created", goal: { id, ...after.data() } }
    }
    case "delete_goal": {
      const ref = adminDb.collection("goals").doc(input.id)
      const snap = await ref.get()
      if (!snap.exists) return { error: `Goal "${input.id}" not found.` }
      await ref.delete()
      return { ok: true, action: "deleted", id: input.id }
    }
    case "start_stint": {
      const { getCurrentStint, computeStintEnd, DEFAULT_STINT_DAYS, nextStintIndex } = await import("./stints.js")
      const today = getDateKey()
      const existing = await getCurrentStint(today)
      if (existing) return { error: `Stint "${existing.id}" is already active. Complete it before starting a new one.` }

      const startDate = input.startDate || today
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: "startDate must be YYYY-MM-DD" }
      const lengthDays = Number(input.lengthDays) || DEFAULT_STINT_DAYS
      const endDate = computeStintEnd(startDate, lengthDays)
      const index = await nextStintIndex()
      const stintId = `stint-${index}`

      await adminDb.collection("stints").doc(stintId).set({
        index,
        title: input.title || `Stint ${index}`,
        intent: input.intent || "",
        startDate,
        endDate,
        state: "active",
        review: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      return { ok: true, id: stintId }
    }
    case "complete_stint": {
      const { getCurrentStint } = await import("./stints.js")
      const today = getDateKey()
      let stintId = input.stintId
      if (!stintId) {
        const current = await getCurrentStint(today)
        if (!current) return { error: "No active stint to complete. Pass stintId explicitly." }
        stintId = current.id
      }
      const ref = adminDb.collection("stints").doc(stintId)
      const snap = await ref.get()
      if (!snap.exists) return { error: `Stint "${stintId}" not found.` }
      const review = input.review || {}
      await ref.set({
        state: "completed",
        review: {
          rating: review.rating ?? null,
          wins: review.wins || "",
          misses: review.misses || "",
          nextFocus: review.nextFocus || "",
          body: review.body || "",
          completedAt: Date.now(),
        },
        updatedAt: Date.now(),
      }, { merge: true })
      return { ok: true, id: stintId }
    }
    case "patch_stint": {
      const { getCurrentStint, computeStintEnd, STINT_STATES } = await import("./stints.js")
      const today = getDateKey()
      let stintId = input.stintId
      if (!stintId) {
        const current = await getCurrentStint(today)
        if (!current) return { error: "No active stint and no stintId provided." }
        stintId = current.id
      }
      const ref = adminDb.collection("stints").doc(stintId)
      const snap = await ref.get()
      if (!snap.exists) return { error: `Stint "${stintId}" not found.` }
      const existing = snap.data()

      const ALLOWED = ["title", "intent", "startDate", "endDate", "state"]
      const patch = {}
      for (const k of ALLOWED) if (input[k] !== undefined) patch[k] = input[k]

      if (patch.state && !STINT_STATES.includes(patch.state)) {
        return { error: `invalid state "${patch.state}". allowed: ${STINT_STATES.join(", ")}` }
      }
      for (const k of ["startDate", "endDate"]) {
        if (patch[k] && !/^\d{4}-\d{2}-\d{2}$/.test(patch[k])) {
          return { error: `${k} must be YYYY-MM-DD` }
        }
      }
      // lengthDays helper — recompute endDate when caller passes length but no explicit end.
      if (input.lengthDays && !patch.endDate) {
        const start = patch.startDate || existing.startDate
        if (start) patch.endDate = computeStintEnd(start, Number(input.lengthDays))
      }

      patch.updatedAt = Date.now()
      await ref.set(patch, { merge: true })
      const after = await ref.get()
      return { ok: true, id: stintId, stint: { id: stintId, ...after.data() } }
    }
    case "get_task_templates": {
      const snap = await adminDb.collection("taskTemplates").get()
      const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const filtered = input.goalId ? templates.filter((t) => t.goalId === input.goalId) : templates
      return { count: filtered.length, templates: filtered }
    }
    case "get_plan": {
      const date = input.date || getDateKey()
      const doc = await adminDb.collection("plans").doc(date).get()
      if (!doc.exists) return { date, plan: null, exists: false }
      return { date, plan: doc.data(), exists: true }
    }
    case "get_instances": {
      const startDate = input.startDate || getDateKey()
      const endDate = input.endDate || startDate
      const limit = Math.min(input.limit || 50, 200)
      let q = adminDb
        .collection("instances")
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
      const snap = await q.get()
      let instances = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      if (input.templateId) instances = instances.filter((i) => i.templateId === input.templateId)
      if (input.goalId) instances = instances.filter((i) => i.goalId === input.goalId)
      instances.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      return { count: Math.min(instances.length, limit), instances: instances.slice(0, limit) }
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
    case "update_plan_item": {
      const date = input.date
      const itemIndex = input.itemIndex
      const patch = input.patch || {}
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
        return { error: "date must be YYYY-MM-DD" }
      }
      if (!Number.isInteger(itemIndex) || itemIndex < 0) {
        return { error: "itemIndex must be a non-negative integer" }
      }

      const ref = adminDb.collection("plans").doc(date)
      const snap = await ref.get()
      if (!snap.exists) return { error: `No plan for ${date}` }

      const data = snap.data()
      const items = Array.isArray(data.items) ? [...data.items] : []
      if (itemIndex >= items.length) {
        return { error: `itemIndex ${itemIndex} out of range (have ${items.length})` }
      }

      // Whitelist patch fields — silently dropping unknowns is worse than
      // erroring, because the LLM won't learn it sent something wrong.
      const ALLOWED = ["floor", "target", "rationale", "timeSlot", "templateId", "status"]
      const unknownKeys = Object.keys(patch).filter((k) => !ALLOWED.includes(k))
      if (unknownKeys.length > 0) {
        return { error: `unknown patch field(s): ${unknownKeys.join(", ")}. Allowed: ${ALLOWED.join(", ")}` }
      }

      if (patch.status !== undefined) {
        const VALID_STATUSES = ["planned", "done", "partial", "skipped"]
        if (!VALID_STATUSES.includes(patch.status)) {
          return { error: `status must be one of: ${VALID_STATUSES.join(", ")}` }
        }
      }

      if (patch.templateId !== undefined) {
        const tplSnap = await adminDb.collection("taskTemplates").doc(patch.templateId).get()
        if (!tplSnap.exists) {
          return { error: `unknown templateId '${patch.templateId}'. Call get_task_templates for valid IDs.` }
        }
        // Re-denormalize goalId when templateId changes so the back-reference stays correct.
        patch.goalId = tplSnap.data().goalId || null
      }

      const next = { ...items[itemIndex], ...patch }
      if (patch.status !== undefined) next.statusUpdatedAt = Date.now()
      items[itemIndex] = next
      await ref.update({ items })
      return { ok: true, date, itemIndex, patched: Object.keys(patch) }
    }
    case "log_instance": {
      const date = input.date || getDateKey()
      const templateId = input.templateId
      const values = input.values || {}
      if (!templateId) return { error: "templateId is required" }

      const tplSnap = await adminDb.collection("taskTemplates").doc(templateId).get()
      if (!tplSnap.exists) {
        return { error: `Unknown templateId '${templateId}'. Call get_task_templates for valid IDs.` }
      }
      const tpl = tplSnap.data()

      const instance = {
        date,
        templateId,
        goalId: tpl.goalId || null,
        values,
        note: input.note || "",
        timestamp: Date.now(),
        source: "log_instance",
        grade: null,
      }
      const ref = await adminDb.collection("instances").add(instance)

      // Optionally flip a plan item's status in the same call.
      if (input.linkedPlanItem) {
        const { date: planDate, itemIndex, status } = input.linkedPlanItem
        const planRef = adminDb.collection("plans").doc(planDate)
        const planSnap = await planRef.get()
        if (planSnap.exists) {
          const data = planSnap.data()
          const items = Array.isArray(data.items) ? [...data.items] : []
          if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < items.length) {
            items[itemIndex] = {
              ...items[itemIndex],
              status,
              statusUpdatedAt: Date.now(),
              linkedInstanceId: ref.id,
            }
            await planRef.update({ items })
          }
        }
      }

      return { ok: true, id: ref.id, date, templateId, goalId: instance.goalId }
    }
    case "propose_plan": {
      const date = input.date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
        return { error: "date must be YYYY-MM-DD" }
      }
      if (!Array.isArray(input.items) || input.items.length === 0) {
        return { error: "items must be a non-empty array" }
      }

      // Validate templateIds against the registry — catches LLM typos before
      // they end up in the plan doc and confuse tomorrow's dashboard.
      const templatesSnap = await adminDb.collection("taskTemplates").get()
      const validIds = new Set(templatesSnap.docs.map((d) => d.id))
      const unknown = input.items
        .map((i, idx) => ({ idx, id: i.templateId }))
        .filter((x) => !validIds.has(x.id))
      if (unknown.length > 0) {
        return {
          error: `Unknown templateId(s): ${unknown.map((x) => `[${x.idx}]'${x.id}'`).join(", ")}. Call get_task_templates to see valid IDs.`,
        }
      }

      // Pull goalId from the template registry so plan items always carry the
      // back-reference even if the model forgot to.
      const templateById = new Map(templatesSnap.docs.map((d) => [d.id, d.data()]))
      const items = input.items.map((i) => {
        const tpl = templateById.get(i.templateId) || {}
        return {
          templateId: i.templateId,
          goalId: tpl.goalId || null,
          floor: i.floor || {},
          target: i.target || i.floor || {},
          rationale: i.rationale || "",
          timeSlot: i.timeSlot || null,
          status: "planned",
        }
      })

      const ref = adminDb.collection("plans").doc(date)
      await ref.set(
        {
          date,
          items,
          energyBasis: input.energyBasis || null,
          notes: input.notes || "",
          generatedAt: Date.now(),
        },
        { merge: false }
      )
      return { ok: true, date, itemCount: items.length }
    }
    case "save_energy": {
      const energy = Number(input.energy)
      if (!Number.isFinite(energy) || energy < 1 || energy > 5) {
        return { error: "energy must be a number between 1 and 5" }
      }
      const ref = adminDb.collection("habitEntries").doc(input.date)
      const snap = await ref.get()
      if (snap.exists) {
        await ref.update({ energy })
      } else {
        await ref.set({ habits: {}, moment: "", energy })
      }
      return { ok: true, date: input.date, energy }
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
const MAX_ITERATIONS = 15
const MAX_HISTORY_MESSAGES = 20

// Trim a conversation history to the last N messages, then walk forward
// until the first surviving message has role "user" (Anthropic API requires
// the first message to be user).
function trimHistory(messages, maxLen = MAX_HISTORY_MESSAGES) {
  if (!Array.isArray(messages) || messages.length <= maxLen) return messages
  let trimmed = messages.slice(-maxLen)
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1)
  }
  return trimmed
}

// Wrap the system prompt as a content-block array with a cache_control
// breakpoint on the last block. Tools render before system, so this single
// breakpoint caches both tools + system together (saves ~90% on cached reads).
function systemWithCache(systemPrompt) {
  if (!systemPrompt) return undefined
  if (typeof systemPrompt === "string") {
    return [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
  }
  if (Array.isArray(systemPrompt) && systemPrompt.length > 0) {
    return systemPrompt.map((block, i) =>
      i === systemPrompt.length - 1
        ? { ...block, cache_control: { type: "ephemeral" } }
        : block
    )
  }
  return systemPrompt
}

// Best-effort token usage logging — never block the chat loop on failures.
async function logTokenUsage(usage, model) {
  if (!usage) return
  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0
  const cacheCreate = usage.cache_creation_input_tokens || 0
  console.log(
    `[anthropic] model=${model} input=${inputTokens} output=${outputTokens} cache_read=${cacheRead} cache_create=${cacheCreate}`
  )
  try {
    const date = getDateKey()
    await adminDb.collection("tokenUsage").doc(date).set(
      {
        date,
        lastModel: model,
        inputTokens: FieldValue.increment(inputTokens),
        outputTokens: FieldValue.increment(outputTokens),
        cacheReadInputTokens: FieldValue.increment(cacheRead),
        cacheCreationInputTokens: FieldValue.increment(cacheCreate),
        calls: FieldValue.increment(1),
        updatedAt: Date.now(),
      },
      { merge: true }
    )
  } catch (e) {
    console.error("Token usage logging failed:", e.message)
  }
}

export async function runChatLoop({
  messages,
  tools,
  systemPrompt,
  model,
  maxTokens,
  maxIterations,
  // Injectable for evals — tests pass a recorder, prod uses the real executeTool.
  toolExecutor = executeTool,
  // Optional metadata for Langfuse — lets the UI filter by user/scenario.
  traceName = "chat",
  userId,
  metadata,
}) {
  const useModel = model || DEFAULT_MODEL
  const useMaxTokens = maxTokens || 1024
  const iterCap = maxIterations || MAX_ITERATIONS
  const trimmed = trimHistory(messages)
  let claudeMessages = trimmed.map((m) => ({
    role: m.role,
    content: m.content,
  }))
  const cachedSystem = systemWithCache(systemPrompt)

  // Langfuse trace — one per call. Null if env vars aren't set.
  const langfuse = getLangfuse()
  const trace = langfuse?.trace({
    name: traceName,
    userId,
    metadata,
    input: trimmed,
  })

  // Helper: wrap a messages.create call as a Langfuse generation.
  async function callClaude(turnIndex) {
    const generation = trace?.generation({
      name: `claude-call-${turnIndex}`,
      model: useModel,
      input: { system: cachedSystem, messages: claudeMessages, tools: tools.map((t) => t.name) },
      modelParameters: { max_tokens: useMaxTokens },
    })
    const start = Date.now()
    let res
    try {
      res = await client.messages.create({
        model: useModel,
        max_tokens: useMaxTokens,
        system: cachedSystem,
        tools,
        messages: claudeMessages,
      })
    } catch (e) {
      generation?.end({ level: "ERROR", statusMessage: e.message })
      throw e
    }
    generation?.end({
      output: res.content,
      usage: {
        input: res.usage?.input_tokens,
        output: res.usage?.output_tokens,
        // Langfuse-native fields for cache visibility
        inputCached: res.usage?.cache_read_input_tokens,
      },
      metadata: { latencyMs: Date.now() - start, stopReason: res.stop_reason },
    })
    return res
  }

  let response = await callClaude(0)
  await logTokenUsage(response.usage, useModel)

  let iterations = 0
  while (response.stop_reason === "tool_use") {
    iterations += 1
    if (iterations > iterCap) {
      console.error(`runChatLoop: iteration cap (${iterCap}) hit — bailing out`)
      trace?.update({ metadata: { ...metadata, hitIterationCap: true } })
      break
    }
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

      // Each tool call becomes its own span — Langfuse shows them inline
      // under the trace, with timing and the result payload.
      const span = trace?.span({ name: `tool:${block.name}`, input: block.input })
      let result
      try {
        result = await toolExecutor(block.name, block.input)
        span?.end({ output: result })
      } catch (e) {
        result = { error: e.message || "Tool execution failed" }
        span?.end({ level: "ERROR", statusMessage: e.message, output: result })
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

    response = await callClaude(iterations)
    await logTokenUsage(response.usage, useModel)
  }

  const textBlock = response.content.find((b) => b.type === "text")
  const reply = textBlock ? textBlock.text : ""
  trace?.update({ output: reply })
  // Serverless functions can exit before Langfuse's background flush
  // completes — explicit flush is required to avoid dropped events.
  await flushLangfuse()
  return reply
}
