/* eslint-disable no-console */
// One-time OAuth flow to obtain a Google Calendar refresh token for the agent.
//
// Prerequisites:
//   1. In Google Cloud Console, create a project (or use existing).
//   2. Enable the "Google Calendar API".
//   3. Create OAuth credentials of type "Desktop app".
//   4. Copy the client ID and client secret.
//   5. Set them as env vars (or pass via CLI):
//        GOOGLE_OAUTH_CLIENT_ID=...
//        GOOGLE_OAUTH_CLIENT_SECRET=...
//
// Run:
//   node scripts/setupGoogleCalendarAuth.js
//
// The script spins up a local HTTP server, opens the consent URL, captures
// the auth code on the loopback redirect, exchanges it for a refresh token,
// and prints the token to add to your .env / Vercel.

const http = require("http")
const https = require("https")
const { URL } = require("url")

const SCOPES = ["https://www.googleapis.com/auth/calendar"]
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

function postForm(urlString, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString()
    const u = new URL(urlString)
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let chunks = ""
        res.on("data", (c) => (chunks += c))
        res.on("end", () => {
          try {
            const parsed = JSON.parse(chunks)
            if (res.statusCode >= 400) {
              reject(new Error(`Token endpoint ${res.statusCode}: ${chunks}`))
            } else {
              resolve(parsed)
            }
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET env vars first.")
    process.exit(1)
  }

  // Pick a free local port and use it as the redirect URI.
  const server = http.createServer()
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address()
  const redirectUri = `http://127.0.0.1:${port}/oauth/callback`

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  })
  const authUrl = `${AUTH_URL}?${authParams.toString()}`

  console.log("\nOpen this URL in your browser to authorize the agent:\n")
  console.log(authUrl)
  console.log("\nWaiting for the redirect...\n")

  const code = await new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      try {
        const url = new URL(req.url, redirectUri)
        if (url.pathname !== "/oauth/callback") {
          res.writeHead(404).end()
          return
        }
        const c = url.searchParams.get("code")
        const err = url.searchParams.get("error")
        if (err) {
          res.writeHead(400, { "Content-Type": "text/plain" }).end(`Auth error: ${err}`)
          reject(new Error(err))
          return
        }
        if (!c) {
          res.writeHead(400, { "Content-Type": "text/plain" }).end("Missing code")
          reject(new Error("Missing code"))
          return
        }
        res.writeHead(200, { "Content-Type": "text/html" }).end(
          "<html><body><h1>Authorized.</h1><p>You can close this tab.</p></body></html>"
        )
        resolve(c)
      } catch (e) {
        res.writeHead(500).end()
        reject(e)
      }
    })
  })

  server.close()

  const tokens = await postForm(TOKEN_URL, {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
  if (!tokens.refresh_token) {
    console.error("\nNo refresh_token returned. Try again — and revoke prior consent at https://myaccount.google.com/permissions if needed.")
    process.exit(1)
  }

  console.log("\nSuccess. Add these to your .env (and Vercel project settings):\n")
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`)
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`)
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log("\nOptional — set AGENT_CALENDAR_ID to a specific calendar id (defaults to 'primary').")
  console.log("To find calendar ids: open Google Calendar → Settings → click a calendar → 'Integrate calendar'.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
