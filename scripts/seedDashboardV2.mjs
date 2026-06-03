// Dashboard v2 seed — primitives, goal types, real goals, task templates.
//
// The model is: primitives → templates → instances. Goals declare what
// progress means. Templates declare which primitives a task captures.
// Instances are logs against a template.
//
// Idempotent — uses deterministic doc IDs and set() so re-running is safe.
//
// Usage:
//   node --env-file=.env scripts/seedDashboardV2.mjs           # dry-run
//   node --env-file=.env scripts/seedDashboardV2.mjs --apply   # commit

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("FIREBASE_SERVICE_ACCOUNT not set. Run from project root with .env present.")
    process.exit(1)
  }
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

const db = getFirestore()
const APPLY = process.argv.includes("--apply")

// ---------------------------------------------------------------------------
// Primitives — the atomic data points a task instance can capture.
// Templates pick which ones apply. Keeping this set small on purpose;
// five primitives covers train / build / read / write / admin.
// ---------------------------------------------------------------------------

const PRIMITIVES = [
  {
    id: "duration",
    label: "Duration",
    valueType: "number",
    unit: "minutes",
    description: "How long the task took, in minutes.",
  },
  {
    id: "intensity",
    label: "Intensity",
    valueType: "scale",
    scale: { min: 1, max: 5 },
    description: "Subjective effort 1–5. 1 = recovery, 3 = solid work, 5 = max.",
  },
  {
    id: "description",
    label: "Description",
    valueType: "text",
    description: "Free-form note on what happened. Graded by LLM against the goal.",
  },
  {
    id: "quantity",
    label: "Quantity",
    valueType: "number",
    unit: "varies",
    description: "Numeric output of the task (km, pages, reps, words). Unit lives on the template.",
  },
  {
    id: "outcome",
    label: "Outcome",
    valueType: "text",
    description: "What shipped, was decided, or moved. Graded by LLM against the goal.",
  },
]

// ---------------------------------------------------------------------------
// Goal types — schemas for the *kind* of goal. The LLM uses the type to
// know how to evaluate whether progress is happening.
// ---------------------------------------------------------------------------

const GOAL_TYPES = [
  {
    id: "deadline-plan",
    label: "Deadline + Plan",
    description:
      "A fixed deadline with a structured plan that decomposes into weekly/daily targets. Progress = on-pace vs deadline AND weekly targets hit.",
    requiredFields: ["deadline", "weeklyTargets"],
    optionalFields: ["block", "notes"],
    progressLogic:
      "Compute days-to-deadline. Compute week-to-date progress per lead measure vs weekly target. Flag any lead measure falling behind with N days left in the week.",
  },
  {
    id: "outcome-leads",
    label: "Outcome + Lead Measures",
    description:
      "An outcome target (£, users, MRR) with one or more lead measures that drive it. Progress = current vs target on the outcome AND consistency on lead measures.",
    requiredFields: ["target", "current", "leadMeasures"],
    optionalFields: ["context", "deadline"],
    progressLogic:
      "Compute outcome gap (target - current) and progressPct. Lead measures are evaluated by description/outcome grading on relevant task instances.",
  },
  {
    id: "process-cadence",
    label: "Process / Cadence",
    description:
      "No endpoint — sustained cadence is the goal. Progress = daily floor hit consistently, trending toward target.",
    requiredFields: ["floor", "target", "primaryPrimitive"],
    optionalFields: ["window"],
    progressLogic:
      "Compute hit-rate over a rolling window (default 14 days) of the primary primitive vs floor. Trend toward target is bonus, not required.",
  },
]

// ---------------------------------------------------------------------------
// Real goals — the three Daniel is actually playing for. These can be
// edited live later via tools; this is the v1 seed.
// ---------------------------------------------------------------------------

