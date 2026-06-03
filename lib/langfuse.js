import { Langfuse } from "langfuse"

// Singleton — only constructed if the three required env vars are present.
// Without them, getLangfuse() returns null and all instrumentation in
// chatEngine.js becomes a no-op. This keeps local dev and CI working without
// a Langfuse account.
let cached = null
let initTried = false

export function getLangfuse() {
  if (initTried) return cached
  initTried = true

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    return null
  }

  try {
    cached = new Langfuse({ publicKey, secretKey, baseUrl })
  } catch (e) {
    console.error("Langfuse init failed:", e.message)
    cached = null
  }
  return cached
}

// Best-effort flush. Serverless functions exit fast; without an explicit
// flush, queued events get dropped. Swallow errors — observability must
// never break the user-facing reply.
export async function flushLangfuse() {
  if (!cached) return
  try {
    await cached.flushAsync()
  } catch (e) {
    console.error("Langfuse flush failed:", e.message)
  }
}
