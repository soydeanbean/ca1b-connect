// src/pages/todos/Todos.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodoStatus,
  getTodoCounts,
  notifyOverdueTodos
} from "../../services/todoService";
import type { Todo, TodoStatus } from "../../types/Todo";
import "./Todos.css";

type FilterMode = "all" | "pending" | "done" | "overdue";

const EMPTY_FORM = {
  title: "",
  description: "",
  scheduledDate: "",
  scheduledTime: ""
};

function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getStatusLabel(status: TodoStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "done":
      return "Done";
    case "overdue":
      return "Overdue";
  }
}

export default function Todos() {
  const { user } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadTodos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const loaded = await getTodos(user.uid);
      setTodos(loaded);
      // Send minor notifications for overdue/due items (fire-and-forget)
      notifyOverdueTodos(user.uid, loaded).catch(() => {});
    } catch (err) {
      console.error("Failed to load todos:", err);
      setMessage("Could not load to-do list.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const counts = useMemo(() => getTodoCounts(todos), [todos]);

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case "pending":
        return todos.filter((t) => t.status === "pending");
      case "done":
        return todos.filter((t) => t.status === "done");
      case "overdue":
        return todos.filter((t) => t.status === "overdue");
      default:
        return todos;
    }
  }, [todos, filter]);

  const handleNew = () => {
    setEditingTodo(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description,
      scheduledDate: todo.scheduledDate,
      scheduledTime: todo.scheduledTime
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTodo(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.scheduledDate) {
      setMessage("Title and date are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (editingTodo) {
        await updateTodo(editingTodo.id, {
          title: form.title,
          description: form.description,
          scheduledDate: form.scheduledDate,
          scheduledTime: form.scheduledTime
        });
      } else {
        await createTodo({
          uid: user.uid,
          title: form.title,
          description: form.description,
          scheduledDate: form.scheduledDate,
          scheduledTime: form.scheduledTime
        });
      }

      setShowForm(false);
      setEditingTodo(null);
      setForm(EMPTY_FORM);
      await loadTodos();
      setMessage(editingTodo ? "To-do updated." : "To-do added.");
    } catch (err) {
      console.error("Save failed:", err);
      setMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    if (todo.source === "assignment") {
      setMessage("Mark the assignment as done in Activities.");
      return;
    }

    try {
      await toggleTodoStatus(todo.id, todo.status);
      await loadTodos();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this to-do?")) return;
    try {
      await deleteTodo(id);
      await loadTodos();
      setMessage("To-do removed.");
    } catch (err) {
      console.error("Delete failed:", err);
      setMessage("Could not remove.");
    }
  };

  if (loading) {
    return <div className="todos-page">Loading to-do list...</div>;
  }

  return (
    <div className="todos-page">
      <section className="todos-hero">
        <div>
          <span className="todos-eyebrow">Personal tasks</span>
          <h1>To-Do List</h1>
          <p>Track assignments, deadlines, and personal tasks in one place.</p>
        </div>

        <button type="button" onClick={handleNew}>
          Add Task
        </button>
      </section>

      {message && <div className="todos-message">{message}</div>}

      <section className="todos-stats">
        <div>
          <span>Total</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="stat-pending">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </div>
        <div className="stat-done">
          <span>Done</span>
          <strong>{counts.done}</strong>
        </div>
        <div className="stat-overdue">
          <span>Overdue</span>
          <strong>{counts.overdue}</strong>
        </div>
      </section>

      <section className="todos-filters">
        {(["all", "pending", "done", "overdue"] as FilterMode[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`todos-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </section>

      {/* Form */}
      {showForm && (
        <section className="todos-form-card">
          <h2>{editingTodo ? "Edit Task" : "New Task"}</h2>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional details..."
            />
          </label>

          <div className="todos-form-row">
            <label>
              Date
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </label>

            <label>
              Time (optional)
              <input
                type="time"
                value={form.scheduledTime}
                onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
              />
            </label>
          </div>

          <div className="todos-form-actions">
            <button type="button" className="secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      )}

      {/* List */}
      <section className="todos-list">
        {filteredTodos.length === 0 ? (
          <div className="todos-empty">
            {filter === "all"
              ? "No tasks yet. Add one or check Activities for assignments."
              : `No ${filter} tasks.`}
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.status} ${todo.source}`}>
              <button
                type="button"
                className="todo-check"
                onClick={() => handleToggle(todo)}
                title={todo.source === "assignment" ? "Complete in Activities" : "Toggle done"}
              >
                {todo.status === "done" ? "✓" : "○"}
              </button>

              <div className="todo-content">
                <div className="todo-title">{todo.title}</div>
                {todo.description && (
                  <div className="todo-desc">{todo.description}</div>
                )}
                <div className="todo-meta">
                  <span className={`todo-status-badge ${todo.status}`}>
                    {getStatusLabel(todo.status)}
                  </span>
                  <span>{formatDate(todo.scheduledDate)}</span>
                  {todo.scheduledTime && <span>• {todo.scheduledTime}</span>}
                  {todo.source === "assignment" && (
                    <span className="todo-source-badge">From Activities</span>
                  )}
                </div>
              </div>

              {todo.source !== "assignment" && (
                <div className="todo-actions">
                  <button
                    type="button"
                    className="todo-edit-btn"
                    onClick={() => handleEdit(todo)}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="todo-delete-btn"
                    onClick={() => handleDelete(todo.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}