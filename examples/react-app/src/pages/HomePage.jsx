import React, { useState, useContext, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Counter from '../components/Counter';
import TodoList from '../components/TodoList';
import InputForm from '../components/InputForm';
import StateTestBox from '../components/StateTestBox';

// Demo context for testing context capture
const DemoContext = React.createContext({ theme: 'light', user: null });

// Reducer for testing useReducer state capture
function demoReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_USER_PREFERENCE':
      return { ...state, preferences: { ...state.preferences, [action.key]: action.value } };
    default:
      return state;
  }
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  
  // Complex state for testing state capture
  const [demoState, dispatch] = useReducer(demoReducer, {
    theme: 'light',
    preferences: {
      notifications: true,
      autoSave: false,
      language: 'en'
    }
  });
  
  // Counter state for testing
  const [count, setCount] = useState(0);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Test React metadata capture', completed: false },
    { id: 2, text: 'Verify component props extraction', completed: true },
    { id: 3, text: 'Check state management detection', completed: false }
  ]);
  
  // Form state for testing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    preferences: {
      newsletter: false,
      theme: 'auto'
    }
  });

  const handleToggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const complexProps = {
    metadata: {
      version: '1.0.0',
      features: ['auth', 'todos', 'counter'],
      config: {
        api: { 
          baseUrl: 'http://localhost:8787',
          timeout: 5000 
        },
        ui: {
          theme: demoState.theme,
          animations: true
        }
      }
    },
    callbacks: {
      onSave: (data) => console.log('Saving:', data),
      onError: (error) => console.error('Error:', error)
    }
  };

  return (
    <DemoContext.Provider value={{ theme: demoState.theme, user }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        padding: '40px 20px' 
      }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1>🎯 Wingman React Component Demo</h1>
          <p style={{ color: '#666', fontSize: '18px' }}>
            Interactive components for testing Chrome extension React metadata capture
          </p>
          
          {/* Navigation to test pages */}
          <nav style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px'
          }}>
            <Link to="/auth-demo" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              🔐 Auth Demo
            </Link>
            <Link to="/edge-cases" style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              ⚠️ Edge Cases
            </Link>
            <Link to="/state-demo" style={{ padding: '8px 16px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              📊 State Management
            </Link>
            <Link to="/props-demo" style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              🧪 Props Testing
            </Link>
          </nav>
        </header>

        {/* PROMINENT STATE TEST BOX */}
        <StateTestBox />

        {/* Interactive Demo Components Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '30px',
          marginBottom: '40px'
        }}>
          {/* Counter Component Demo */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: 'white'
          }}>
            <Counter 
              count={count}
              onIncrement={() => setCount(c => c + 1)}
              onDecrement={() => setCount(c => c - 1)}
              onReset={() => setCount(0)}
              {...complexProps}
            />
          </div>

          {/* Todo List Demo */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: 'white'
          }}>
            <TodoList 
              todos={todos}
              onToggleTodo={handleToggleTodo}
              metadata={complexProps.metadata}
            />
          </div>

          {/* Form Demo */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            backgroundColor: 'white'
          }}>
            <InputForm 
              formData={formData}
              onChange={setFormData}
              config={complexProps.metadata.config}
              onSubmit={complexProps.callbacks.onSave}
            />
          </div>

          {/* User Profile Demo */}
          {isAuthenticated && (
            <div style={{ 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              backgroundColor: 'white'
            }}>
              <UserProfile 
                user={user}
                preferences={demoState.preferences}
                onPreferenceChange={(key, value) => 
                  dispatch({ type: 'SET_USER_PREFERENCE', key, value })
                }
              />
            </div>
          )}
        </div>

        {/* Component Tree Info */}
        <div style={{ 
          padding: '20px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3>🧪 Testing Chrome Extension Metadata Capture</h3>
          <p style={{ color: '#0c4a6e', marginBottom: '15px' }}>
            Use the Wingman Chrome extension on this page to test React component metadata extraction:
          </p>
          <ul style={{ color: '#0c4a6e' }}>
            <li><strong>Component Names</strong>: Counter, TodoList, InputForm, UserProfile</li>
            <li><strong>Props</strong>: Complex objects, arrays, functions, nested data</li>
            <li><strong>State</strong>: useState (count, todos, formData), useReducer (demoState)</li>
            <li><strong>Context</strong>: DemoContext with theme/user data</li>
            <li><strong>Hooks</strong>: useState, useReducer, useContext, useAuth (custom)</li>
          </ul>
        </div>
      </div>
    </DemoContext.Provider>
  );
}