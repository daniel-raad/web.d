// --- Habits CRUD ---

export async function getHabits() {
  const res = await fetch("/api/habits")
  return res.json()
}

export async function addHabit({ name, emoji, order }) {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, emoji, order }),
  })
  const { id } = await res.json()
  return id
}

export async function updateHabit(id, data) {
  await fetch(`/api/habits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function deleteHabit(id) {
  await fetch(`/api/habits/${id}`, { method: "DELETE" })
}

// --- Habit Entries ---

export async function getEntries(year, month) {
  const res = await fetch(`/api/entries?year=${year}&month=${month}`)
  return res.json()
}

export async function toggleHabit(date, habitId, value) {
  await fetch(`/api/entries/${date}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habitId, value }),
  })
}

export async function saveMoment(date, text) {
  await fetch(`/api/entries/${date}/moment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
}

export async function saveWeight(date, weight) {
  await fetch(`/api/entries/${date}/weight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight }),
  })
}

export async function saveSleep(date, sleep) {
  await fetch(`/api/entries/${date}/sleep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sleep }),
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, emoji, order }),
  })
  const { id } = await res.json()
  return id
}

export async function updateMonthHabit(id, year, month, data) {
  await fetch(`/api/monthHabits/${id}?year=${year}&month=${month}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function deleteMonthHabit(id, year, month) {
  await fetch(`/api/monthHabits/${id}?year=${year}&month=${month}`, { method: "DELETE" })
}

// --- Weekly Routine ---

export async function getRoutine() {
  const res = await fetch("/api/routine")
  return res.json()
}

export async function saveRoutine(data) {
  await fetch("/api/routine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

// --- Config ---

export async function getConfig() {
  const res = await fetch("/api/config")
  return res.json()
}

export async function saveConfig(data) {
  await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}
