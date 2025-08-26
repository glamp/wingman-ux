import React from 'react'
import TodoItem from './TodoItem'

function TodoList({ todos, onToggleTodo }) {
  return (
    <section className="todo-section">
      <h2>Todo List</h2>
      <ul className="todo-list">
        {todos.map(todo => (
          <TodoItem 
            key={todo.id} 
            todo={todo} 
            onToggle={onToggleTodo}
          />
        ))}
      </ul>
    </section>
  )
}

export default TodoList