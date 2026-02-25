import styles from "../../styles/Todos.module.css"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatWeekRange(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const s = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}`
  const e = `${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  return `${s} – ${e}`
}

export default function WeekView({ todos, onToggle }) {
  const now = new Date()
  const todayStr = formatDate(now)
  const weekStart = getMonday(now)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push({ date: d, dateStr: formatDate(d), label: DAY_NAMES[i] })
  }

  const activeTodos = todos.filter((t) => !t.completed)
  const unscheduled = activeTodos.filter((t) => !t.dueDate)

  const prevWeek = () => { /* handled by parent */ }
  const nextWeek = () => { /* handled by parent */ }

  return (
    <div>
      <div className={styles.weekNav}>
        <span className={styles.weekLabel}>{formatWeekRange(weekStart)}</span>
      </div>

      <div className={styles.weekGrid}>
        {days.map((day) => {
          const isToday = day.dateStr === todayStr
          const dayTodos = todos.filter((t) => t.dueDate === day.dateStr)

          return (
            <div key={day.dateStr} className={styles.weekDay}>
              <div className={`${styles.weekDayHeader} ${isToday ? styles.weekDayToday : ""}`}>
                {day.label}
                <span className={styles.weekDayDate}>{day.date.getDate()}</span>
              </div>
              <div className={styles.weekDayItems}>
                {dayTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={styles.weekTodoItem}
                    onClick={() => onToggle(todo.id, !todo.completed)}
                  >
                    <div className={`${styles.weekTodoCheckbox} ${todo.completed ? styles.weekTodoCheckboxDone : ""}`}>
                      {todo.completed && "✓"}
                    </div>
                    <span className={`${styles.weekTodoText} ${todo.completed ? styles.weekTodoTextDone : ""}`}>
                      {todo.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {unscheduled.length > 0 && (
        <div className={styles.unscheduledSection}>
          <div className={styles.unscheduledTitle}>Unscheduled</div>
          <div className={styles.todoList}>
            {unscheduled.map((todo) => (
              <div
                key={todo.id}
                className={styles.weekTodoItem}
                onClick={() => onToggle(todo.id, !todo.completed)}
              >
                <div className={styles.weekTodoCheckbox} />
                <span className={styles.weekTodoText}>{todo.text}</span>
                <span className={styles.weekCategory}>{todo.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
