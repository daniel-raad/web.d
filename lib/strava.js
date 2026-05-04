import axios from "axios"
import { adminDb } from "./firebaseAdmin"

const TOKEN_DOC = adminDb.collection("assistant").doc("strava")
const STRAVA_API = "https://www.strava.com/api/v3"
const TOKEN_URL = "https://www.strava.com/oauth/token"
const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
const SCOPES = "read,activity:read_all,profile:read_all"

export function getAuthorizeUrl(state) {
  const clientId = process.env.STRAVA_CLIENT_ID
  const redirectUri = process.env.STRAVA_REDIRECT_URI
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "force",
    scope: SCOPES,
  })
  if (state) params.set("state", state)
  return `${AUTHORIZE_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code) {
  const res = await axios.post(TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  })
  const { access_token, refresh_token, expires_at, athlete } = res.data
  await TOKEN_DOC.set({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
    athleteId: athlete?.id || null,
    athleteName: athlete ? `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() : null,
    connectedAt: Date.now(),
  })
  return { athlete }
}

async function refreshTokens(refreshToken) {
  const res = await axios.post(TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })
  const { access_token, refresh_token, expires_at } = res.data
  await TOKEN_DOC.update({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
  })
  return access_token
}

async function getValidAccessToken() {
  const snap = await TOKEN_DOC.get()
  if (!snap.exists) {
    throw new Error("Strava is not connected. Visit /api/strava/connect to authorize.")
  }
  const { accessToken, refreshToken, expiresAt } = snap.data()
  const nowSec = Math.floor(Date.now() / 1000)
  if (expiresAt && nowSec < expiresAt - 60) return accessToken
  return refreshTokens(refreshToken)
}

export async function isConnected() {
  const snap = await TOKEN_DOC.get()
  return snap.exists
}

async function stravaGet(path, params) {
  const accessToken = await getValidAccessToken()
  const res = await axios.get(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params,
  })
  return res.data
}

function summarizeActivity(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.sport_type || a.type,
    startDate: a.start_date_local,
    distanceKm: a.distance ? +(a.distance / 1000).toFixed(2) : null,
    movingMinutes: a.moving_time ? Math.round(a.moving_time / 60) : null,
    elapsedMinutes: a.elapsed_time ? Math.round(a.elapsed_time / 60) : null,
    elevationGainM: a.total_elevation_gain ?? null,
    avgHeartRate: a.average_heartrate ?? null,
    maxHeartRate: a.max_heartrate ?? null,
    avgPaceMinPerKm:
      a.distance && a.moving_time
        ? +(a.moving_time / 60 / (a.distance / 1000)).toFixed(2)
        : null,
    avgSpeedKmh: a.average_speed ? +(a.average_speed * 3.6).toFixed(2) : null,
    sufferScore: a.suffer_score ?? null,
    kudos: a.kudos_count ?? 0,
  }
}

export async function getRecentActivities({ days = 14, perPage = 30 } = {}) {
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const data = await stravaGet("/athlete/activities", { after, per_page: Math.min(perPage, 100) })
  return data.map(summarizeActivity)
}

export async function getActivitySummary({ days = 7 } = {}) {
  const activities = await getRecentActivities({ days, perPage: 100 })
  const byType = {}
  let totalDistanceKm = 0
  let totalMinutes = 0
  let totalElevationM = 0
  for (const a of activities) {
    const t = a.type || "Other"
    if (!byType[t]) byType[t] = { count: 0, distanceKm: 0, minutes: 0 }
    byType[t].count += 1
    byType[t].distanceKm += a.distanceKm || 0
    byType[t].minutes += a.movingMinutes || 0
    totalDistanceKm += a.distanceKm || 0
    totalMinutes += a.movingMinutes || 0
    totalElevationM += a.elevationGainM || 0
  }
  for (const t of Object.keys(byType)) {
    byType[t].distanceKm = +byType[t].distanceKm.toFixed(2)
  }
  return {
    days,
    totals: {
      activities: activities.length,
      distanceKm: +totalDistanceKm.toFixed(2),
      hours: +(totalMinutes / 60).toFixed(1),
      elevationM: Math.round(totalElevationM),
    },
    byType,
    activities,
  }
}
