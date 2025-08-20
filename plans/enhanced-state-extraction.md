# Enhanced State Extraction for Wingman Web SDK

## Problem Statement

The current Web SDK extracts React state but has significant limitations:
- Hook states are returned as unlabeled arrays `[value1, value2, value3]`
- No identification of which hook each value came from
- Missing global state management (Redux, Zustand, MobX, etc.)
- No context about state history or pending updates
- Limited debugging information for state-related issues

## Solution Overview

Transform state capture from simple arrays to rich, labeled debugging information that provides full visibility into application state at the moment of feedback.

## Implementation Plan

### 1. Enhanced Hook Identification

**Current State:**
```javascript
// Component has:
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);

// SDK returns:
state: [null, false]  // Which is which??
```

**Improved Approach:**
```javascript
state: {
  hooks: [
    { type: 'useState', name: 'user', value: null, index: 0 },
    { type: 'useState', name: 'loading', value: false, index: 1 },
    { type: 'useContext', name: 'ThemeContext', value: {theme: 'dark'}, index: 2 }
  ]
}
```

**Implementation Details:**
- Parse fiber's `_debugHookTypes` array (available in development)
- Extract hook names from source via `_debugSource` and `_debugOwner`
- Match hook types: useState, useReducer, useContext, useMemo, useCallback, useRef
- Fall back to indexed array if debug info unavailable

### 2. Context Traversal & Extraction

**Goal:** Capture all context values affecting the component

**Implementation:**
```javascript
function extractContextChain(fiber) {
  const contexts = [];
  let current = fiber.return;
  
  while (current) {
    if (current.elementType?._context) {
      contexts.push({
        displayName: current.elementType._context.displayName,
        value: current.memoizedProps.value
      });
    }
    current = current.return;
  }
  
  return contexts;
}
```

**Expected Output:**
```javascript
contexts: [
  { name: 'ThemeContext', value: { theme: 'dark', primary: '#007bff' } },
  { name: 'UserContext', value: { user: { id: 123, name: 'John' }, isAuth: true } },
  { name: 'FeatureFlagsContext', value: { newUI: true, betaFeatures: false } }
]
```

### 3. Global State Management Integration

#### Redux Integration
```javascript
function extractReduxState() {
  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    const store = window.__REDUX_DEVTOOLS_EXTENSION__.store;
    if (store) {
      return {
        type: 'redux',
        state: store.getState(),
        // Include specific slice if component is connected
        connectedState: extractConnectedState(fiber)
      };
    }
  }
}
```

#### Zustand Detection
```javascript
function extractZustandStores() {
  // Zustand stores are often attached to window or modules
  const stores = [];
  
  // Check for common patterns
  if (window.__zustand__) {
    Object.entries(window.__zustand__).forEach(([name, store]) => {
      stores.push({
        type: 'zustand',
        name,
        state: store.getState()
      });
    });
  }
  
  return stores;
}
```

#### MobX Observable Detection
```javascript
function extractMobXState(fiber) {
  // Check if component is observer-wrapped
  if (fiber.type?.$$typeof === Symbol.for('mobx.observer')) {
    return {
      type: 'mobx',
      observables: extractObservables(fiber),
      reactions: extractReactions(fiber)
    };
  }
}
```

### 4. State Metadata Enhancement

**Capture Additional Context:**

```javascript
stateMetadata: {
  // When was this state captured
  capturedAt: Date.now(),
  
  // Pending updates in queue
  pendingUpdates: fiber.updateQueue?.pending,
  
  // Effect dependencies and their values
  effectDependencies: extractEffectDeps(fiber),
  
  // Memo/callback dependencies
  memoDependencies: extractMemoDeps(fiber),
  
  // Component render count
  renderCount: fiber.treeBaseDuration,
  
  // Props that might affect state
  relevantProps: extractStateRelatedProps(fiber),
  
  // Warning flags
  warnings: detectStateIssues(fiber)
}
```

### 5. Developer Experience Features

