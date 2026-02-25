import { useState } from "react"
import styles from "../../styles/Todos.module.css"

export default function AddTodo({ category, onAdd }) {
  const [text, setText] = useState("")
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ text: text.trim(), category, dueDate: dueDate || null })
    setText("")
    setDueDate("")
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <input
        className={styles.addInput}
        placeholder="Add a todo..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        className={styles.addDateInput}
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <button className={styles.addBtn} type="submit">Add</button>
    </form>
  )
}