const GOALS = [
  {
    id: "ironman-70-3-estonia-2026",
    type: "deadline-plan",
    title: "Finish Ironman 70.3 Estonia strong",
    status: "active",
    priority: 1,
    rationale:
      "Health anchor for the year. Not just survive — execute the race plan. Drives sleep, training cadence, and recovery discipline.",
    deadline: "2026-08-23",
    block: "build", // base / build / peak / taper — set live
    weeklyTargets: {
      // Hour targets per discipline — mirrors trainingPlan.js.
      // Source of truth for training stays in trainingPlan; this is the
      // goal-side reference so the planner can reason about it.
      swim: 2,
      bike: 5,
      run: 4,
      strength: 2,
    },
    leadMeasureTemplates: ["run", "bike", "swim", "strength"],
    notes: "Race day 2026-08-23. ~80 days out at seed time (2026-06-03).",
    createdAt: Date.now(),
  },
  {
    id: "conversify-10k-mrr",
    type: "outcome-leads",
    title: "Conversify £10,000/month after-tax",
    status: "active",
    priority: 1,
    rationale:
      "Replaces salary (~£6k/month) with ~1.67× headroom. Unlocks full-time on Conversify. Every Revenue todo and Conversify session is measured against this.",
    target: 10000,
    current: 0, // seeded; live source is assistant/revenue.monthly
    unit: "GBP",
    cadence: "monthly",
    leadMeasures: [
      "demos booked",
      "venues live",
      "Conversify build sessions (focused, not admin)",
    ],
    leadMeasureTemplates: ["conversify"],
    context: { monthlySalaryGBP: 6000 },
    createdAt: Date.now(),
  },
  {
    id: "reading-cadence",
    type: "process-cadence",
    title: "Read daily",
    status: "active",
    priority: 2,
    rationale:
      "Process goal — no endpoint. Currently 0 min/day. 15 min floor is the re-entry; 30 min target is the upgrade.",
    floor: 15, // minutes
    target: 30, // minutes
    primaryPrimitive: "duration",
    window: 14, // rolling hit-rate window in days
    leadMeasureTemplates: ["read"],
    createdAt: Date.now(),
  },
  {
    id: "journal-cadence",
    type: "process-cadence",
    title: "Journal daily",
    status: "active",
    priority: 3,
    rationale:
      "Reflection cadence — replaces the journal habit. 5 min floor (just sit down) / 15 min target (full evening prep).",
    floor: 5,
    target: 15,
    primaryPrimitive: "duration",
    window: 14,
    leadMeasureTemplates: ["journal"],
    createdAt: Date.now(),
  },
  {
    id: "steps-cadence",
    type: "process-cadence",
    title: "Walk 10k+/day",
    status: "active",
    priority: 3,
    rationale:
      "Daily movement floor — replaces the 10k steps habit. Human hygiene, not Ironman-specific.",
    floor: 10000,
    target: 12000,
    primaryPrimitive: "quantity",
    window: 14,
    leadMeasureTemplates: ["steps"],
    createdAt: Date.now(),
  },
]

// ---------------------------------------------------------------------------
// Task templates — compositions of primitives. Each links to a goal so the
// planner and grader know what "moving the needle" means.
//
// suggestedFloor / suggestedTarget are defaults; the evening planner can
// override per day based on energy + recent intensity + admin load.
// ---------------------------------------------------------------------------

