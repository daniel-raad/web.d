import { getIdToken } from "./AuthContext"

async function authHeaders() {
  const token = await getIdToken()
  if (!token) return { "Content-Type": "application/json" }
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

// --- Habits CRUD ---

export async function getHabits() {
  const res = await fetch("/api/habits")
  return res.json()
}

export async function addHabit({ name, emoji, order }) {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, emoji, order }),
  })
  const { id } = await res.json()
  return id
}

export async function updateHabit(id, data) {
  await fetch(`/api/habits/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
}

export async function deleteHabit(id) {
  await fetch(`/api/habits/${id}`, { method: "DELETE", headers: await authHeaders() })
}

// --- Habit Entries ---

export async function getEntries(year, month) {
  const res = await fetch(`/api/entries?year=${year}&month=${month}`)
  return res.json()
}

export async function toggleHabit(date, habitId, value) {
  await fetch(`/api/entries/${date}/toggle`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ habitId, value }),
  })
}

export async function saveMoment(date, text) {
  await fetch(`/api/entries/${date}/moment`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ text }),
  })
}

export async function saveWeight(date, weight) {
  await fetch(`/api/entries/${date}/weight`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ weight }),
  })
}

export async function saveSleep(date, sleep) {
  await fetch(`/api/entries/${date}/sleep`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ sleep }),
  })
}

export async function saveEnergy(date, energy) {
  await fetch(`/api/entries/${date}/energy`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ energy }),
  })
}

// --- Per-Month Habits ---

export async function getMonthHabits(year, month) {
  const res = await fetch(`/api/monthHabits?year=${year}&month=${month}`)
  return res.json()
}

export async function addMonthHabit(year, month, { name, emoji, order }) {
  const res = await fetch(`/api/monthHabits?year=${year}&month=${month}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, emoji, order }),
  })
  const { id } = await res.json()
  return id
}

export async function updateMonthHabit(id, year, month, data) {
  await fetch(`/api/monthHabits/${id}?year=${year}&month=${month}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
}

export async function deleteMonthHabit(id, year, month) {
  await fetch(`/api/monthHabits/${id}?year=${year}&month=${month}`, { method: "DELETE", headers: await authHeaders() })
}

// --- Weekly Routine ---

export async function getRoutine() {
  const res = await fetch("/api/routine")
  return res.json()
}

export async function saveRoutine(data) {
  await fetch("/api/routine", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
}

// --- Todos CRUD ---

export async function getTodos() {
  const res = await fetch("/api/todos")
  return res.json()
}

export async function addTodo({ text, category, dueDate }) {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ text, category, dueDate }),
  })
  const { id } = await res.json()
  return id
}

export async function updateTodo(id, data) {
  await fetch(`/api/todos/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
}

export async function deleteTodo(id) {
  await fetch(`/api/todos/${id}`, { method: "DELETE", headers: await authHeaders() })
}

export async function getTodoCategories() {
  const res = await fetch("/api/todos/categories")
  return res.json()
}

export async function saveTodoCategories(categories) {
  await fetch("/api/todos/categories", {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ categories }),
  })
}

// --- Plans ---

export async function getProgress(days = 30) {
  const res = await fetch(`/api/progress?days=${days}`)
  return res.json()
}

export async function getPlan(date) {
  const res = await fetch(`/api/plans/${date}`)
  return res.json()
}

export async function updatePlanItemStatus(date, itemIndex, status) {
  await fetch(`/api/plans/${date}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ itemIndex, status }),
  })
}

export async function updatePlanItem(date, itemIndex, patch) {
  const res = await fetch(`/api/plans/${date}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ itemIndex, patch }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `update failed (${res.status})`)
  }
  return res.json()
}

export async function logInstance({ date, templateId, values, note, linkedPlanItem }) {
  const res = await fetch(`/api/instances`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ date, templateId, values, note, linkedPlanItem }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `log failed (${res.status})`)
  }
  return res.json()
}

export async function generatePlan(date) {
  const res = await fetch(`/api/plans/${date}/generate`, {
    method: "POST",
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `generate failed (${res.status})`)
  }
  return res.json()
}

// --- Stints (the chassis) + goals inside them ---

export async function getCurrentStint() {
  const res = await fetch(`/api/stints/current`)
  return res.json()
}

export async function getStintProgress() {
  const res = await fetch(`/api/progress/stint`)
  return res.json()
}

export async function getStintTrend() {
  const res = await fetch(`/api/progress/stint-trend`)
  return res.json()
}

export async function bootstrapCurrentStint(opts = {}) {
  const res = await fetch(`/api/stints/current`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(opts),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `bootstrap failed (${res.status})`)
  }
  return res.json()
}

export async function getStints() {
  const res = await fetch(`/api/stints`)
  return res.json()
}

export async function createStint(data) {
  const res = await fetch(`/api/stints`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `create failed (${res.status})`)
  }
  return res.json()
}

export async function getStint(id) {
  const res = await fetch(`/api/stints/${encodeURIComponent(id)}`)
  return res.json()
}

export async function patchStint(id, patch) {
  const res = await fetch(`/api/stints/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `update failed (${res.status})`)
  }
  return res.json()
}

export async function archiveStint(id) {
  const res = await fetch(`/api/stints/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `archive failed (${res.status})`)
  }
  return res.json()
}

export async function deleteStintHard(id) {
  const res = await fetch(`/api/stints/${encodeURIComponent(id)}?hard=1`, {
    method: "DELETE",
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `delete failed (${res.status})`)
  }
  return res.json()
}

// --- Goals inside a stint ---

export async function getGoals({ stintId, archived = false } = {}) {
  const qs = new URLSearchParams()
  if (stintId) qs.set("stintId", stintId)
  if (archived) qs.set("archived", "1")
  const res = await fetch(`/api/goals?${qs.toString()}`)
  return res.json()
}

export async function getGoal(id) {
  const res = await fetch(`/api/goals/${encodeURIComponent(id)}`)
  return res.json()
}

export async function createGoal(data) {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `create failed (${res.status})`)
  }
  return res.json()
}

export async function patchGoal(id, patch) {
  const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `update failed (${res.status})`)
  }
  return res.json()
}

export async function archiveGoal(id) {
  const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `archive failed (${res.status})`)
  }
  return res.json()
}

// --- Config ---

export async function getConfig() {
  const res = await fetch("/api/config")
  return res.json()
}

export async function saveConfig(data) {
  await fetch("/api/config", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  })
}
