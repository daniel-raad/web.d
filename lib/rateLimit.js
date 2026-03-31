import { adminDb } from "./firebaseAdmin"

const COLLECTION = "rateLimits"
const MAX_REQUESTS = 20        // 20 requests per hour for public visitors
const WINDOW_MS = 60 * 60 * 1000

export async function checkRateLimit(identifier) {
  const key = `chat:${identifier}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const ref = adminDb.collection(COLLECTION).doc(key)
  const doc = await ref.get()

  if (!doc.exists) {
    await ref.set({ requests: [now] })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  const data = doc.data()
  const recent = (data.requests || []).filter((t) => t > windowStart)

  if (recent.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) }
  }

  recent.push(now)
  await ref.set({ requests: recent })
  return { allowed: true, remaining: MAX_REQUESTS - recent.length }
}
