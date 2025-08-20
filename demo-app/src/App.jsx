import { useState } from 'react'
import './App.css'
import { TestComponentWithContext } from './TestComponent'
import Header from './components/Header'
import Counter from './components/Counter'
import InputForm from './components/InputForm'
import TodoList from './components/TodoList'
import ErrorTester from './components/ErrorTester'
import InfoPanel from './components/InfoPanel'
import Footer from './components/Footer'

function App() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
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

  const handleResetCounter = () => {
    setCount(0)
  }

  const handleSubmitForm = () => {
    setText('')
  }

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header 
        darkMode={darkMode} 
        onToggleDarkMode={handleToggleDarkMode}
      />

      <main className="main">
        <Counter 
          count={count}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onReset={handleResetCounter}
        />

        <InputForm 
          text={text}
          onTextChange={setText}
          onSubmit={handleSubmitForm}
        />

        <TodoList 
          todos={todos}
          onToggleTodo={handleToggleTodo}
        />

        <ErrorTester />

        <InfoPanel />

        <section className="react-test-section">
          <h2>React Context & Hooks Test</h2>
          <TestComponentWithContext />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App