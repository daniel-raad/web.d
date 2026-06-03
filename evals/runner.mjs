// Eval runner — exercises the real runChatLoop against each scenario,
// with tool execution mocked out (no Firestore / Strava / Calendar calls).
//
// Run with:  npm run eval
// Requires:  ANTHROPIC_API_KEY  (Haiku is used by default to keep cost low)
//
// What this catches:
//   - Tool-selection regressions (prompt change accidentally stops the agent
//     calling get_focus_snapshot on check-ins)
//   - Tool-arg regressions (agent forgets to pass amount on update_revenue)
//   - Prompt drift causing the agent to make destructive calls on read prompts
//
// What this does NOT catch:
//   - Correctness of tool implementations themselves (use unit tests for that)
//   - Final-response quality at the language level (would need an LLM judge)

import { runChatLoop, READ_TOOLS, WRITE_TOOLS, buildSystemPrompt } from "../lib/chatEngine.js"
import { scenarios } from "./scenarios.mjs"

const EVAL_MODEL = process.env.EVAL_MODEL || "claude-haiku-4-5-20251001"

// Mock results returned for each tool — just enough shape that the agent's
// follow-up reasoning doesn't blow up. The goal is to test which tools are
// CALLED, not what they return, so plausible stubs are fine.
const mockResults = {
  get_focus_snapshot: () => ({
    today: "2026-05-18",
    daysLeftInMonth: 13,
    revenue: { currentMonth: "2026-05", currentAmount: 2400, target: 10000, progressPct: 24, gapToTarget: 7600 },
    topRevenueTodos: [],
    revenueTodoCount: 3,
    todayLogs: { workLog: "", trainingLog: "", moment: "", energy: null, sleep: null },
    last7Days: { sleepAvgHours: 7.2, energyAvg: 3.2, energySamples: 5, habitCompletion: "78%" },
    training: { activities: 5, distanceKm: 42, hours: 6.1, byType: {} },
    ironman: { daysToRace: 90, totals: {}, progress: {}, notes: "" },
  }),
  get_todos: () => [
    { id: "t1", text: "Conversify demo prep", category: "Revenue", dueDate: "2026-05-18" },
  ],
  get_training_plan: () => ({
    targetsHoursPerWeek: { swim: 2, bike: 5, run: 4, strength: 2 },
    daysToRace: 90,
    weekStart: "2026-05-12",
    progress: {},
  }),
  get_week_summary: () => ({ days: [], averages: { habitCompletion: "75%", sleep: "7.1hrs", weight: "78kg" } }),
  get_activity_summary: () => ({ totals: { activities: 5, distanceKm: 42, hours: 6.1 }, byType: {} }),
  get_recent_activities: () => ({ days: 14, count: 0, activities: [] }),
  get_recent_checkins: () => [],
  get_memory: () => ({ memory: "" }),
  get_about: () => ({ bio: "test bio" }),
  get_today: () => ({
    today: "2026-05-18",
    habits: { list: [], summary: "0/0 done" },
    todos: { dueToday: [], unscheduledCount: 0, totalActiveCount: 0 },
    weight: null, sleep: null, energy: null, moment: "", workLog: "", trainingLog: "",
  }),
  // New read tools introduced by the dashboard rebuild.
  get_goals: () => ({
    count: 3,
    goals: [
      {
        id: "ironman-70-3-estonia-2026",
        type: "deadline-plan",
        title: "Finish Ironman 70.3 Estonia strong",
        status: "active",
        priority: 1,
        deadline: "2026-08-23",
        weeklyTargets: { swim: 2, bike: 5, run: 4, strength: 2 },
      },
      {
        id: "conversify-10k-mrr",
        type: "outcome-leads",
        title: "Conversify £10,000/month after-tax",
        status: "active",
        priority: 1,
        target: 10000,
        current: 0,
        unit: "GBP",
      },
      {
        id: "reading-cadence",
        type: "process-cadence",
        title: "Read daily",
        status: "active",
        priority: 2,
        floor: 15,
        target: 30,
        primaryPrimitive: "duration",
      },
    ],
  }),
  get_task_templates: () => ({
    count: 6,
    templates: [
      { id: "run", label: "Run", goalId: "ironman-70-3-estonia-2026", primitives: ["duration", "intensity", "quantity", "description"], suggestedFloor: { duration: 30 }, suggestedTarget: { duration: 60 } },
      { id: "bike", label: "Bike", goalId: "ironman-70-3-estonia-2026", primitives: ["duration", "intensity", "quantity", "description"], suggestedFloor: { duration: 45 }, suggestedTarget: { duration: 90 } },
      { id: "swim", label: "Swim", goalId: "ironman-70-3-estonia-2026", primitives: ["duration", "intensity", "quantity", "description"], suggestedFloor: { duration: 30 }, suggestedTarget: { duration: 60 } },
      { id: "strength", label: "Strength", goalId: "ironman-70-3-estonia-2026", primitives: ["duration", "intensity", "description"], suggestedFloor: { duration: 30 }, suggestedTarget: { duration: 60 } },
      { id: "conversify", label: "Conversify build", goalId: "conversify-10k-mrr", primitives: ["duration", "intensity", "description", "outcome"], suggestedFloor: { duration: 60 }, suggestedTarget: { duration: 120 } },
      { id: "read", label: "Read", goalId: "reading-cadence", primitives: ["duration", "description"], suggestedFloor: { duration: 15 }, suggestedTarget: { duration: 30 } },
    ],
  }),
  get_plan: () => ({ date: "2026-05-18", plan: null, exists: false }),
  get_instances: () => ({ count: 0, instances: [] }),
  // Write tools — return ok so the agent doesn't retry.
  add_todo: () => ({ id: "mock-id", ok: true }),
  update_todo: () => ({ ok: true }),
  delete_todo: () => ({ ok: true }),
  log_work: () => ({ ok: true, date: "2026-05-18", appended: "[mock]", instanceId: null }),
  log_training: () => ({ ok: true, date: "2026-05-18", appended: "[mock]", instanceId: null }),
  log_instance: () => ({ ok: true, id: "mock-inst", date: "2026-05-18", templateId: "run", goalId: "ironman-70-3-estonia-2026" }),
  propose_plan: () => ({ ok: true, date: "2026-05-19", itemCount: 3 }),
  save_energy: () => ({ ok: true, date: "2026-05-18", energy: 3 }),
  update_revenue: () => ({ ok: true, month: "2026-05", amount: 2800, target: 10000, progressPct: 28 }),
  save_memory: () => ({ ok: true }),
  save_personality: () => ({ ok: true }),
}

