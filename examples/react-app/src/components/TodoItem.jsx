import React from 'react'

function TodoItem({ todo, onToggle }) {
  return (
    <li 
      className={`todo-item ${todo.done ? 'done' : ''}`}
      onClick={() => onToggle(todo.id)}
    >
      <input 
        type="checkbox" 
        checked={todo.done}
        onChange={() => {}}
        onClick={(e) => e.stopPropagation()}
      />
      <span>{todo.text}</span>
    </li>
  )
}

export default TodoItem