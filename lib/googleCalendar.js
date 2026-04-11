// Google Calendar client for the agent.
//
// One-time setup:
//   1. Create an OAuth client (type: Desktop) at console.cloud.google.com
//   2. Run: node scripts/setupGoogleCalendarAuth.js
//   3. Add the printed env vars to .env / Vercel:
//        GOOGLE_OAUTH_CLIENT_ID
//        GOOGLE_OAUTH_CLIENT_SECRET
//        GOOGLE_OAUTH_REFRESH_TOKEN
//        AGENT_CALENDAR_ID  (optional — defaults to "primary")
//
// The refresh token never expires (unless revoked), so this only needs to be
// done once. The client lazy-fetches a fresh access token on every call.

import { auth, calendar } from "@googleapis/calendar"

let cachedClient = null

export function getCalendarClient() {
  if (cachedClient) return cachedClient

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN."
    )
  }

  const oauth2Client = new auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  cachedClient = calendar({ version: "v3", auth: oauth2Client })
  return cachedClient
}

export function getCalendarId() {
  return process.env.AGENT_CALENDAR_ID || "primary"
}
