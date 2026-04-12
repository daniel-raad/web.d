export const DEFAULT_TIME_ZONE = "Europe/London"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || "")
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

export function formatDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function dateKeyToLocalDate(dateKey) {
  const parts = parseDateKey(dateKey)
  if (!parts) return new Date(dateKey)
  return new Date(parts.year, parts.month - 1, parts.day)
}

function dateKeyToUtcNoon(dateKey) {
  const parts = parseDateKey(dateKey)
  if (!parts) return new Date(dateKey)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
}

export function addDaysToDateKey(dateKey, days) {
  const date = dateKeyToUtcNoon(dateKey)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function compareDateKeys(a, b) {
  return Math.round((dateKeyToUtcNoon(a) - dateKeyToUtcNoon(b)) / MS_PER_DAY)
}

export function getDateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getDayName(date = new Date(), timeZone = DEFAULT_TIME_ZONE, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone }).format(date)
}

export function getDayNameForDateKey(dateKey, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(dateKeyToUtcNoon(dateKey))
}

export function getDayOfWeekForDateKey(dateKey) {
  return dateKeyToUtcNoon(dateKey).getUTCDay()
}

export function getHourInTimeZone(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === "hour")?.value || "0"
  return Number(hour)
}

export function getTimeLabel(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.hour}:${values.minute} ${timeZone}`
}

export function getDateContext(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const today = getDateKey(date, timeZone)
  return {
    today,
    dayName: getDayName(date, timeZone),
    dayOfWeek: getDayOfWeekForDateKey(today),
    hour: getHourInTimeZone(date, timeZone),
    currentTime: getTimeLabel(date, timeZone),
  }
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const utcMs = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )
  return (utcMs - date.getTime()) / 60000
}

export function zonedDateTimeToISOString(dateKey, time = {}, timeZone = DEFAULT_TIME_ZONE) {
  const parts = parseDateKey(dateKey)
  if (!parts) {
    const date = new Date(dateKey)
    return Number.isFinite(date.getTime()) ? date.toISOString() : null
  }

  const hour = time.hour || 0
  const minute = time.minute || 0
  const second = time.second || 0
  const millisecond = time.millisecond || 0
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second, millisecond))
  const firstOffset = getTimeZoneOffsetMinutes(utcGuess, timeZone)
  const firstInstant = new Date(utcGuess.getTime() - firstOffset * 60000)
  const secondOffset = getTimeZoneOffsetMinutes(firstInstant, timeZone)
  return new Date(utcGuess.getTime() - secondOffset * 60000).toISOString()
}
