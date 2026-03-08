import axios from "axios"

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const MAX_LENGTH = 4096

export async function sendMessage(chatId, text) {
  const chunks = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LENGTH) {
      chunks.push(remaining)
      break
    }
    // Try to split at a newline before the limit
    let splitAt = remaining.lastIndexOf("\n", MAX_LENGTH)
    if (splitAt <= 0) splitAt = MAX_LENGTH
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt)
  }

  for (const chunk of chunks) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: chunk,
    })
  }
}
