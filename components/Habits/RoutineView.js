import React, { useState, useRef, useCallback, useEffect } from "react"
import { getRoutine, saveRoutine } from "../../lib/firestore"
import styles from "../../styles/Habits.module.css"

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function RoutineView() {
  const [routine, setRoutine] = useState(null)
  const saveTimer = useRef(null)

  // 0=Sun, 1=Mon ... 6=Sat → remap to our Mon-based index
  const todayIndex = (() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })()

  useEffect(() => {
    getRoutine().then(setRoutine)
  }, [])

  const persistRoutine = useCallback((updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveRoutine(updated)
    }, 800)
  }, [])

  const handleChange = (day, index, value) => {
    setRoutine((prev) => {
      const updated = { ...prev, [day]: [...prev[day]] }
      updated[day][index] = value
      persistRoutine(updated)
      return updated
    })
  }

  const handleAdd = (day) => {
    setRoutine((prev) => {
      const updated = { ...prev, [day]: [...(prev[day] || []), ""] }
      persistRoutine(updated)
      return updated
    })
  }

  const handleRemove = (day, index) => {
    setRoutine((prev) => {
      const updated = { ...prev, [day]: prev[day].filter((_, i) => i !== index) }
      persistRoutine(updated)
      return updated
    })
  }

  if (!routine) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.routineWrapper}>
      <div className={styles.routineGrid}>
        {DAYS.map((day, di) => (
          <div key={day} className={styles.routineDay}>
            <div className={`${styles.routineDayHeader} ${di === todayIndex ? styles.routineDayToday : ""}`}>
              {DAY_LABELS[di]}
            </div>
            <div className={styles.routineItems}>
              {(routine[day] || []).map((item, i) => (
                <div key={i} className={styles.routineItemRow}>
                  <input
                    className={styles.routineItem}
                    value={item}
                    onChange={(e) => handleChange(day, i, e.target.value)}
                    placeholder="Activity..."
                  />
                  <button
                    className={styles.routineRemoveBtn}
                    onClick={() => handleRemove(day, i)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className={styles.routineAddBtn} onClick={() => handleAdd(day)}>
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