#### State Diff Capability
```javascript
// Store previous state capture
let previousCapture = null;

function captureWithDiff(currentState) {
  const diff = previousCapture ? {
    changed: deepDiff(previousCapture, currentState),
    added: findAdded(previousCapture, currentState),
    removed: findRemoved(previousCapture, currentState)
  } : null;
  
  previousCapture = currentState;
  return { current: currentState, diff };
}
```

#### Component State Path
```javascript
function extractStatePath(fiber) {
  const path = [];
  let current = fiber;
  
  while (current) {
    if (current.elementType?.name) {
      path.unshift({
        component: current.elementType.name,
        props: sanitizeProps(current.memoizedProps),
        key: current.key
      });
    }
    current = current.return;
  }
  
  return path;
}
```

#### Common Issues Detection
```javascript
function detectStateIssues(fiber) {
  const warnings = [];
  
  // Check for stale closures
  if (hasStaleClosurePattern(fiber)) {
    warnings.push({
      type: 'stale-closure',
      message: 'Possible stale closure detected in effect/callback'
    });
  }
  
  // Check for missing dependencies
  const missingDeps = findMissingDependencies(fiber);
  if (missingDeps.length > 0) {
    warnings.push({
      type: 'missing-deps',
      message: 'Missing dependencies in hooks',
      details: missingDeps
    });
  }
  
  // Check for excessive re-renders
  if (fiber.actualDuration > 16) {
    warnings.push({
      type: 'performance',
      message: `Component took ${fiber.actualDuration}ms to render`
    });
  }
  
  return warnings;
}
```

## Expected Output Format

```javascript
{
  // Component identification
  component: {
    name: 'UserProfile',
    location: 'src/components/UserProfile.tsx:45'
  },
  
  // Local component state
  localState: {
    hooks: [
      { type: 'useState', name: 'user', value: {...}, index: 0 },
      { type: 'useReducer', name: 'formState', value: {...}, index: 1 }
    ],
    refs: [
      { name: 'formRef', current: '<form>' }
    ]
  },
  
  // Context values
  contexts: [
    { name: 'ThemeContext', value: {...} },
    { name: 'UserContext', value: {...} }
  ],
  
  // Global state
  globalState: {
    redux: { user: {...}, app: {...} },
    zustand: { cartStore: {...} }
  },
  
  // Metadata
  metadata: {
    capturedAt: 1234567890,
    renderCount: 3,
    componentPath: ['App', 'Layout', 'UserProfile'],
    warnings: []
  },
  
  // Diff from previous capture (if available)
  diff: {
    changed: { 'user.name': { old: 'John', new: 'Jane' } }
  }
}
```

## Implementation Priority

1. **Phase 1 (High Priority)**
   - Hook type identification
   - Basic context extraction
   - Improved state labeling

2. **Phase 2 (Medium Priority)**
   - Redux integration
   - State diff capability
   - Component path extraction

3. **Phase 3 (Nice to Have)**
   - Zustand/MobX support
   - Performance warnings
   - Stale closure detection

## Testing Strategy

1. **Unit Tests**
   - Test each extraction function with mock fibers
   - Verify sanitization doesn't break on edge cases
   - Test diff algorithm accuracy

2. **Integration Tests**
   - Test with real React apps using different state patterns
   - Verify Redux DevTools integration
   - Test with production vs development builds

3. **Performance Tests**
   - Ensure extraction doesn't block UI
   - Measure memory usage with large state trees
   - Test with deeply nested components

## Security Considerations

- Continue sanitizing sensitive data (tokens, passwords)
- Limit state tree depth to prevent infinite recursion
- Exclude large binary data or files
- Add configurable redaction patterns

## Success Metrics

- Hook states are clearly labeled and identifiable
- Global state is captured when present
- State issues are detected and warned about
- Extraction completes in <50ms for typical components
- No performance impact on production apps

## Future Enhancements

- State time-travel (store multiple captures)
- State mutation tracking
- Async state loading indicators
- GraphQL/Apollo cache extraction
- Custom state manager plugin API