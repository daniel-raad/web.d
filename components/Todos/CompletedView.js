import TodoItem from "./TodoItem"
import { getDateKey as getZonedDateKey } from "../../lib/dates.js"
import styles from "../../styles/Todos.module.css"

function formatDate(timestamp) {
  if (!timestamp) return "Unknown"
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp)
  if (isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function getDateKey(timestamp) {
  if (!timestamp) return "Unknown"
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp)
  if (isNaN(date.getTime())) return "Unknown"
  return getZonedDateKey(date)
}

export default function CompletedView({ todos, onToggle, onDelete, onUpdateDate }) {
  const completed = todos.filter((t) => t.completed)

  // Group by completedAt date, then by category within each date
  const grouped = {}
  completed.forEach((t) => {
    const dateKey = getDateKey(t.completedAt)
    if (!grouped[dateKey]) grouped[dateKey] = { label: formatDate(t.completedAt), categories: {} }
    const cat = t.category || "Uncategorised"
    if (!grouped[dateKey].categories[cat]) grouped[dateKey].categories[cat] = []
    grouped[dateKey].categories[cat].push(t)
  })

  // Sort dates most recent first
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (completed.length === 0) {
    return <div className={styles.emptyState}>No completed todos yet.</div>
  }

  return (
    <div>
      {sortedDates.map((dateKey) => {
        const { label, categories } = grouped[dateKey]
        const sortedCategories = Object.keys(categories).sort()
        return (
          <div key={dateKey} className={styles.completedGroup}>
            <div className={styles.completedDate}>{label}</div>
            {sortedCategories.map((cat) => (
              <div key={cat}>
                <div className={styles.completedCategory}>{cat}</div>
                <div className={styles.todoList}>
                  {categories[cat].map((todo) => (
                    <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdateDate={onUpdateDate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
