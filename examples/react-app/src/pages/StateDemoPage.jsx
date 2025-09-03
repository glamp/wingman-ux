import React, { useState, useReducer, useContext, createContext } from 'react';
import { Link } from 'react-router-dom';

// Complex state context for testing context state capture
const AppStateContext = createContext();

function stateReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

// Component with complex useState for testing
function ComplexStateComponent() {
  const [complexState, setComplexState] = useState({
    user: {
      id: 123,
      name: 'Demo User',
      profile: {
        avatar: '/avatar.jpg',
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: true,
            push: false,
            sms: false
          }
        }
      }
    },
    ui: {
      sidebar: { open: true, width: 250 },
      modal: { visible: false, type: null },
      loading: { global: false, components: {} }
    },
    data: {
      items: [
        { id: 1, name: 'Item 1', metadata: { tags: ['test', 'demo'], priority: 'high' } },
        { id: 2, name: 'Item 2', metadata: { tags: ['example'], priority: 'low' } }
      ],
      filters: { status: 'all', category: null, search: '' }
    }
  });

  const updateNestedState = (path, value) => {
    setComplexState(prev => {
      const newState = { ...prev };
      const keys = path.split('.');
      let current = newState;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
      <h3>🏗️ Complex useState Component</h3>
      <div style={{ marginBottom: '15px' }}>
        <label>User Name: </label>
        <input 
          value={complexState.user.name}
          onChange={(e) => updateNestedState('user.name', e.target.value)}
          style={{ padding: '4px 8px', marginLeft: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Theme: </label>
        <select 
          value={complexState.user.profile.preferences.theme}
          onChange={(e) => updateNestedState('user.profile.preferences.theme', e.target.value)}
          style={{ padding: '4px 8px', marginLeft: '8px' }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      <button 
        onClick={() => updateNestedState('ui.sidebar.open', !complexState.ui.sidebar.open)}
        style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Toggle Sidebar ({complexState.ui.sidebar.open ? 'Open' : 'Closed'})
      </button>

      <details style={{ marginTop: '15px' }}>
        <summary>View Current State</summary>
        <pre style={{ fontSize: '11px', background: '#f9fafb', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(complexState, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// useReducer component for testing reducer state capture
function ReducerStateComponent() {
  const [state, dispatch] = useReducer(stateReducer, {
    user: { name: 'Reducer User', role: 'admin' },
    notifications: [],
    settings: { darkMode: false, autoSave: true }
  });

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
      <h3>⚙️ useReducer Component</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <input 
          value={state.user.name}
          onChange={(e) => dispatch({ type: 'UPDATE_USER', payload: { name: e.target.value } })}
          style={{ padding: '8px', width: '200px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => dispatch({ 
            type: 'ADD_NOTIFICATION', 
            payload: { id: Date.now(), message: 'Test notification', type: 'info' } 
          })}
          style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', marginRight: '8px' }}
        >
          Add Notification
        </button>
        <button 
          onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
          style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Clear All ({state.notifications.length})
        </button>
      </div>

      <div style={{ maxHeight: '150px', overflow: 'auto' }}>
        {state.notifications.map(notif => (
          <div key={notif.id} style={{ padding: '8px', background: '#f0f9ff', margin: '4px 0', borderRadius: '4px' }}>
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StateDemoPage() {
  const [globalState, setGlobalState] = useState({
    theme: 'light',
    performance: { renderCount: 0 }
  });

  return (
    <AppStateContext.Provider value={{ state: globalState, setState: setGlobalState }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        padding: '40px 20px' 
      }}>
        <div style={{ marginBottom: '30px' }}>
          <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Main Demo
          </Link>
        </div>

        <h1>⚠️ React Edge Cases Testing</h1>
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '30px' }}>
          Complex React patterns to test Chrome extension metadata capture edge cases
        </p>

        <div style={{ display: 'grid', gap: '20px' }}>
          
          {/* Complex useState */}
          <ComplexStateComponent />
          
          {/* useReducer */}
          <ReducerStateComponent />
          
          {/* Error Boundary */}
          <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
            <h3>💥 Error Boundary Testing</h3>
            <ErrorTester />
          </div>
          
          {/* Memoized Component */}
          <MemoizedComponent 
            data={{ test: 'memo test', nested: { value: 42 } }}
            onUpdate={(newData) => console.log('Memo updated:', newData)}
          />
          
          {/* Forward Ref */}
          <ForwardRefComponent customProp="forward ref test" />
          
          {/* HOC */}
          <LoggedComponent message="Testing HOC metadata capture" />
        </div>

        {/* Testing Guide */}
        <div style={{ 
          padding: '20px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3>🧪 Edge Case Testing Guide</h3>
          <p style={{ color: '#92400e', marginBottom: '10px' }}>
            Test Wingman extension on these complex patterns:
          </p>
          <ul style={{ color: '#92400e' }}>
            <li><strong>Nested State</strong>: Deep object structures in useState</li>
            <li><strong>Reducer Actions</strong>: Complex action types and payloads</li>
            <li><strong>Context Values</strong>: Global state via React context</li>
            <li><strong>Memoization</strong>: React.memo and useMemo patterns</li>
            <li><strong>Refs</strong>: forwardRef and useRef patterns</li>
            <li><strong>HOC Wrappers</strong>: Higher order component detection</li>
          </ul>
        </div>
      </div>
    </AppStateContext.Provider>
  );
}