import React, { useState, useEffect, useContext, createContext, useMemo } from 'react';

// Create a test context
const TestContext = createContext({ theme: 'light', user: null });
TestContext.displayName = 'TestContext';

// Custom hook for testing
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  return { count, increment, decrement };
}

// Test component with various React features
export function TestComponent({ title = 'Test Component', showDetails = true }) {
  // State hooks
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Custom hook
  const { count, increment, decrement } = useCounter(5);
  
  // Context
  const contextValue = useContext(TestContext);
  
  // Memoized value
  const computedValue = useMemo(() => {
    return `Count: ${count}, Input: ${inputValue}`;
  }, [count, inputValue]);
  
  // Effect hook
  useEffect(() => {
    console.log('TestComponent mounted/updated');
    return () => console.log('TestComponent cleanup');
  }, [count]);

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #0084ff', 
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>{title}</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0084ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {isExpanded ? 'Collapse' : 'Expand'} Details
        </button>
        
        <span style={{ fontSize: '14px', color: '#666' }}>
          Click me to test React capture!
        </span>
      </div>

      {isExpanded && showDetails && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: 'white',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Input Test: 
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type something..."
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Counter:</strong> {count}
            <button onClick={increment} style={{ marginLeft: '10px' }}>+</button>
            <button onClick={decrement} style={{ marginLeft: '5px' }}>-</button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Computed Value:</strong> {computedValue}
          </div>

          <div>
            <strong>Context Theme:</strong> {contextValue.theme}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component to provide context
export function TestComponentWithContext() {
  const [theme, setTheme] = useState('light');
  
  return (
    <TestContext.Provider value={{ theme, user: { id: 1, name: 'Test User' } }}>
      <div>
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{
            margin: '20px',
            padding: '8px 16px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Toggle Theme (Current: {theme})
        </button>
        <TestComponent title="React Context Test Component" />
      </div>
    </TestContext.Provider>
  );
}