import { useState } from 'react';
import './App.css';
import { TestComponentWithContext } from './TestComponent';
import Header from './components/Header';
import Counter from './components/Counter';
import InputForm from './components/InputForm';
import TodoList from './components/TodoList';
import ErrorTester from './components/ErrorTester';
import InfoPanel from './components/InfoPanel';
import Footer from './components/Footer';

function App() {
  console.log('App rendered');
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Walk the dog', done: true },
    { id: 3, text: 'Write code', done: false },
  ]);

  // Test various console log types for react-inspector
  console.log('Simple string log');
  console.log('Count:', count);
  console.log('Text:', text);
  console.log('Dark mode:', darkMode);
  console.log('Todos:', todos);
  
  // Complex nested object for testing
  console.log('Complex nested data:', {
    user: {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
      preferences: {
        theme: 'dark',
        notifications: true,
        languages: ['JavaScript', 'TypeScript', 'Python']
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      debug: true
    },
    stats: [
      { name: 'views', value: 1234 },
      { name: 'clicks', value: 567 },
      { name: 'conversions', value: 89 }
    ]
  });
  
  // Test multiple arguments in one log
  console.log('Multiple args:', 'string', 123, true, { key: 'value' }, [1, 2, 3]);
  
  // Test console.info and console.warn
  console.info('This is an info message with object:', { info: 'data', nested: { value: 42 } });
  console.warn('Warning: Large array detected', new Array(10).fill(null).map((_, i) => ({ index: i, value: Math.random() })));

  const handleIncrement = () => {
    console.log('Counter incremented from', count, 'to', count + 1);
    setCount(count + 1);
  };

  const handleDecrement = () => {
    console.log('Counter decremented from', count, 'to', count - 1);
    setCount(count - 1);
  };

  const handleToggleTodo = (id) => {
    console.log('Toggling todo:', id);
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };

  const handleResetCounter = () => {
    setCount(0);
  };

  const handleSubmitForm = () => {
    setText('');
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />

      <main className="main">
        <Counter
          count={count}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onReset={handleResetCounter}
        />

        <InputForm text={text} onTextChange={setText} onSubmit={handleSubmitForm} />

        <TodoList todos={todos} onToggleTodo={handleToggleTodo} />

        <ErrorTester />

        <InfoPanel />

        <section className="react-test-section">
          <h2>React Context & Hooks Test</h2>
          <TestComponentWithContext />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
