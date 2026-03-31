import { useState, useEffect, useRef } from "react"
import styles from "../../styles/Todos.module.css"

function formatDueDate(dueDate) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + "T00:00:00")
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, className: styles.todoDueDateOverdue }
  if (diff === 0) return { label: "Today", className: styles.todoDueDateToday }
  if (diff === 1) return { label: "Tomorrow", className: styles.todoDueDate }
  return { label: dueDate, className: styles.todoDueDate }
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdateDate }) {
  const [editingDate, setEditingDate] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState("")
  const dateRef = useRef(null)
  const due = formatDueDate(todo.dueDate)

  // Close date picker only when clicking outside the input entirely
  useEffect(() => {
    if (!editingDate) return
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setEditingDate(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [editingDate])

  const handleDateChange = (e) => {
    onUpdateDate(todo.id, e.target.value)
    setEditingDate(false)
  }

  const handleToggle = () => {
    if (!todo.completed) {
      // Completing — show note input
      setShowNoteInput(true)
    } else {
      // Uncompleting
      onToggle(todo.id, false, null)
    }
  }

  const handleComplete = () => {
    onToggle(todo.id, true, note.trim() || null)
    setShowNoteInput(false)
    setNote("")
  }

  const handleSkipNote = () => {
    onToggle(todo.id, true, null)
    setShowNoteInput(false)
    setNote("")
  }

  return (
    <div>
      <div className={styles.todoItem}>
        <div
          className={`${styles.checkbox} ${todo.completed ? styles.checkboxDone : ""}`}
          onClick={handleToggle}
        >
          {todo.completed && "✓"}
        </div>
        <div className={styles.todoContent}>
          <span className={`${styles.todoText} ${todo.completed ? styles.todoTextDone : ""}`}>
            {todo.text}
          </span>
          {todo.completed && todo.note && (
            <span className={styles.todoNote}>{todo.note}</span>
          )}
        </div>
        {!todo.completed && (
          <>
            {editingDate ? (
              <input
                ref={dateRef}
                type="date"
                className={styles.todoDateInline}
                value={todo.dueDate || ""}
                onChange={handleDateChange}
                autoFocus
              />
            ) : (
              <span
                className={due ? due.className : styles.todoDueDateAdd}
                onClick={() => setEditingDate(true)}
              >
                {due ? due.label : "+ date"}
              </span>
            )}
          </>
        )}
        <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)}>✕</button>
      </div>
      {showNoteInput && (
        <div className={styles.noteInputRow}>
          <input
            className={styles.noteInput}
            placeholder="Add a note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleComplete()
              if (e.key === "Escape") handleSkipNote()
            }}
            autoFocus
          />
          <button className={styles.noteBtn} onClick={handleComplete}>Done</button>
          <button className={styles.noteSkipBtn} onClick={handleSkipNote}>Skip</button>
        </div>
      )}
    </div>
  )
}
