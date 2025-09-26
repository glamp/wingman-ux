import React, { useState, useReducer, useEffect } from 'react';

function counterReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'TOGGLE_AUTO':
      return { ...state, auto: !state.auto };
    default:
      return state;
  }
}

export default function StateTestBox() {
  // Multiple useState hooks for testing
  const [simpleString, setSimpleString] = useState('Hello Wingman!');
  const [counter, setCounter] = useState(42);
  const [isActive, setIsActive] = useState(true);
  const [userInfo, setUserInfo] = useState({
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  });
  const [itemList, setItemList] = useState(['Item A', 'Item B', 'Item C']);

  // useReducer for complex state
  const [reducerState, dispatch] = useReducer(counterReducer, {
    count: 100,
    step: 5,
    auto: false,
    lastUpdate: new Date().toISOString()
  });

  // Auto-increment counter to show live state changes
  const [liveCounter, setLiveCounter] = useState(0);
  useEffect(() => {
    if (reducerState.auto) {
      const interval = setInterval(() => {
        setLiveCounter(c => c + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [reducerState.auto]);

  return (
    <div style={{
      padding: '30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      color: 'white',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      marginBottom: '30px'
    }}>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '28px',
        textAlign: 'center',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}>
        🎯 OBVIOUS STATE TEST BOX 🎯
      </h2>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#fbbf24' }}>
          📊 useState Values:
        </h3>
        <div style={{ fontSize: '20px', lineHeight: '1.8' }}>
          <div>
            <strong>String State:</strong>
            <span style={{
              background: '#3b82f6',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace'
            }}>
              "{simpleString}"
            </span>
          </div>
          <div>
            <strong>Number State:</strong>
            <span style={{
              background: '#10b981',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace',
              fontSize: '24px'
            }}>
              {counter}
            </span>
          </div>
          <div>
            <strong>Boolean State:</strong>
            <span style={{
              background: isActive ? '#22c55e' : '#ef4444',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace'
            }}>
              {isActive ? '✅ TRUE' : '❌ FALSE'}
            </span>
          </div>
          <div>
            <strong>Object State:</strong>
            <span style={{
              background: '#8b5cf6',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              {userInfo.name} ({userInfo.preferences.theme})
            </span>
          </div>
          <div>
            <strong>Array State:</strong>
            <span style={{
              background: '#f59e0b',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace'
            }}>
              [{itemList.length} items]
            </span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#fbbf24' }}>
          ⚙️ useReducer State:
        </h3>
        <div style={{ fontSize: '20px', lineHeight: '1.8' }}>
          <div>
            <strong>Reducer Count:</strong>
            <span style={{
              background: '#dc2626',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace',
              fontSize: '24px'
            }}>
              {reducerState.count}
            </span>
          </div>
          <div>
            <strong>Step Size:</strong>
            <span style={{
              background: '#0891b2',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace'
            }}>
              {reducerState.step}
            </span>
          </div>
          <div>
            <strong>Auto Mode:</strong>
            <span style={{
              background: reducerState.auto ? '#22c55e' : '#64748b',
              padding: '4px 12px',
              borderRadius: '20px',
              marginLeft: '10px',
              fontFamily: 'monospace'
            }}>
              {reducerState.auto ? '🔄 AUTO ON' : '⏸️ AUTO OFF'}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#fbbf24' }}>
          🔥 Live Counter (updates every second when auto is on):
        </h3>
        <div style={{
          fontSize: '48px',
          fontFamily: 'monospace',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '10px'
        }}>
          {liveCounter}
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setCounter(c => c + 1)}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.9)',
            color: '#764ba2',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          Increment Counter
        </button>

        <button
          onClick={() => setIsActive(!isActive)}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.9)',
            color: '#764ba2',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          Toggle Boolean
        </button>

        <button
          onClick={() => dispatch({ type: 'INCREMENT' })}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.9)',
            color: '#764ba2',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          Reducer +{reducerState.step}
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_AUTO' })}
          style={{
            padding: '12px 24px',
            background: reducerState.auto ? '#ef4444' : '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          {reducerState.auto ? 'Stop Auto' : 'Start Auto'}
        </button>

        <button
          onClick={() => setItemList([...itemList, `Item ${String.fromCharCode(65 + itemList.length)}`])}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.9)',
            color: '#764ba2',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          Add to Array
        </button>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        <strong>🔍 Use Wingman Extension on this component!</strong>
        <br />
        The SDK should extract all these state values
      </div>
    </div>
  );
}