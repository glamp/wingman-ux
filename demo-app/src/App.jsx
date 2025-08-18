import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [showError, setShowError] = useState(false)
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Walk the dog', done: true },
    { id: 3, text: 'Write code', done: false }
  ])

  const handleIncrement = () => {
    console.log('Counter incremented from', count, 'to', count + 1)
    setCount(count + 1)
  }

  const handleDecrement = () => {
    console.log('Counter decremented from', count, 'to', count - 1)
    setCount(count - 1)
  }

  const handleToggleTodo = (id) => {
    console.log('Toggling todo:', id)
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ))
  }

  const triggerError = () => {
    console.error('User triggered an intentional error!')
    setShowError(true)
    setTimeout(() => {
      throw new Error('This is an intentional error for testing!')
    }, 100)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted with text:', text)
    alert(`You submitted: ${text}`)
    setText('')
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header className="header">
        <h1>Wingman Demo App</h1>
        <button 
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="main">
        <section className="counter-section">
          <h2>Counter Section</h2>
          <div className="counter">
            <button onClick={handleDecrement}>-</button>
            <span className="count-display">{count}</span>
            <button onClick={handleIncrement}>+</button>
          </div>
          <button className="reset-btn" onClick={() => setCount(0)}>
            Reset Counter
          </button>
        </section>

        <section className="form-section">
          <h2>Input Form</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something..."
              className="text-input"
            />
            <button type="submit" className="submit-btn">
              Submit
            </button>
          </form>
        </section>

        <section className="todo-section">
          <h2>Todo List</h2>
          <ul className="todo-list">
            {todos.map(todo => (
              <li 
                key={todo.id} 
                className={`todo-item ${todo.done ? 'done' : ''}`}
                onClick={() => handleToggleTodo(todo.id)}
              >
                <input 
                  type="checkbox" 
                  checked={todo.done}
                  onChange={() => {}}
                />
                <span>{todo.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="error-section">
          <h2>Error Testing</h2>
          <button 
            className="error-btn"
            onClick={triggerError}
          >
            Trigger Error
          </button>
          {showError && (
            <div className="error-message">
              An error will be thrown shortly!
            </div>
          )}
        </section>

        <section className="info-section">
          <h2>Information Panel</h2>
          <div className="info-card">
            <h3>About This Demo</h3>
            <p>This is a simple demo app for testing the Wingman browser extension.</p>
            <p>It includes various UI elements like buttons, forms, and lists to test element selection and screenshot capture.</p>
          </div>
          <div className="info-card highlight">
            <h3>Highlighted Section</h3>
            <p>This section has a different background to test region selection.</p>
            <button onClick={() => console.info('Info button clicked!')}>
              Log Info Message
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© 2025 Wingman Demo - Testing Only</p>
      </footer>
    </div>
  )
}

export default App