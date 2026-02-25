import TodoItem from "./TodoItem"
import styles from "../../styles/Todos.module.css"

export default function CompletedView({ todos, onToggle, onDelete, onUpdateDate }) {
  const completed = todos.filter((t) => t.completed)

  // Group by completedAt date
  const grouped = {}
  completed.forEach((t) => {
    const date = t.completedAt || "Unknown"
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(t)
  })

  // Sort dates most recent first
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (completed.length === 0) {
    return <div className={styles.emptyState}>No completed todos yet.</div>
  }

  return (
    <div>
      {sortedDates.map((date) => (
        <div key={date} className={styles.completedGroup}>
          <div className={styles.completedDate}>{date}</div>
          <div className={styles.todoList}>
            {grouped[date].map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdateDate={onUpdateDate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
