import { adminDb } from "./firebaseAdmin"

const COLLECTION = "chatHistory"
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const MAX_MESSAGES = 20 // keep last N messages for context

export async function getRecentHistory(chatId) {
  const doc = await adminDb.collection(COLLECTION).doc(chatId).get()
  if (!doc.exists) return []

  const data = doc.data()
  const now = Date.now()

  // Start fresh session if last message was over 30 min ago
  if (data.lastMessageAt && now - data.lastMessageAt > SESSION_TIMEOUT_MS) {
    return []
  }

  return data.messages || []
}

export async function saveMessages(chatId, messages) {
  // Only keep the last N messages to avoid unbounded growth
  const trimmed = messages.slice(-MAX_MESSAGES)

  await adminDb.collection(COLLECTION).doc(chatId).set({
    messages: trimmed,
    lastMessageAt: Date.now(),
  })
}
