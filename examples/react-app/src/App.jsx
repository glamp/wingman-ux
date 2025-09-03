import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './auth/AuthContext';
import { WingmanProvider, createOAuthHandler } from 'wingman-sdk';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProtectedPage from './pages/ProtectedPage';
import AuthDemoPage from './pages/AuthDemoPage';
import EdgeCasesPage from './pages/EdgeCasesPage';
import StateDemoPage from './pages/StateDemoPage';
import PropsDemoPage from './pages/PropsDemoPage';
import ProtectedRoute from './components/ProtectedRoute';
import { TestComponentWithContext } from './TestComponent';
import Header from './components/Header';
import Counter from './components/Counter';
import InputForm from './components/InputForm';
import TodoList from './components/TodoList';
import ErrorTester from './components/ErrorTester';
import InfoPanel from './components/InfoPanel';
import Footer from './components/Footer';

// OAuth configuration for Wingman SDK
const oauthConfig = {
  routes: ['/auth/*'],
  modifyRedirectUri: (originalUri, tunnelDomain) => {
    console.log('[Wingman OAuth] Modifying redirect URI:', { originalUri, tunnelDomain });
    return originalUri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
  },
  envOverrides: {
    'OAUTH_REDIRECT_BASE': '{tunnelDomain}'
  }
};

function DemoApp() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Walk the dog', done: true },
    { id: 3, text: 'Write code', done: false },
  ]);

  const handleIncrement = () => setCount(count + 1);
  const handleDecrement = () => setCount(count - 1);
  const handleResetCounter = () => setCount(0);
  const handleSubmitForm = () => setText('');
  const handleToggleDarkMode = () => setDarkMode(!darkMode);
  const handleToggleTodo = (id) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
      
      <nav style={{ 
        padding: '20px', 
        borderBottom: '1px solid #ddd',
        backgroundColor: 'white'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link to="/" style={{ marginRight: '20px', textDecoration: 'none', color: '#2196f3' }}>🏠 Home</Link>
          <Link to="/protected" style={{ marginRight: '20px', textDecoration: 'none', color: '#2196f3' }}>🔒 Protected</Link>
          <Link to="/demo" style={{ marginRight: '20px', textDecoration: 'none', color: '#2196f3' }}>🧪 Component Demo</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth-demo" element={<AuthDemoPage />} />
        <Route path="/edge-cases" element={<EdgeCasesPage />} />
        <Route path="/state-demo" element={<StateDemoPage />} />
        <Route path="/props-demo" element={<PropsDemoPage />} />
        <Route 
          path="/protected" 
          element={
            <ProtectedRoute>
              <ProtectedPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/demo" element={
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
        } />
      </Routes>

      <Footer />
    </div>
  );
}

function App() {
  console.log('[App] Wingman OAuth Demo starting with config:', oauthConfig);
  
  return (
    <Router>
      <WingmanProvider config={{ oauth: oauthConfig, debug: true }}>
        <AuthProvider>
          <DemoApp />
        </AuthProvider>
      </WingmanProvider>
    </Router>
  );
}

export default App;
