import { adminDb } from "../../../lib/firebaseAdmin"
import { exchangeCodeForTokens } from "../../../lib/strava"

const STATE_TTL_MS = 10 * 60 * 1000

export default async function handler(req, res) {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`/dashboard?strava=error&reason=${encodeURIComponent(String(error))}`)
  }
  if (!code || !state) {
    return res.redirect("/dashboard?strava=error&reason=missing_code_or_state")
  }

  const stateRef = adminDb.collection("assistant").doc("strava_state")
  const snap = await stateRef.get()
  if (!snap.exists) {
    return res.redirect("/dashboard?strava=error&reason=no_state")
  }
  const stored = snap.data()
  const fresh = stored.createdAt && Date.now() - stored.createdAt < STATE_TTL_MS
  if (stored.state !== state || !fresh) {
    return res.redirect("/dashboard?strava=error&reason=invalid_state")
  }

  try {
    await exchangeCodeForTokens(code)
    await stateRef.delete()
    return res.redirect("/dashboard?strava=connected")
  } catch (e) {
    return res.redirect(`/dashboard?strava=error&reason=${encodeURIComponent(e.message || "exchange_failed")}`)
  }
}
