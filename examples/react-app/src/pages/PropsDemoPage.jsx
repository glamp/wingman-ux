import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Component with various prop types for testing
function PropsTestComponent({ 
  stringProp, 
  numberProp, 
  booleanProp, 
  objectProp, 
  arrayProp, 
  functionProp,
  optionalProp,
  children 
}) {
  return (
    <div style={{ padding: '15px', border: '2px solid #3b82f6', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      <h4>🧪 Props Test Component</h4>
      <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
        <div><strong>String:</strong> {stringProp}</div>
        <div><strong>Number:</strong> {numberProp}</div>
        <div><strong>Boolean:</strong> {String(booleanProp)}</div>
        <div><strong>Object:</strong> {JSON.stringify(objectProp)}</div>
        <div><strong>Array:</strong> [{arrayProp.join(', ')}]</div>
        <div><strong>Optional:</strong> {optionalProp || 'undefined'}</div>
      </div>
      <button 
        onClick={() => functionProp('test-data')}
        style={{ marginTop: '10px', padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Trigger Function Prop
      </button>
      {children && <div style={{ marginTop: '10px', padding: '8px', background: '#e0e7ff', borderRadius: '4px' }}>{children}</div>}
    </div>
  );
}

// Component with render props pattern
function RenderPropsComponent({ render, data }) {
  return (
    <div style={{ padding: '15px', border: '2px solid #10b981', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
      <h4>🔄 Render Props Component</h4>
      {render && render(data)}
    </div>
  );
}

// Component with complex nested props
function NestedPropsComponent({ config }) {
  return (
    <div style={{ padding: '15px', border: '2px solid #f59e0b', borderRadius: '8px', backgroundColor: '#fffbeb' }}>
      <h4>🏗️ Nested Props Component</h4>
      <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
        <div><strong>API URL:</strong> {config.api.baseUrl}</div>
        <div><strong>Timeout:</strong> {config.api.timeout}ms</div>
        <div><strong>Features:</strong> {config.features.join(', ')}</div>
        <div><strong>Theme:</strong> {config.ui.theme}</div>
        <div><strong>Debug:</strong> {String(config.debug.enabled)}</div>
      </div>
    </div>
  );
}

export default function PropsDemoPage() {
  const [callbackData, setCallbackData] = useState([]);
  const [renderData, setRenderData] = useState({ count: 0, items: ['a', 'b', 'c'] });

  const complexConfig = {
    api: {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      }
    },
    features: ['auth', 'cache', 'offline-sync'],
    ui: {
      theme: 'auto',
      animations: true,
      layout: {
        sidebar: true,
        header: { fixed: true, height: 60 }
      }
    },
    debug: {
      enabled: true,
      level: 'info',
      modules: ['api', 'ui', 'auth']
    }
  };

  const handleFunctionCall = (data) => {
    setCallbackData(prev => [...prev, { timestamp: Date.now(), data }]);
  };

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

      <h1>🧪 React Props Testing</h1>
      <p style={{ color: '#666', fontSize: '18px', marginBottom: '30px' }}>
        Test Chrome extension prop capture with various data types and patterns
      </p>

      <div style={{ display: 'grid', gap: '20px' }}>
        
        {/* Basic Props Testing */}
        <PropsTestComponent
          stringProp="Hello World"
          numberProp={42}
          booleanProp={true}
          objectProp={{ id: 1, name: 'Test Object', active: true }}
          arrayProp={['item1', 'item2', 'item3']}
          functionProp={handleFunctionCall}
          optionalProp={Math.random() > 0.5 ? 'Sometimes Present' : undefined}
        >
          <span>Child content for children prop testing</span>
        </PropsTestComponent>

        {/* Nested Props Testing */}
        <NestedPropsComponent config={complexConfig} />

        {/* Render Props Testing */}
        <RenderPropsComponent
          data={renderData}
          render={(data) => (
            <div>
              <p>Render prop content: Count = {data.count}</p>
              <button 
                onClick={() => setRenderData(prev => ({ ...prev, count: prev.count + 1 }))}
                style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Increment via Render Prop
              </button>
              <div>Items: {data.items.map(item => <span key={item} style={{ margin: '0 4px', padding: '2px 6px', background: '#e5e7eb', borderRadius: '3px' }}>{item}</span>)}</div>
            </div>
          )}
        />

        {/* Function Props with Complex Signatures */}
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
          <h3>🎭 Function Props Component</h3>
          <PropsTestComponent
            stringProp="Function Test"
            numberProp={callbackData.length}
            booleanProp={callbackData.length > 0}
            objectProp={{ callbacks: callbackData.slice(-3) }}
            arrayProp={callbackData.map(item => item.data)}
            functionProp={(data) => handleFunctionCall(`complex-${data}-${Date.now()}`)}
          />
          
          <div style={{ marginTop: '15px', maxHeight: '150px', overflow: 'auto' }}>
            <h5>Callback History:</h5>
            {callbackData.map(item => (
              <div key={item.timestamp} style={{ padding: '4px', background: '#f3f4f6', margin: '2px 0', borderRadius: '3px', fontSize: '12px' }}>
                {new Date(item.timestamp).toLocaleTimeString()}: {item.data}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h3>🧪 Props Testing Guide</h3>
        <p style={{ color: '#0c4a6e', marginBottom: '10px' }}>
          Test Wingman extension prop capture with these patterns:
        </p>
        <ul style={{ color: '#0c4a6e' }}>
          <li><strong>Primitive Props</strong>: string, number, boolean values</li>
          <li><strong>Complex Objects</strong>: Nested objects with multiple levels</li>
          <li><strong>Arrays</strong>: Simple and complex array structures</li>
          <li><strong>Functions</strong>: Event handlers and callback props</li>
          <li><strong>Children</strong>: React children prop patterns</li>
          <li><strong>Render Props</strong>: Function-as-children patterns</li>
          <li><strong>Optional Props</strong>: Sometimes present, sometimes undefined</li>
        </ul>
      </div>
    </div>
  );
}