const TASK_TEMPLATES = [
  {
    id: "run",
    label: "Run",
    emoji: "🏃",
    goalId: "ironman-70-3-estonia-2026",
    primitives: ["duration", "intensity", "quantity", "description"],
    quantityUnit: "km",
    suggestedFloor: { duration: 30 },
    suggestedTarget: { duration: 60 },
    notes: "Z2 most days. Intensity 1–5 maps roughly to Z1–Z5.",
  },
  {
    id: "bike",
    label: "Bike",
    emoji: "🚴",
    goalId: "ironman-70-3-estonia-2026",
    primitives: ["duration", "intensity", "quantity", "description"],
    quantityUnit: "km",
    suggestedFloor: { duration: 45 },
    suggestedTarget: { duration: 90 },
    notes: "Long ride is usually the week's anchor. Z2 unless a quality session.",
  },
  {
    id: "swim",
    label: "Swim",
    emoji: "🏊",
    goalId: "ironman-70-3-estonia-2026",
    primitives: ["duration", "intensity", "quantity", "description"],
    quantityUnit: "m",
    suggestedFloor: { duration: 30 },
    suggestedTarget: { duration: 60 },
    notes: "Volume + technique. Quantity in metres.",
  },
  {
    id: "strength",
    label: "Strength",
    emoji: "🏋",
    goalId: "ironman-70-3-estonia-2026",
    primitives: ["duration", "intensity", "description"],
    suggestedFloor: { duration: 30 },
    suggestedTarget: { duration: 60 },
    notes: "Gym work — sets/reps go in description. Strava won't capture this.",
  },
  {
    id: "conversify",
    label: "Conversify build",
    emoji: "💼",
    goalId: "conversify-10k-mrr",
    primitives: ["duration", "intensity", "description", "outcome"],
    suggestedFloor: { duration: 60 },
    suggestedTarget: { duration: 120 },
    notes:
      "Focused build/sales session. LLM grades outcome against £10k goal — admin spinning vs shipped feature vs demo booked.",
  },
  {
    id: "read",
    label: "Read",
    emoji: "📖",
    goalId: "reading-cadence",
    primitives: ["duration", "description"],
    suggestedFloor: { duration: 15 },
    suggestedTarget: { duration: 30 },
    notes: "Process goal — duration is the primary signal. Floor is the re-entry.",
  },
  {
    id: "journal",
    label: "Journal",
    emoji: "📔",
    goalId: "journal-cadence",
    primitives: ["duration", "description"],
    suggestedFloor: { duration: 5 },
    suggestedTarget: { duration: 15 },
    notes: "Evening reflection — what worked, what's tomorrow's priority. Duration is the signal.",
  },
  {
    id: "steps",
    label: "Steps",
    emoji: "👟",
    goalId: "steps-cadence",
    primitives: ["quantity"],
    quantityUnit: "steps",
    suggestedFloor: { quantity: 10000 },
    suggestedTarget: { quantity: 12000 },
    notes: "Daily movement. Quantity is the only signal — phone auto-tracks it.",
  },
]

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function fmtCount(label, items) {
  return `  ${label.padEnd(16)} ${items.length} doc${items.length === 1 ? "" : "s"}`
}

async function setAll(collection, items) {
  const batch = db.batch()
  for (const item of items) {
    const { id, ...data } = item
    batch.set(db.collection(collection).doc(id), { ...data, updatedAt: Date.now() }, { merge: true })
  }
  await batch.commit()
}

async function main() {
  console.log(`\n=== Dashboard v2 seed ${APPLY ? "(APPLY)" : "(DRY RUN)"} ===\n`)
  console.log("Will write to:")
  console.log(fmtCount("primitives", PRIMITIVES))
  console.log(fmtCount("goalTypes", GOAL_TYPES))
  console.log(fmtCount("goals", GOALS))
  console.log(fmtCount("taskTemplates", TASK_TEMPLATES))

  console.log("\nGoals being seeded:")
  for (const g of GOALS) {
    console.log(`  - ${g.id.padEnd(34)} [${g.type}]  ${g.title}`)
  }
  console.log("\nTemplates being seeded:")
  for (const t of TASK_TEMPLATES) {
    const flat = (obj) =>
      Object.entries(obj || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    console.log(
      `  - ${t.id.padEnd(12)} → goal=${t.goalId.padEnd(34)} primitives=[${t.primitives.join(",")}] floor={${flat(t.suggestedFloor)}}`
    )
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to commit.")
    return
  }

  await setAll("primitives", PRIMITIVES)
  console.log("\n✓ primitives written")
  await setAll("goalTypes", GOAL_TYPES)
  console.log("✓ goalTypes written")
  await setAll("goals", GOALS)
  console.log("✓ goals written")
  await setAll("taskTemplates", TASK_TEMPLATES)
  console.log("✓ taskTemplates written")
  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
