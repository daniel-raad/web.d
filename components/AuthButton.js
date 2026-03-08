import React from "react"
import { useAuth } from "../lib/AuthContext"

export default function AuthButton() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <button
        onClick={signOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "6px 14px 6px 6px",
          color: "rgba(255,255,255,0.7)",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.2s",
          backdropFilter: "blur(8px)",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255,255,255,0.1)"
          e.target.style.borderColor = "rgba(255,255,255,0.2)"
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255,255,255,0.06)"
          e.target.style.borderColor = "rgba(255,255,255,0.1)"
        }}
      >
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            style={{ width: 26, height: 26, borderRadius: "8px" }}
            referrerPolicy="no-referrer"
          />
        )}
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={signIn}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "8px 16px",
        color: "rgba(255,255,255,0.6)",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(255,255,255,0.1)"
        e.target.style.color = "rgba(255,255,255,0.9)"
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(255,255,255,0.06)"
        e.target.style.color = "rgba(255,255,255,0.6)"
      }}
    >
      Sign In
    </button>
  )
}
