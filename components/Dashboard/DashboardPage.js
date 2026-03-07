import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import TodoPage from "../Todos/TodoPage"
import HabitsSection from "./HabitsSection"
import IronmanView from "../Todos/IronmanView"
import { getConfig } from "../../lib/firestore"
import styles from "../../styles/Dashboard.module.css"

const TABS = [
  { key: "todos", label: "Todos" },
  { key: "habits", label: "Habits" },
  { key: "ironman", label: "Ironman" },
]

export default function DashboardPage() {
  const router = useRouter()
  const { tab, view } = router.query
  const [activeTab, setActiveTab] = useState(tab || "todos")
  const [habitsSubView, setHabitsSubView] = useState(view || "today")
  const [countdown, setCountdown] = useState({ days: null, hours: "00", minutes: "00", seconds: "00" })
  const [config, setConfig] = useState(null)

  useEffect(() => {
    if (tab && TABS.some((t) => t.key === tab)) setActiveTab(tab)
    if (view) setHabitsSubView(view)
  }, [tab, view])

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    if (!config || !config.targetDate) return
    const target = new Date(config.targetDate + "T00:00:00Z")

    function tick() {
      const diff = target - new Date()
      if (diff <= 0) {
        setCountdown({ days: 0, hours: "00", minutes: "00", seconds: "00" })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, "0")
      const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0")
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, "0")
      setCountdown({ days, hours, minutes, seconds })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [config])

  const switchTab = (key) => {
    setActiveTab(key)
    const query = { tab: key }
    if (key === "habits") query.view = habitsSubView
    router.replace({ pathname: "/dashboard", query }, undefined, { shallow: true })
  }

  const switchHabitsSubView = (v) => {
    setHabitsSubView(v)
    router.replace({ pathname: "/dashboard", query: { tab: "habits", view: v } }, undefined, { shallow: true })
  }

  const daysToGo = countdown.days

  return (
    <div className={`${styles.dashboard} terminal`}>
      {/* Countdown hero */}
      <div className={styles.countdownHero}>
        <div className={styles.countdownLabel}>
          <span className={styles.ironmanRed}>IRON</span>
          <span className={styles.ironmanWhite}>MAN</span>
          <span className={styles.ironmanRed}> 70.3</span>
        </div>
        {daysToGo !== null && (
          <div className={styles.countdownNumber}>{daysToGo}</div>
        )}
        <div className={styles.countdownSubtext}>days to go</div>
        {daysToGo !== null && (
          <div className={styles.countdownTimer}>
            <div className={styles.timerSegment}>
              <span className={styles.timerValue}>{countdown.hours}</span>
              <span className={styles.timerUnit}>hrs</span>
            </div>
            <span className={styles.timerSep}>:</span>
            <div className={styles.timerSegment}>
              <span className={styles.timerValue}>{countdown.minutes}</span>
              <span className={styles.timerUnit}>min</span>
            </div>
            <span className={styles.timerSep}>:</span>
            <div className={styles.timerSegment}>
              <span className={styles.timerValue}>{countdown.seconds}</span>
              <span className={styles.timerUnit}>sec</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "todos" && <TodoPage />}
        {activeTab === "habits" && (
          <HabitsSection subView={habitsSubView} onSubViewChange={switchHabitsSubView} />
        )}
        {activeTab === "ironman" && <IronmanView />}
      </div>
    </div>
  )
}
