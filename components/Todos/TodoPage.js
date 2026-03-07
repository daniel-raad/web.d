import { useState, useEffect, useCallback } from "react"
import ActiveView from "./ActiveView"
import WeekView from "./WeekView"
import CompletedView from "./CompletedView"
import { getTodos, addTodo, updateTodo, deleteTodo, getTodoCategories, saveTodoCategories } from "../../lib/firestore"
import styles from "../../styles/Todos.module.css"

export default function TodoPage() {
  const [todos, setTodos] = useState([])
  const [categories, setCategories] = useState([])
  const [view, setView] = useState("active")
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [todosData, catData] = await Promise.all([
      getTodos(),
      getTodoCategories(),
    ])
    setTodos(todosData)
    setCategories(catData.categories || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async (id, completed) => {
    const today = new Date().toISOString().split("T")[0]
    const updates = { completed, completedAt: completed ? today : null }
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
    await updateTodo(id, updates)
  }

  const handleAdd = async ({ text, category, dueDate }) => {
    const id = await addTodo({ text, category, dueDate })
    setTodos((prev) => [
      { id, text, category, dueDate, completed: false, completedAt: null, createdAt: Date.now() },
      ...prev,
    ])
  }

  const handleDelete = async (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await deleteTodo(id)
  }

  const handleUpdateDate = async (id, dueDate) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dueDate: dueDate || null } : t))
    )
    await updateTodo(id, { dueDate: dueDate || null })
  }

  const handleAddCategory = async (name) => {
    const updated = [...categories, name]
    setCategories(updated)
    await saveTodoCategories(updated)
  }

  const handleRenameCategory = async (oldName, newName) => {
    if (!newName.trim() || newName === oldName) return
    const updated = categories.map((c) => (c === oldName ? newName : c))
    setCategories(updated)
    setTodos((prev) =>
      prev.map((t) => (t.category === oldName ? { ...t, category: newName } : t))
    )
    await saveTodoCategories(updated)
    // Update all todos in this category
    const affectedTodos = todos.filter((t) => t.category === oldName)
    await Promise.all(affectedTodos.map((t) => updateTodo(t.id, { category: newName })))
  }

  const handleDeleteCategory = async (name) => {
    const updated = categories.filter((c) => c !== name)
    setCategories(updated)
    await saveTodoCategories(updated)
    // Delete all todos in this category
    const affectedTodos = todos.filter((t) => t.category === name)
    setTodos((prev) => prev.filter((t) => t.category !== name))
    await Promise.all(affectedTodos.map((t) => deleteTodo(t.id)))
  }

  return (
    <div className={styles.page}>
      <div className={styles.viewToggle}>
        {["active", "week", "completed"].map((mode) => (
          <button
            key={mode}
            className={`${styles.viewToggleBtn} ${view === mode ? styles.viewToggleActive : ""}`}
            onClick={() => setView(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <>
          {view === "active" && (
            <ActiveView
              todos={todos}
              categories={categories}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateDate={handleUpdateDate}
              onAdd={handleAdd}
              onAddCategory={handleAddCategory}
              onRenameCategory={handleRenameCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
          {view === "week" && (
            <WeekView todos={todos} onToggle={handleToggle} />
          )}
          {view === "completed" && (
            <CompletedView todos={todos} onToggle={handleToggle} onDelete={handleDelete} onUpdateDate={handleUpdateDate} />
          )}
        </>
      )}
    </div>
  )
}
