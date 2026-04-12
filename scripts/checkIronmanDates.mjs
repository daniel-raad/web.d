import assert from "node:assert/strict"
import {
  getCurrentWeek,
  getTodayTrainingSessions,
  getTrainingWeekProgress,
} from "../components/Todos/ironmanData.js"

const startDate = "2026-04-03"
const today = "2026-04-12"
const checked = {
  "w2-d0-s0": true,
  "w2-d0-s1": true,
  "w2-d1-s0": true,
}

const currentWeek = getCurrentWeek(startDate, today)
assert.equal(currentWeek, 2)

const week = getTrainingWeekProgress(2, startDate, checked, { today })
assert.equal(week.status, "current")
assert.deepEqual(week.dateRange, { start: "2026-04-10", end: "2026-04-16" })
assert.equal(week.progress, "3/11")
assert.equal(week.dueProgress, "3/6")
assert.equal(week.totals.upcoming, 5)
assert.equal(week.totals.dueToday, 2)

const futureSessions = week.days
  .flatMap((day) => day.sessions)
  .filter((session) => session.date > today)
assert.equal(futureSessions.length, 5)
assert.equal(futureSessions.every((session) => session.status === "upcoming"), true)

const todaySessions = getTodayTrainingSessions(2, startDate, checked, { today })
assert.equal(todaySessions.length, 2)
assert.equal(todaySessions.every((session) => session.status === "due_today"), true)

console.log("Ironman date regression checks passed")
