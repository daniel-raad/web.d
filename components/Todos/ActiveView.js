import { useState } from "react"
import TodoItem from "./TodoItem"
import AddTodo from "./AddTodo"
import styles from "../../styles/Todos.module.css"

export default function ActiveView({ todos, categories, onToggle, onDelete, onUpdateDate, onAdd, onAddCategory, onRenameCategory, onDeleteCategory }) {
  const [newCategory, setNewCategory] = useState("")
  const [editingCat, setEditingCat] = useState(null)
  const [editingName, setEditingName] = useState("")
  const [expandedCompleted, setExpandedCompleted] = useState({})
  const activeTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)

  const grouped = {}
  const completedGrouped = {}
  categories.forEach((cat) => { grouped[cat] = []; completedGrouped[cat] = [] })
  activeTodos.forEach((t) => {
    const cat = t.category || "Uncategorized"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  })
  completedTodos.forEach((t) => {
    const cat = t.category || "Uncategorized"
    if (!completedGrouped[cat]) completedGrouped[cat] = []
    completedGrouped[cat].push(t)
  })

  const handleAddCategory = (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    onAddCategory(newCategory.trim())
    setNewCategory("")
  }

  const startRename = (cat) => {
    setEditingCat(cat)
    setEditingName(cat)
  }

  const commitRename = (oldName) => {
    if (editingName.trim() && editingName !== oldName) {
      onRenameCategory(oldName, editingName.trim())
    }
    setEditingCat(null)
  }

  const orderedKeys = [...categories]
  ;[...Object.keys(grouped), ...Object.keys(completedGrouped)].forEach((k) => {
    if (!orderedKeys.includes(k)) orderedKeys.push(k)
  })

  return (
    <div>
      {orderedKeys.map((cat) => (
        <div key={cat} className={styles.categorySection}>
          <div className={styles.categoryHeader}>
            {editingCat === cat ? (
              <input
                className={styles.categoryRenameInput}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitRename(cat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(cat)
                  if (e.key === "Escape") setEditingCat(null)
                }}
                autoFocus
              />
            ) : (
              <span className={styles.categoryName} onDoubleClick={() => startRename(cat)}>
                {cat}
              </span>
            )}
            <div className={styles.categoryActions}>
              <span className={styles.categoryCount}>
                {(grouped[cat] || []).length} active
                {(completedGrouped[cat] || []).length > 0 && (
                  <> · {(completedGrouped[cat] || []).length} done</>
                )}
              </span>
              <button
                className={styles.categoryActionBtn}
                onClick={() => startRename(cat)}
                title="Rename category"
              >
                ✎
              </button>
              <button
                className={`${styles.categoryActionBtn} ${styles.categoryDeleteBtn}`}
                onClick={() => {
                  if (window.confirm(`Delete "${cat}" and all its todos?`)) {
                    onDeleteCategory(cat)
                  }
                }}
                title="Delete category"
              >
                ✕
              </button>
            </div>
          </div>
          <div className={styles.todoList}>
            {(grouped[cat] || []).map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdateDate={onUpdateDate} />
            ))}
          </div>
          <AddTodo category={cat} onAdd={onAdd} />
          {(completedGrouped[cat] || []).length > 0 && (
            <div className={styles.completedInCategory}>
              <button
                className={styles.completedToggle}
                onClick={() => setExpandedCompleted((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              >
                {expandedCompleted[cat] ? "▾" : "▸"} {(completedGrouped[cat] || []).length} completed
              </button>
              {expandedCompleted[cat] && (
                <div className={styles.todoList}>
                  {(completedGrouped[cat] || []).map((todo) => (
                    <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdateDate={onUpdateDate} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <form className={styles.addCategoryForm} onSubmit={handleAddCategory}>
        <input
          className={styles.addCategoryInput}
          placeholder="New category..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button className={styles.addBtn} type="submit">Add Category</button>
      </form>
    </div>
  )
}
