# React Version Testing Plan

## Overview
This document outlines the testing strategy for ensuring Wingman's React context capture works across different React versions and configurations.

## Supported React Versions

### Currently Tested
- **React 19.1.1** - Current demo app (Vite)

### To Be Tested
- **React 18.x** - Most common in production
- **React 17.x** - Legacy apps still in use
- **React 16.8+** - Hooks introduction (minimum supported)

## Test Matrix

### React 18 Testing
| Framework | React Version | Build Tool | Test Priority | Notes |
|-----------|--------------|------------|---------------|-------|
| Create React App | 18.3.1 | Webpack | High | Most common setup |
| Next.js 14 | 18.3.1 | Webpack/Turbopack | High | Popular framework |
| Vite | 18.3.1 | Vite | High | Modern tooling |
| Remix | 18.3.1 | Esbuild | Medium | Growing adoption |
| Gatsby | 18.3.1 | Webpack | Low | Static sites |

### React 17 Testing
| Framework | React Version | Build Tool | Test Priority | Notes |
|-----------|--------------|------------|---------------|-------|
| Create React App | 17.0.2 | Webpack | Medium | Legacy apps |
| Next.js 12 | 17.0.2 | Webpack | Medium | Older Next.js |
| Custom Webpack | 17.0.2 | Webpack 4/5 | Low | Custom setups |

### React 16 Testing
| Framework | React Version | Build Tool | Test Priority | Notes |
|-----------|--------------|------------|---------------|-------|
| Create React App | 16.14.0 | Webpack | Low | Very old apps |
| Custom Setup | 16.8.6 | Various | Low | Minimum hooks version |

## Test Scenarios

### Core Functionality Tests
1. **Component Detection**
   - Function components
   - Class components
   - Memo components
   - Forward ref components
   - Lazy loaded components

2. **State Extraction**
   - useState hooks
   - useReducer
   - Class component state
   - Multiple state values

3. **Props Extraction**
   - Simple props
   - Complex nested props
   - Function props (should be sanitized)
   - Children props

4. **Hooks Detection**
   - Built-in hooks (useState, useEffect, etc.)
   - Custom hooks
   - Hook dependencies
   - Hook values

5. **Context Extraction**
   - useContext values
   - Multiple contexts
   - Provider/Consumer pattern

6. **Component Hierarchy**
   - Parent components
   - Component stack
   - Nested components

### React Version-Specific Tests

#### React 19 Specific
- Server Components (if applicable)
- New concurrent features
- New hooks (if any)

#### React 18 Specific
- Concurrent rendering
- Automatic batching
- Transitions (useTransition)
- Suspense boundaries
- useDeferredValue
- useId hook

#### React 17 Specific
- No new features (focus on stability)
- Event delegation changes

#### React 16 Specific
- Hooks (16.8+)
- Error boundaries
- Portals
- Fragments

## Property Name Differences

### Fiber Property Names by Version
```javascript
// React 16-17
__reactInternalInstance
__reactFiber
__reactInternalFiber

// React 18-19
__reactFiber$[random_suffix]
__reactProps$[random_suffix]
__reactEvents$[random_suffix]
```

## Implementation Strategy

### 1. Version Detection
```javascript
function detectReactVersion(fiber) {
  // Check for React 18+ concurrent features
  if (fiber.lanes !== undefined) return '18+';
  
  // Check for React 16+ hooks
  if (fiber.memoizedState && fiber.type && !fiber.type.prototype?.isReactComponent) {
    return '16.8+';
  }
  
  // Default to unknown
  return 'unknown';
}
```

### 2. Property Discovery
```javascript
function findReactProperties(element) {
  const keys = Object.keys(element);
  return {
    fiber: keys.find(k => k.includes('Fiber')),
    props: keys.find(k => k.includes('Props')),
    events: keys.find(k => k.includes('Events'))
  };
}
```

### 3. Fallback Chain
1. Try SDK communication (if available)
2. Try direct fiber extraction with version detection
3. Try React DevTools hook
4. Try parent element traversal
5. Return partial data with clear indication

## Test App Creation

### Quick Setup Commands

#### React 19 (Vite)
```bash
npm create vite@latest test-react19 -- --template react
cd test-react19
npm install
npm install @wingman/web-sdk
# Add WingmanProvider to main.jsx
npm run dev
```

#### React 18 (CRA)
```bash
npx create-react-app test-react18
cd test-react18
npm install @wingman/web-sdk
# Add WingmanProvider to index.js
npm start
```

#### React 18 (Next.js)
```bash
npx create-next-app@latest test-nextjs --typescript --app
cd test-nextjs
npm install @wingman/web-sdk
# Add WingmanProvider to layout.tsx
npm run dev
```

#### React 17
```bash
npx create-react-app test-react17
cd test-react17
npm install react@17 react-dom@17
npm install @wingman/web-sdk
# Add WingmanProvider to index.js
npm start
```

## Success Criteria

### Minimum Requirements
- Component name extraction works
- Basic props extraction works
- State detection works (for stateful components)
- No console errors

### Full Success
- All hooks are detected with values
- Context values are extracted
- Component hierarchy is complete
- Source location is found (development mode)
- Render counts are tracked
- Performance metrics available

### Acceptable Degradation
- Source location missing (production builds)
- Some hooks not fully extracted
- Performance metrics unavailable
- Partial context extraction

## Known Limitations

### Production Builds
- Minified component names
- No source locations
- Stripped debug information
- Potentially obfuscated property names

### Server-Side Rendering
- Initial render may not have client-side React
- Hydration timing issues
- Different fiber structure

### React Native
- Different internal structure
- Not currently supported
- Would need separate implementation

## Testing Checklist

- [ ] React 19 with Vite
- [ ] React 18 with Create React App
- [ ] React 18 with Next.js 14
- [ ] React 18 with Vite
- [ ] React 17 with Create React App
- [ ] React 16.14 with Create React App
- [ ] Production build testing
- [ ] Development build testing
- [ ] TypeScript projects
- [ ] JavaScript projects
- [ ] Strict mode enabled
- [ ] Concurrent features enabled

## Debugging Tips

### Check React Version
```javascript
// In browser console
React.version // If React is global
window.React?.version // Alternative

// From fiber
fiber.elementType?.$$typeof // Check symbols
fiber.lanes // React 18+ indicator
```

### Verify Fiber Properties
```javascript
// In browser console
const elem = document.querySelector('.some-react-component');
Object.keys(elem).filter(k => k.includes('react') || k.includes('React'));
```

### Test Hook Extraction
```javascript
// Check if hooks are being found
const fiber = elem[Object.keys(elem).find(k => k.includes('Fiber'))];
console.log(fiber?.memoizedState); // Should show hooks chain
```

## Future Considerations

### React 20+
- Monitor for property name changes
- New internal structures
- Additional concurrent features
- Potential API changes

### Alternative Frameworks
- Preact compatibility
- Inferno compatibility
- Other React-like libraries

### Performance
- Extraction speed optimization
- Memory usage monitoring
- Large component tree handling

## Resources

- [React DevTools Protocol](https://github.com/facebook/react/tree/main/packages/react-devtools)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
- [React Version History](https://github.com/facebook/react/releases)
- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/29/react-v18)
- [React 19 Beta Docs](https://react.dev/blog/2024/04/25/react-19)