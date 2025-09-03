import React, { useState, useMemo, useCallback, forwardRef, memo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import ErrorTester from '../components/ErrorTester';

// Lazy loaded component for testing dynamic imports
const LazyComponent = lazy(() => 
  new Promise(resolve => {
    setTimeout(() => {
      resolve({
        default: function LazyLoadedComponent({ data }) {
          return (
            <div style={{ padding: '15px', border: '1px dashed #10b981', borderRadius: '6px', backgroundColor: '#f0fdf4' }}>
              <h4>⏳ Lazy Loaded Component</h4>
              <p>Loaded data: {JSON.stringify(data)}</p>
            </div>
          );
        }
      });
    }, 1000);
  })
);

// Memoized component for testing memo capture
const MemoizedComponent = memo(function MemoizedComponent({ data, onUpdate }) {
  console.log('MemoizedComponent render');
  return (
    <div style={{ padding: '15px', border: '1px dashed #6b7280', borderRadius: '6px' }}>
      <h4>🧠 Memoized Component</h4>
      <p>Data: {JSON.stringify(data)}</p>
      <button onClick={() => onUpdate({ ...data, timestamp: Date.now() })}>
        Update Data
      </button>
    </div>
  );
});

// Forward ref component for testing ref capture
const ForwardRefComponent = forwardRef(function ForwardRefComponent(props, ref) {
  return (
    <div ref={ref} style={{ padding: '15px', border: '1px dashed #7c3aed', borderRadius: '6px' }}>
      <h4>📎 Forward Ref Component</h4>
      <input 
        placeholder="Forward ref input" 
        style={{ width: '100%', padding: '8px' }}
        {...props}
      />
    </div>
  );
});

// Higher Order Component for testing HOC patterns
function withLogging(WrappedComponent) {
  return function WithLoggingComponent(props) {
    console.log('HOC props:', props);
    return (
      <div style={{ padding: '15px', border: '1px dashed #dc2626', borderRadius: '6px' }}>
        <h4>📋 HOC Wrapper</h4>
        <WrappedComponent {...props} />
      </div>
    );
  };
}

const LoggedComponent = withLogging(function BaseComponent({ message, metadata }) {
  return (
    <div>
      <p>Base component message: {message}</p>
      <p style={{ fontSize: '12px', color: '#666' }}>Metadata: {JSON.stringify(metadata)}</p>
    </div>
  );
});

export default function EdgeCasesPage() {
  const [memoData, setMemoData] = useState({ value: 'test', count: 0 });
  const [errorCount, setErrorCount] = useState(0);
  const [showLazy, setShowLazy] = useState(false);
  const [refValue, setRefValue] = useState('');
  
  // Expensive computation for useMemo testing
  const expensiveValue = useMemo(() => {
    console.log('Computing expensive value...');
    return memoData.count * 2 + Math.random();
  }, [memoData.count]);
  
  // useCallback for testing callback capture
  const handleCallback = useCallback((type) => {
    console.log('Callback triggered:', type);
    setErrorCount(prev => prev + 1);
  }, []);

  return (
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
        Test Chrome extension metadata capture with complex React patterns
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        
        {/* Memoized Component */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>React.memo Testing</h3>
          <MemoizedComponent 
            data={memoData}
            onUpdate={setMemoData}
            expensiveValue={expensiveValue}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Expensive computed value: {expensiveValue.toFixed(4)}
          </p>
        </div>

        {/* Forward Ref Component */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>forwardRef Testing</h3>
          <ForwardRefComponent 
            placeholder="Test input"
            value={refValue}
            onChange={(e) => setRefValue(e.target.value)}
          />
        </div>

        {/* HOC Component */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>Higher Order Component</h3>
          <LoggedComponent 
            message="HOC wrapped message"
            metadata={{ timestamp: Date.now(), errors: errorCount }}
          />
        </div>

        {/* Error Boundary Testing */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>💥 Error Boundary Testing</h3>
          <ErrorTester onTriggerError={handleCallback} />
        </div>

        {/* Lazy Loading */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>⏳ Lazy Loading</h3>
          <button 
            onClick={() => setShowLazy(!showLazy)}
            style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {showLazy ? 'Hide' : 'Show'} Lazy Component
          </button>
          {showLazy && (
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>}>
              <LazyComponent data={{ lazy: true, timestamp: Date.now() }} />
            </Suspense>
          )}
        </div>

        {/* Complex Nested Component */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>🏗️ Deeply Nested Components</h3>
          <div data-testid="level-1">
            <div data-testid="level-2">
              <div data-testid="level-3">
                <div data-testid="level-4">
                  <button 
                    onClick={() => setMemoData(prev => ({ ...prev, count: prev.count + 1 }))}
                    style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Deep Nested Button (Count: {memoData.count})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Component Rendering */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>🔄 Dynamic Component Rendering</h3>
          {[1, 2, 3].map(num => (
            <div key={num} style={{ margin: '10px 0' }}>
              <button 
                onClick={() => handleCallback(`dynamic-${num}`)}
                style={{ 
                  padding: '6px 12px', 
                  background: '#f59e0b', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '3px',
                  marginRight: '8px'
                }}
              >
                Dynamic Button {num}
              </button>
            </div>
          ))}
        </div>

        {/* Conditional Rendering */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>🔀 Conditional Rendering</h3>
          {errorCount > 0 && (
            <div style={{ padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', marginBottom: '10px' }}>
              Error count: {errorCount}
            </div>
          )}
          {memoData.count % 2 === 0 ? (
            <div style={{ padding: '8px', background: '#f0f9ff', borderRadius: '4px' }}>
              Even count component: {memoData.count}
            </div>
          ) : (
            <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '4px' }}>
              Odd count component: {memoData.count}
            </div>
          )}
        </div>
      </div>

      {/* Testing Instructions */}
      <div style={{ 
        padding: '20px',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h3>🧪 Edge Case Testing Guide</h3>
        <p style={{ color: '#92400e', marginBottom: '10px' }}>
          Use Wingman extension to test these React patterns:
        </p>
        <ul style={{ color: '#92400e' }}>
          <li><strong>React.memo</strong>: Should capture memoized component props</li>
          <li><strong>forwardRef</strong>: Should detect forwarded refs</li>
          <li><strong>HOC</strong>: Should capture both wrapper and wrapped component</li>
          <li><strong>Error Boundaries</strong>: Test with error states</li>
          <li><strong>Lazy Loading</strong>: Components loaded dynamically</li>
          <li><strong>Deep Nesting</strong>: Multiple levels of component hierarchy</li>
          <li><strong>Dynamic Rendering</strong>: Components created in loops</li>
          <li><strong>Conditional Rendering</strong>: Components that appear/disappear</li>
        </ul>
      </div>
    </div>
  );
}