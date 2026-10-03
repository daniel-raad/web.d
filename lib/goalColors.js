// Color personality per goal. Used by the dashboard strip cells, plan-item
// accent borders, and the progress page. Single source so colors stay
// consistent across the UI.
//
// Anything not in the map falls back to DEFAULT_GOAL_COLOR.

export const DEFAULT_GOAL_COLOR = "#64748b" // slate-500

const GOAL_COLORS = {
  "reading-cadence": "#8b5cf6", // reading violet
  "journal-cadence": "#ec4899", // journal pink
  "steps-cadence": "#84cc16", // steps lime
}

export function colorForGoal(goalId) {
  return GOAL_COLORS[goalId] || DEFAULT_GOAL_COLOR
}

// Per-template colors. Plan items color their left border by templateId so
// the visual identity is consistent even when multiple templates roll up
// into a single goal.
const TEMPLATE_COLORS = {
  run: "#ef4444",
  bike: "#3b82f6",
  swim: "#06b6d4",
  strength: "#f59e0b",
  read: "#8b5cf6",
  journal: "#ec4899",
  steps: "#84cc16",
}

export function colorForTemplate(templateId) {
  return TEMPLATE_COLORS[templateId] || DEFAULT_GOAL_COLOR
}
