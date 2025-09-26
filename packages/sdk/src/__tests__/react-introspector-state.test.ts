import { describe, it, expect, beforeEach } from 'vitest';
import { ReactIntrospector } from '../react-introspector';

describe('ReactIntrospector - State Extraction Requirements', () => {
  let introspector: ReactIntrospector;

  beforeEach(() => {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]])
    };
    introspector = new ReactIntrospector();
  });

  describe('REQUIREMENT: Functional components MUST return state field', () => {
    it('should extract state from single useState hook', () => {
      const element = document.createElement('div');

      // Mock functional component with one useState
      (element as any).__reactFiber = {
        type: { name: 'Counter' },
        memoizedProps: { label: 'Click me' },
        memoizedState: {
          memoizedState: 42,  // useState value
          next: null
        }
      };

      const result = introspector.getReactData(element);

      // THIS WILL FAIL INITIALLY - functional components return 'hooks' not 'state'
      expect(result.state).toBeDefined();
      expect(result.state).not.toBe(undefined);
      expect(result.state.useState0).toBe(42);
    });

    it('should extract state from multiple useState hooks', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'UserForm' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: 'John',  // First useState
          next: {
            memoizedState: 25,    // Second useState
            next: {
              memoizedState: { city: 'NYC' },  // Third useState
              next: null
            }
          }
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.useState0).toBe('John');
      expect(result.state.useState1).toBe(25);
      expect(result.state.useState2).toEqual({ city: 'NYC' });
    });

    it('should extract state from useReducer', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'TodoList' },
        memoizedProps: {},
        memoizedState: {
          // useReducer structure
          memoizedState: {
            todos: [
              { id: 1, text: 'Write tests', done: true },
              { id: 2, text: 'Fix code', done: false }
            ],
            filter: 'active'
          },
          next: null
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.reducer0).toEqual({
        todos: [
          { id: 1, text: 'Write tests', done: true },
          { id: 2, text: 'Fix code', done: false }
        ],
        filter: 'active'
      });
    });

    it('should handle mixed hooks (useState + useReducer)', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'ComplexComponent' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: 'initial',     // useState
          next: {
            memoizedState: null,        // useEffect (no state)
            next: {
              memoizedState: {          // useReducer
                count: 5,
                step: 1
              },
              next: {
                memoizedState: false,   // another useState
                next: null
              }
            }
          }
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.useState0).toBe('initial');
      expect(result.state.reducer0).toEqual({ count: 5, step: 1 });
      expect(result.state.useState1).toBe(false);
    });
  });

  describe('REQUIREMENT: Class components MUST return state field', () => {
    it('should extract state directly from class component', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: {
          name: 'ClassComponent',
          prototype: { isReactComponent: true }  // This identifies it as a class
        },
        memoizedProps: { title: 'Test' },
        memoizedState: {
          isOpen: true,
          count: 10,
          user: { name: 'Alice', role: 'admin' }
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state).toEqual({
        isOpen: true,
        count: 10,
        user: { name: 'Alice', role: 'admin' }
      });
    });
  });

  describe('REQUIREMENT: Components without state should have undefined state', () => {
    it('should return undefined state for stateless functional components', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'PureDisplay' },
        memoizedProps: { text: 'Hello' },
        memoizedState: null  // No hooks
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeUndefined();
      expect(result.props).toBeDefined();
      expect(result.props.text).toBe('Hello');
    });

    it('should return undefined state for class components without state', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: {
          name: 'StatelessClass',
          prototype: { isReactComponent: true }
        },
        memoizedProps: { value: 123 },
        memoizedState: null
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeUndefined();
    });
  });

  describe('REQUIREMENT: Never return hooks field', () => {
    it('should NEVER have a hooks field in the result', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'AnyComponent' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: 'test',
          next: null
        }
      };

      const result = introspector.getReactData(element);

      // We should NEVER see 'hooks' in the output
      expect(result.hooks).toBeUndefined();
      expect('hooks' in result).toBe(false);
    });
  });

  describe('REQUIREMENT: obtainedVia should be simplified', () => {
    it('should return "sdk" when data is successfully extracted', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'Component' },
        memoizedProps: {},
        memoizedState: null
      };

      const result = introspector.getReactData(element);

      // Should be 'sdk' not 'devtools-hook'
      expect(result.obtainedVia).toBe('sdk');
    });

    it('should return "none" when SDK cannot find React', () => {
      const element = document.createElement('div');
      // No fiber attached

      const result = introspector.getReactData(element);

      expect(result.obtainedVia).toBe('none');
      expect(result.error).toBeDefined();
    });
  });

  describe('REQUIREMENT: Handle edge cases gracefully', () => {
    it('should handle hooks that are not state-related', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'EffectComponent' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: null,      // useEffect
          next: {
            memoizedState: null,    // useCallback
            next: {
              memoizedState: 'value', // useState
              next: null
            }
          }
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.useState0).toBe('value');
      // Non-state hooks should be ignored
      expect(Object.keys(result.state)).toHaveLength(1);
    });

    it('should handle deeply nested state objects', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: { name: 'DeepState' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    level5: 'deep'
                  }
                }
              }
            }
          },
          next: null
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.useState0.level1.level2.level3.level4.level5).toBe('deep');
    });

    it('should handle circular references in state', () => {
      const element = document.createElement('div');

      const circularState: any = { value: 'test' };
      circularState.self = circularState;

      (element as any).__reactFiber = {
        type: { name: 'CircularComponent' },
        memoizedProps: {},
        memoizedState: {
          memoizedState: circularState,
          next: null
        }
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      expect(result.state.useState0.value).toBe('test');
      // Should handle circular reference without crashing
      expect(result.state.useState0.self).toBeDefined();
    });

    it('should handle components with many hooks efficiently', () => {
      const element = document.createElement('div');

      // Create a chain of 10 useState hooks
      let hookChain: any = null;
      for (let i = 9; i >= 0; i--) {
        hookChain = {
          memoizedState: `state${i}`,
          next: hookChain
        };
      }

      (element as any).__reactFiber = {
        type: { name: 'ManyHooksComponent' },
        memoizedProps: {},
        memoizedState: hookChain
      };

      const result = introspector.getReactData(element);

      expect(result.state).toBeDefined();
      // Should have all 10 states
      for (let i = 0; i < 10; i++) {
        expect(result.state[`useState${i}`]).toBe(`state${i}`);
      }
    });
  });

  describe('REQUIREMENT: Component identification', () => {
    it('should correctly identify functional components', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: {
          name: 'FunctionComponent',
          // No prototype.isReactComponent
        },
        memoizedProps: {},
        memoizedState: { memoizedState: 'test', next: null }
      };

      const result = introspector.getReactData(element);

      expect(result.componentType).toBe('function');
      expect(result.componentName).toBe('FunctionComponent');
    });

    it('should correctly identify class components', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: {
          name: 'ClassComponent',
          prototype: { isReactComponent: true }
        },
        memoizedProps: {},
        memoizedState: { count: 1 }
      };

      const result = introspector.getReactData(element);

      expect(result.componentType).toBe('class');
      expect(result.componentName).toBe('ClassComponent');
    });

    it('should handle anonymous components', () => {
      const element = document.createElement('div');

      (element as any).__reactFiber = {
        type: function() {}, // Anonymous function
        memoizedProps: {},
        memoizedState: { memoizedState: 'test', next: null }
      };

      const result = introspector.getReactData(element);

      expect(result.componentName).toBe('Unknown');
      expect(result.state).toBeDefined();
    });
  });
});