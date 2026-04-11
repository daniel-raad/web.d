// Google Calendar client for the agent.
//
// Talks to the Google Calendar REST API directly with axios — no SDK. The
// SDK packages (@googleapis/calendar, googleapis) drag in google-auth-library
// + gaxios + a deeply-nested transitive tree that Vercel's NFT bundler can't
// fully trace, which crashed the function at runtime with missing files.
// Raw HTTP avoids that entire class of problem.
//
// One-time setup:
//   1. Create an OAuth client (type: Desktop) at console.cloud.google.com
//   2. Run: node scripts/setupGoogleCalendarAuth.js
//   3. Add the printed env vars to .env / Vercel:
//        GOOGLE_OAUTH_CLIENT_ID
//        GOOGLE_OAUTH_CLIENT_SECRET
//        GOOGLE_OAUTH_REFRESH_TOKEN
//        AGENT_CALENDAR_ID  (optional — defaults to "primary")

import axios from "axios"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3"

let cachedToken = null // { accessToken, expiresAt }

async function getAccessToken() {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN."
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const res = await axios.post(TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })

  const { access_token: accessToken, expires_in: expiresIn } = res.data
  cachedToken = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  }
  return accessToken
}

async function authedRequest(method, url, { params, data } = {}) {
  const token = await getAccessToken()
  const res = await axios({
    method,
    url,
    params,
    data,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  return res.data
}

// Returns a client whose surface mirrors the bits of the googleapis SDK we use,
// so the call sites in chatEngine.js can stay unchanged. Each method returns
// `{ data: ... }` to match the SDK's response shape.
export function getCalendarClient() {
  return {
    events: {
      async list({ calendarId, timeMin, timeMax, maxResults, singleEvents, orderBy, q }) {
        const data = await authedRequest(
          "get",
          `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            params: {
              timeMin,
              timeMax,
              maxResults,
              singleEvents,
              orderBy,
              q,
            },
          }
        )
        return { data }
      },
      async insert({ calendarId, requestBody }) {
        const data = await authedRequest(
          "post",
          `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
          { data: requestBody }
        )
        return { data }
      },
      async patch({ calendarId, eventId, requestBody }) {
        const data = await authedRequest(
          "patch",
          `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { data: requestBody }
        )
        return { data }
      },
      async delete({ calendarId, eventId }) {
        await authedRequest(
          "delete",
          `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
        )
        return { data: null }
      },
    },
  }
}

export function getCalendarId() {
  return process.env.AGENT_CALENDAR_ID || "primary"
}
