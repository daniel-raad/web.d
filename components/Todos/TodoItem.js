import { useState } from "react"
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
  const due = formatDueDate(todo.dueDate)

  const handleDateChange = (e) => {
    onUpdateDate(todo.id, e.target.value)
    setEditingDate(false)
  }

  return (
    <div className={styles.todoItem}>
      <div
        className={`${styles.checkbox} ${todo.completed ? styles.checkboxDone : ""}`}
        onClick={() => onToggle(todo.id, !todo.completed)}
      >
        {todo.completed && "✓"}
      </div>
      <span className={`${styles.todoText} ${todo.completed ? styles.todoTextDone : ""}`}>
        {todo.text}
      </span>
      {!todo.completed && (
        <>
          {editingDate ? (
            <input
              type="date"
              className={styles.todoDateInline}
              value={todo.dueDate || ""}
              onChange={handleDateChange}
              onBlur={() => setEditingDate(false)}
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
  )
}