function makeRecorder() {
  const calls = []
  const toolExecutor = async (name, input) => {
    calls.push({ name, input })
    const mock = mockResults[name]
    return mock ? mock(input) : { ok: true }
  }
  return { calls, toolExecutor }
}

function evaluateScenario(scenario, calls) {
  const failures = []
  const calledNames = calls.map((c) => c.name)

  if (scenario.expectedTools) {
    for (let i = 0; i < scenario.expectedTools.length; i++) {
      const want = scenario.expectedTools[i]
      const got = calledNames[i]
      if (got !== want) {
        failures.push(`expected call #${i} to be '${want}', got '${got || "(none)"}'`)
      }
    }
  }

  if (scenario.expectedToolsContains) {
    for (const t of scenario.expectedToolsContains) {
      if (!calledNames.includes(t)) {
        failures.push(`expected '${t}' to be called somewhere, got [${calledNames.join(", ") || "(none)"}]`)
      }
    }
  }

  if (scenario.expectedToolsAny) {
    const hit = scenario.expectedToolsAny.find((t) => calledNames.includes(t))
    if (!hit) {
      failures.push(`expected at least one of [${scenario.expectedToolsAny.join(", ")}], got [${calledNames.join(", ")}]`)
    }
  }

  if (scenario.expectedArgs) {
    scenario.expectedArgs.forEach((matcher, i) => {
      const call = calls[i]
      if (!call) {
        failures.push(`expected args for call #${i} but no call was made`)
        return
      }
      for (const [key, expected] of Object.entries(matcher)) {
        const actual = call.input?.[key]
        const ok = typeof expected === "function" ? expected(actual) : actual === expected
        if (!ok) {
          failures.push(`call #${i} (${call.name}) arg '${key}' failed match — got ${JSON.stringify(actual)}`)
        }
      }
    })
  }

  if (scenario.expectedArgsByTool) {
    for (const [toolName, matcher] of Object.entries(scenario.expectedArgsByTool)) {
      const call = calls.find((c) => c.name === toolName)
      if (!call) {
        failures.push(`expected args check for '${toolName}' but tool was never called`)
        continue
      }
      for (const [key, expected] of Object.entries(matcher)) {
        const actual = call.input?.[key]
        const ok = typeof expected === "function" ? expected(actual) : actual === expected
        if (!ok) {
          failures.push(`${toolName} arg '${key}' failed match — got ${JSON.stringify(actual)}`)
        }
      }
    }
  }

  if (scenario.forbiddenTools) {
    for (const t of scenario.forbiddenTools) {
      if (calledNames.includes(t)) failures.push(`forbidden tool '${t}' was called`)
    }
  }

  return failures
}

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is required to run evals")
    process.exit(1)
  }

  const systemPrompt = buildSystemPrompt({
    isAuthed: true,
    today: "2026-05-18",
    dayName: "Monday",
    personality: "",
  })
  const tools = [...READ_TOOLS, ...WRITE_TOOLS]

  let passed = 0
  let failed = 0
  const startAll = Date.now()

  for (const scenario of scenarios) {
    const { calls, toolExecutor } = makeRecorder()
    const start = Date.now()
    let reply = ""
    let runError = null
    try {
      reply = await runChatLoop({
        messages: [{ role: "user", content: scenario.prompt }],
        tools,
        systemPrompt,
        model: EVAL_MODEL,
        toolExecutor,
        traceName: `eval:${scenario.name}`,
        metadata: { eval: true, scenario: scenario.name },
      })
    } catch (e) {
      runError = e
    }
    const elapsed = Date.now() - start

    const failures = runError ? [`runChatLoop threw: ${runError.message}`] : evaluateScenario(scenario, calls)

    if (scenario.responseIncludes && !reply.includes(scenario.responseIncludes)) {
      failures.push(`reply did not include '${scenario.responseIncludes}'`)
    }

    const status = failures.length === 0 ? "PASS" : "FAIL"
    const toolStr = calls.map((c) => c.name).join(" → ") || "(no tools)"
    console.log(`[${status}] ${scenario.name}  (${elapsed}ms)  tools: ${toolStr}`)
    if (failures.length) {
      failures.forEach((f) => console.log(`        - ${f}`))
      failed += 1
    } else {
      passed += 1
    }
  }

  const totalElapsed = ((Date.now() - startAll) / 1000).toFixed(1)
  console.log(`\n${passed}/${passed + failed} passed in ${totalElapsed}s  (model: ${EVAL_MODEL})`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((e) => {
  console.error("Eval runner crashed:", e)
  process.exit(1)
})
