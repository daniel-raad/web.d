import React, { useState, useEffect } from "react"
import { addHabit, updateHabit, deleteHabit, getConfig, saveConfig } from "../../lib/firestore"
import styles from "../../styles/Habits.module.css"

export default function HabitSettings({ habits, onClose, onRefresh }) {
  const [localHabits, setLocalHabits] = useState(habits)
  const [targetDate, setTargetDate] = useState("")
  const [startDate, setStartDate] = useState("")

  useEffect(() => {
    getConfig().then((cfg) => {
      setTargetDate(cfg.targetDate || "")
      setStartDate(cfg.startDate || "")
    })
  }, [])

  const handleNameChange = (id, name) => {
    setLocalHabits((h) => h.map((x) => (x.id === id ? { ...x, name } : x)))
  }

  const handleEmojiChange = (id, emoji) => {
    setLocalHabits((h) => h.map((x) => (x.id === id ? { ...x, emoji } : x)))
  }

  const handleSaveHabit = async (habit) => {
    await updateHabit(habit.id, { name: habit.name, emoji: habit.emoji })
  }

  const handleDelete = async (id) => {
    await deleteHabit(id)
    setLocalHabits((h) => h.filter((x) => x.id !== id))
    onRefresh()
  }

  const handleAdd = async () => {
    const order = localHabits.length
    const id = await addHabit({ name: "New Habit", emoji: "✅", order })
    setLocalHabits((h) => [...h, { id, name: "New Habit", emoji: "✅", order, active: true }])
    onRefresh()
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return
    const updated = [...localHabits]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    // Update order in Firestore
    await updateHabit(updated[index - 1].id, { order: index - 1 })
    await updateHabit(updated[index].id, { order: index })
    setLocalHabits(updated)
    onRefresh()
  }

  const handleSaveConfig = async () => {
    await saveConfig({ targetDate, startDate })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.settingsPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsTitle}>Habit Settings</div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Target Date (Ironman 70.3)</label>
          <input
            type="date"
            className={styles.settingsInput}
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            onBlur={handleSaveConfig}
          />
        </div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Start Date</label>
          <input
            type="date"
            className={styles.settingsInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={handleSaveConfig}
          />
        </div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Habits</label>
          <ul className={styles.habitList}>
            {localHabits.map((h, i) => (
              <li key={h.id} className={styles.habitItem}>
                <button className={styles.iconBtn} onClick={() => handleMoveUp(i)} title="Move up">
                  ↑
                </button>
                <input
                  className={`${styles.emojiInput}`}
                  value={h.emoji}
                  onChange={(e) => handleEmojiChange(h.id, e.target.value)}
                  onBlur={() => handleSaveHabit(h)}
                />
                <input
                  className={`${styles.nameInput}`}
                  value={h.name}
                  onChange={(e) => handleNameChange(h.id, e.target.value)}
                  onBlur={() => handleSaveHabit(h)}
                />
                <button className={styles.iconBtn} onClick={() => handleDelete(h.id)} title="Delete">
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button className={styles.addBtn} onClick={handleAdd}>
            + Add Habit
          </button>
        </div>

        <button className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
