// Eval scenarios — each one runs the real agent against a synthetic prompt
// and checks which tools the agent decided to call. Tool execution is mocked
// (see runner.mjs) so this never touches Firestore, Strava, or Calendar.
//
// Assertion shapes (mix and match per scenario):
//   expectedTools         — ordered list, each position must match exactly.
//                           Brittle under prompt drift; prefer the looser ones
//                           below unless ordering really matters.
//   expectedToolsContains — set of tools that MUST all be called, any order.
//   expectedToolsAny      — at least ONE of these tools must be called.
//   forbiddenTools        — none of these tools may be called.
//   expectedArgsByTool    — { toolName: matcherObj } — finds the FIRST call by
//                           that name and applies the matcher. Values may be
//                           literals (===) or predicates (v) => boolean.
//   responseIncludes      — substring that must appear in the final reply.
//
// Keep scenarios focused on tool-selection — that's the part most likely to
// regress when the system prompt or tool descriptions change.

export const scenarios = [
  // -- Existing behaviour kept under the unified coach prompt -----------------
  {
    name: "check-in pulls focus snapshot",
    prompt: "Morning, where am I at?",
    // The coach prompt now also encourages get_goals + get_memory at the start
    // of goal-relevant conversations, so we don't pin exact ordering anymore —
    // we just require get_focus_snapshot fires at some point.
    expectedToolsContains: ["get_focus_snapshot"],
  },
  {
    name: "revenue close logs to update_revenue",
    prompt: "Just closed £400 with a new restaurant.",
    expectedToolsContains: ["update_revenue"],
    expectedArgsByTool: {
      update_revenue: {
        amount: (v) => v === 400,
        mode: (v) => v === undefined || v === "add" || v === "set",
      },
    },
  },
  {
    name: "training session ends up in a training log path",
    // Under the new model, a free-form training note can land in either
    // log_training (legacy free-form, dual-writes an instance) or directly in
    // log_instance with structured values. Either is valid.
    prompt: "Just finished 4x800 on the track, felt strong, HR stayed under 165.",
    expectedToolsAny: ["log_training", "log_instance"],
  },
  {
    name: "work session ends up in a work log path",
    prompt: "Spent 90 minutes on the Conversify onboarding flow, shipped the Stripe webhook.",
    expectedToolsAny: ["log_work", "log_instance"],
  },
  {
    name: "training plan question hits get_training_plan",
    prompt: "How am I tracking against this week's swim target?",
    expectedToolsContains: ["get_training_plan"],
  },
  {
    name: "todo creation calls add_todo",
    prompt: "Add a todo: call the accountant about Q2 VAT, due Friday.",
    expectedToolsContains: ["add_todo"],
    expectedArgsByTool: {
      add_todo: {
        text: (v) => typeof v === "string" && v.toLowerCase().includes("accountant"),
      },
    },
  },
  {
    name: "weekly recap pulls week summary",
    prompt: "Give me a recap of the last 7 days — habits, sleep, training.",
    expectedToolsAny: ["get_week_summary", "get_focus_snapshot", "get_activity_summary"],
  },
  {
    name: "does not modify on read-only question",
    prompt: "What are my todos right now?",
    expectedToolsContains: ["get_todos"],
    // No write tools should fire on a pure read. Includes the new write tools
    // so a prompt regression that auto-logs/plans on a read is caught.
    forbiddenTools: [
      "add_todo", "update_todo", "delete_todo", "save_memory",
      "propose_plan", "log_instance", "save_energy", "update_revenue",
    ],
  },

  // -- New surface introduced by the dashboard rebuild -----------------------
  {
    name: "ask to write today's plan triggers propose_plan",
    prompt: "Write today's plan — I'm at energy 3, no big rocks moved yet today.",
    // The coach needs to know what templates and goals exist before writing,
    // so we require get_task_templates + propose_plan (get_goals is encouraged
    // but not strictly required — covered by the more general goals test).
    expectedToolsContains: ["get_task_templates", "propose_plan"],
    expectedArgsByTool: {
      propose_plan: {
        date: (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
        items: (v) => Array.isArray(v) && v.length > 0,
      },
    },
  },
  {
    name: "structured session log uses log_instance",
    prompt:
      "Log a 45 min Z2 run, 8km, felt easy, HR held 144. Intensity 2.",
    // Structured numbers + specific primitives = the new path. log_training
    // would also pass elsewhere; here we want to see the structured tool
    // chosen because the values are explicit.
    expectedToolsContains: ["log_instance"],
    expectedArgsByTool: {
      log_instance: {
        templateId: (v) => v === "run",
        values: (v) =>
          v &&
          typeof v === "object" &&
          (v.duration === 45 || v.quantity === 8 || v.intensity === 2),
      },
    },
  },
  {
    name: "energy report triggers save_energy",
    prompt: "Energy today is 2 — flat, slept badly.",
    expectedToolsContains: ["save_energy"],
    expectedArgsByTool: {
      save_energy: {
        energy: (v) => v === 2,
      },
    },
  },
  {
    name: "goal question triggers get_goals",
    prompt: "What goals am I playing for right now?",
    expectedToolsContains: ["get_goals"],
    // Should not silently write anything just from asking what the goals are.
    forbiddenTools: ["propose_plan", "log_instance", "save_energy", "update_revenue"],
  },
]
