import React, { useState, useRef, useEffect } from "react"
import { useAuth, getIdToken } from "../../lib/AuthContext"
import styles from "./ChatWidget.module.css"

export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const headers = { "Content-Type": "application/json" }
      const token = await getIdToken()
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: "assistant", content: data.reply || "Sorry, something went wrong." }])
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "Failed to get a response. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerDot} />
              <span className={styles.headerTitle}>Ask me anything</span>
              {user && <span className={styles.headerBadge}>Daniel</span>}
            </div>
            <button onClick={() => setOpen(false)} className={styles.close}>&times;</button>
          </div>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.empty}>
                {user
                  ? "Hey Daniel — ask me to check your todos, log habits, or anything else."
                  : "Hi! I can tell you about Daniel — his work, training, and what he's building."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${styles[m.role]}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className={styles.thinking}>
                <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className={styles.inputArea}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "What do you need?" : "Ask about Daniel..."}
              className={styles.input}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className={styles.send}>
              &#8593;
            </button>
          </div>
        </div>
      )}
      <button
        className={`${styles.bubble} ${open ? styles.bubbleOpen : ""}`}
        onClick={() => setOpen(!open)}
      >
        {open ? "✕" : "✦"}
      </button>
    </>
  )
}
