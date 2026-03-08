import Anthropic from "@anthropic-ai/sdk"
import { adminDb } from "./firebaseAdmin"

const client = new Anthropic()

export const ABOUT_DANIEL = `Daniel Raad is a software engineer at Palantir and founder of Conversify (WhatsApp marketing platform for restaurants). He's training for Ironman 70.3. He builds in public on his personal site, tracking habits, todos, training, and life goals. He values systems over willpower, writes raw and honestly, and is motivated by legacy and accountability.`

export const READ_TOOLS = [
  {
    name: "get_todos",
    description: "Get Daniel's current todo list",
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
    name: "get_ironman_plan",
    description: "Get Daniel's Ironman 70.3 training plan including weekly schedule, checked-off sessions, and progress",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_memory",
    description: "Read the persistent memory file. Use this at the start of conversations to recall context about Daniel — preferences, ongoing topics, things he's mentioned before.",
    input_schema: { type: "object", properties: {} },
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
    description: "Update a todo (mark complete, edit text, etc.)",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The todo ID" },
        text: { type: "string" },
        completed: { type: "boolean" },
        category: { type: "string" },
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
]

export async function executeTool(name, input) {
  switch (name) {
    case "get_todos": {
      const snap = await adminDb.collection("todos").orderBy("createdAt", "desc").get()
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    }
    case "get_habits": {
      const date = input.date || new Date().toISOString().split("T")[0]
      const [year, month] = date.split("-")
      const docId = `${year}-${month}`
      const habitsDoc = await adminDb.collection("monthHabits").doc(docId).get()
      const habits = habitsDoc.exists ? habitsDoc.data().habits || [] : []
      const entryDoc = await adminDb.collection("habitEntries").doc(date).get()
      const entry = entryDoc.exists ? entryDoc.data() : { habits: {} }
      return { habits, completions: entry.habits || {}, moment: entry.moment || "" }
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
    case "get_ironman_plan": {
      const doc = await adminDb.collection("ironman").doc("plan").get()
      return doc.exists ? doc.data() : { checked: {}, startDate: "2026-03-08", dayOrders: {}, sessionMoves: {} }
    }
    case "get_memory": {
      const doc = await adminDb.collection("assistant").doc("memory").get()
      return doc.exists ? { memory: doc.data().content } : { memory: "" }
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
      if (data.completed) data.completedAt = Date.now()
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
    case "create_blog_post": {
      const ref = await adminDb.collection("blogDrafts").add({
        title: input.title,
        excerpt: input.excerpt || "",
        content: input.content,
        tags: input.tags || [],
        hidden: input.hidden || false,
        date: new Date().toISOString().split("T")[0],
        createdAt: Date.now(),
      })
      return { id: ref.id, ok: true }
    }
    default:
      return { error: "Unknown tool" }
  }
}

export async function runChatLoop({ messages, tools, systemPrompt }) {
  let claudeMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: claudeMessages,
    })
  }

  const textBlock = response.content.find((b) => b.type === "text")
  return textBlock ? textBlock.text : ""
}
