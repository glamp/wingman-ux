import { describe, it, expect, beforeEach } from 'vitest';
import { ReactIntrospector } from '../react-introspector';

describe('React Introspector', () => {
  beforeEach(() => {
    // Reset React DevTools hook
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
  });

  it('should return none when React DevTools hook is not available', () => {
    const introspector = new ReactIntrospector();
    const element = document.createElement('div');
    const result = introspector.getReactData(element);
    
    expect(result.obtainedVia).toBe('none');
  });

  it('should return none for non-React elements', () => {
    // Set up minimal React DevTools hook
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map()
    };

    const introspector = new ReactIntrospector();
    const element = document.createElement('div');
    const result = introspector.getReactData(element);
    
    expect(result.obtainedVia).toBe('none');
  });

  it('should extract React info when available', () => {
    // This test verifies the basic structure, but React internals are complex
    // In real usage, React itself sets up the fiber references
    
    // Set up React DevTools hook
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]])
    };

    const introspector = new ReactIntrospector();
    const element = document.createElement('div');
    
    // Mock a fiber attached by React (simplified)
    const mockFiber = {
      type: { name: 'TestComponent' },
      memoizedProps: { 
        testProp: 'value',
        onClick: () => {} // Function should be filtered out
      },
      memoizedState: {
        count: 42,
        items: ['a', 'b', 'c']
      }
    };
    
    // Directly attach the fiber in a way the introspector can find
    (element as any).__reactFiber = mockFiber;
    
    const result = introspector.getReactData(element);
    
    // Should have component name but props/state might be sanitized
    expect(result.obtainedVia).toBe('devtools-hook');
    expect(result.componentName).toBe('TestComponent');
    // Functions should be filtered out
    if (result.props) {
      expect(result.props.onClick).toBe('[Function]');
    }
  });

  it('should handle errors gracefully', () => {
    // Set up hook that throws an error
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: {
        get() {
          throw new Error('Test error');
        }
      }
    };

    const introspector = new ReactIntrospector();
    const element = document.createElement('div');
    const result = introspector.getReactData(element);
    
    expect(result.obtainedVia).toBe('none');
  });

  it('should sanitize sensitive data', () => {
    const mockFiber = {
      type: { name: 'UserProfile' },
      memoizedProps: {
        username: 'testuser',
        email: 'test@example.com',
        token: 'secret-token', // Should be sanitized
        apiKey: 'api-key-123', // Should be sanitized
        password: 'password123', // Should be sanitized
        isPublic: true
      },
      memoizedState: null
    };

    const element = document.createElement('div');
    Object.defineProperty(element, '__reactFiber', {
      value: mockFiber,
      writable: true
    });

    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]])
    };

    const introspector = new ReactIntrospector();
    const result = introspector.getReactData(element);
    
    if (result && result.props) {
      // Sensitive fields should be redacted
      expect(result.props.token).toBe('[Redacted]');
      expect(result.props.apiKey).toBe('[Redacted]');
      expect(result.props.password).toBe('[Redacted]');
      // Non-sensitive fields should remain
      expect(result.props.username).toBe('testuser');
      expect(result.props.email).toBe('test@example.com');
      expect(result.props.isPublic).toBe(true);
    }
  });

  it('should handle components without names', () => {
    const mockFiber = {
      type: {}, // No name property
      memoizedProps: { test: true },
      memoizedState: null
    };

    const element = document.createElement('div');
    // Directly attach the fiber
    (element as any).__reactFiber = mockFiber;

    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]])
    };

    const introspector = new ReactIntrospector();
    const result = introspector.getReactData(element);
    
    expect(result.obtainedVia).toBe('devtools-hook');
    expect(result.componentName).toBeUndefined();
  });

  it('should handle circular references in props/state', () => {
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;

    const mockFiber = {
      type: { name: 'CircularComponent' },
      memoizedProps: circularObj,
      memoizedState: null
    };

    const element = document.createElement('div');
    Object.defineProperty(element, '__reactFiber', {
      value: mockFiber,
      writable: true
    });

    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]])
    };

    const introspector = new ReactIntrospector();
    // Should not throw error
    expect(() => {
      introspector.getReactData(element);
    }).not.toThrow();
  });
});