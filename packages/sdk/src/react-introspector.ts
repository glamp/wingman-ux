import { createLogger } from '@wingman/shared';

interface ReactDevToolsHook {
  renderers?: Map<number, any>;
  onCommitFiberRoot?: any;
  inject?: any;
}

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  }
}

export class ReactIntrospector {
  private debug: boolean;
  private hook: ReactDevToolsHook | null = null;
  private fiberRoot: any = null;
  private renderCounts = new WeakMap<any, number>();
  private renderTimings = new WeakMap<any, number>();
  private logger = createLogger('Wingman:Introspector');

  constructor(debug = false) {
    this.debug = debug;
    this.initialize();
  }

  private initialize() {
    // Check if React DevTools hook is available
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      this.hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      if (this.debug) {
        this.logger.debug('React DevTools hook detected');
      }

      // Try to get fiber root from existing renderers
      if (this.hook.renderers && this.hook.renderers.size > 0) {
        // Get the first renderer (usually there's only one)
        const [, renderer] = Array.from(this.hook.renderers.entries())[0] || [];
        if (renderer) {
          this.setupRenderer(renderer);
        }
      }

      // Hook into future commits
      const originalOnCommit = this.hook.onCommitFiberRoot;
      this.hook.onCommitFiberRoot = (id: number, root: any, ...args: any[]) => {
        this.fiberRoot = root;
        if (originalOnCommit) {
          originalOnCommit.call(this.hook, id, root, ...args);
        }
      };
    } else if (this.debug) {
      this.logger.debug('React DevTools hook not found');
    }
  }

  private setupRenderer(renderer: any) {
    try {
      if (renderer.getFiberRoots) {
        const roots = renderer.getFiberRoots();
        if (roots && roots.size > 0) {
          this.fiberRoot = Array.from(roots)[0];
        }
      }
    } catch (error) {
      if (this.debug) {
        this.logger.warn('Failed to get fiber roots:', error);
      }
    }
  }

  getReactData(element: HTMLElement): any {
    try {
      // Try to find React fiber for this element
      const fiber = this.findFiberByHostInstance(element);

      if (!fiber) {
        return { obtainedVia: 'none', error: 'No React fiber found' };
      }

      // Extract comprehensive component data
      const componentData = this.extractComponentData(fiber);

      return {
        ...componentData,
        obtainedVia: 'sdk',
      };
    } catch (error) {
      if (this.debug) {
        this.logger.warn('Failed to get React data:', error);
      }
      return { obtainedVia: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private findFiberByHostInstance(element: HTMLElement): any {
    // React stores fiber reference in DOM element
    // Support multiple React versions:
    // React 16-17: __reactFiber, __reactInternalInstance
    // React 18-19: __reactFiber$[hash], __reactProps$[hash]
    const keys = Object.keys(element);
    
    // Log React-related keys for debugging
    const reactKeys = keys.filter(k => k.includes('react') || k.includes('React'));
    if (reactKeys.length > 0 && this.debug) {
      this.logger.debug('React keys on element:', reactKeys);
    }
    
    const key = keys.find(
      key => key.startsWith('__reactInternalInstance') || 
             key.startsWith('__reactFiber') ||
             key.startsWith('_reactInternal') ||
             /^__reactFiber\$/.test(key) ||
             /^__reactProps\$/.test(key)
    );
    
    if (key) {
      if (this.debug) {
        this.logger.debug('Found React fiber with key:', key);
      }
      return (element as any)[key];
    }

    // Fallback: try to find in parent elements
    if (element.parentElement) {
      return this.findFiberByHostInstance(element.parentElement);
    }

    return null;
  }

  private extractComponentData(fiber: any): any {
    const data: any = {};

    // Find the nearest component fiber (not DOM fiber)
    let componentFiber = fiber;
    // Only traverse up if this is a DOM fiber (type is a string like 'div', 'span', etc.)
    if (typeof componentFiber.type === 'string') {
      while (componentFiber && typeof componentFiber.type === 'string') {
        componentFiber = componentFiber.return;
      }
    }

    if (!componentFiber) {
      return data;
    }

    // Get component name and type
    const componentInfo = this.extractComponentInfo(componentFiber);
    Object.assign(data, componentInfo);

    // Get source location
    data.source = this.extractSourceLocation(componentFiber);

    // Get component stack
    data.componentStack = this.extractComponentStack(componentFiber);
    data.parentComponents = this.extractParentComponents(componentFiber);

    // Get props (sanitized)
    if (componentFiber.memoizedProps) {
      data.props = this.sanitizeData(componentFiber.memoizedProps);
    }

    // Get state (unified for both class and functional components)
    if (componentFiber.memoizedState !== null && componentFiber.memoizedState !== undefined) {
      const isClassComponent = componentFiber.type?.prototype?.isReactComponent === true;

      if (isClassComponent) {
        // Class component state - direct
        data.state = this.sanitizeData(componentFiber.memoizedState);
      } else {
        // Functional component or other - transform hooks to state
        data.state = this.transformHooksToState(componentFiber.memoizedState);
      }
    }

    // Get React Context values
    data.contexts = this.extractContextValues(componentFiber);

    // Get render information
    const renderInfo = this.extractRenderInfo(componentFiber);
    Object.assign(data, renderInfo);

    // Get error boundary info
    data.errorBoundary = this.findErrorBoundary(componentFiber);

    // Get fiber information
    data.fiberType = this.getFiberType(componentFiber);
    data.effectTags = this.getEffectTags(componentFiber);

    return data;
  }

  private extractComponentInfo(fiber: any): any {
    const info: any = {};

    if (fiber.type) {
      if (typeof fiber.type === 'function') {
        // Get component name, avoiding 'type' as a name
        const name = fiber.type.displayName || fiber.type.name;
        info.componentName = (name && name !== 'type') ? name : 'Unknown';

        if (fiber.type.displayName) {
          info.displayName = fiber.type.displayName;
        }

        // Determine component type
        if (fiber.type.prototype?.isReactComponent) {
          info.componentType = 'class';
        } else if (fiber.type.$$typeof) {
          const typeSymbol = fiber.type.$$typeof.toString();
          if (typeSymbol.includes('react.memo')) {
            info.componentType = 'memo';
          } else if (typeSymbol.includes('react.forward_ref')) {
            info.componentType = 'forwardRef';
          } else if (typeSymbol.includes('react.lazy')) {
            info.componentType = 'lazy';
          } else {
            info.componentType = 'function';
          }
        } else {
          info.componentType = 'function';
        }
      } else if (typeof fiber.type === 'object') {
        // Handle object types (including test mocks)
        if (fiber.type.name) {
          info.componentName = fiber.type.name;

          // Determine component type based on prototype
          if (fiber.type.prototype?.isReactComponent) {
            info.componentType = 'class';
          } else {
            info.componentType = 'function';
          }
        } else if (fiber.type.$$typeof) {
          const typeSymbol = fiber.type.$$typeof.toString();
          if (typeSymbol.includes('react.memo')) {
            info.componentType = 'memo';
            info.componentName = fiber.type.type?.name || 'Memo';
          } else if (typeSymbol.includes('react.forward_ref')) {
            info.componentType = 'forwardRef';
            info.componentName = fiber.type.render?.name || 'ForwardRef';
          } else if (typeSymbol.includes('react.lazy')) {
            info.componentType = 'lazy';
            info.componentName = 'Lazy';
          }
        }

        if (fiber.type.displayName) {
          info.displayName = fiber.type.displayName;
          if (!info.componentName) {
            info.componentName = fiber.type.displayName;
          }
        }
      }
    }

    // Default to 'Unknown' for component name if not set
    if (!info.componentName) {
      info.componentName = 'Unknown';
    }

    if (!info.componentType) {
      info.componentType = 'unknown';
    }

    return info;
  }

  private extractSourceLocation(fiber: any): any {
    // Try to get source from _debugSource
    if (fiber._debugSource) {
      return {
        fileName: fiber._debugSource.fileName,
        lineNumber: fiber._debugSource.lineNumber,
        columnNumber: fiber._debugSource.columnNumber,
      };
    }

    // Try to get from type's _source
    if (fiber.type?._source) {
      return {
        fileName: fiber.type._source.fileName,
        lineNumber: fiber.type._source.lineNumber,
        columnNumber: fiber.type._source.columnNumber,
      };
    }

    // Try to extract from stack trace
    if (fiber.type && typeof fiber.type === 'function') {
      const stack = new Error().stack;
      if (stack) {
        const match = stack.match(/at\s+(\S+)\s+\((.+):(\d+):(\d+)\)/);
        if (match && match[3] && match[4]) {
          return {
            fileName: match[2],
            lineNumber: parseInt(match[3], 10),
            columnNumber: parseInt(match[4], 10),
          };
        }
      }
    }

    return undefined;
  }

  private extractComponentStack(fiber: any): any[] {
    const stack: any[] = [];
    let current = fiber;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
      if (current.type && typeof current.type !== 'string') {
        const componentName = this.getComponentName(current);
        if (componentName && componentName !== 'Unknown') {
          stack.push({
            name: componentName,
            props: current.memoizedProps ? this.sanitizeData(current.memoizedProps, 0, 1) : undefined,
            key: current.key,
          });
        }
      }
      current = current.return;
      depth++;
    }

    return stack.reverse();
  }

  private extractParentComponents(fiber: any): string[] {
    const parents: string[] = [];
    let current = fiber.return;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
      if (current.type && typeof current.type !== 'string') {
        const componentName = this.getComponentName(current);
        if (componentName && componentName !== 'Unknown') {
          parents.push(componentName);
        }
      }
      current = current.return;
      depth++;
    }

    return parents;
  }

  private getComponentName(fiber: any): string {
    if (!fiber.type) return 'Unknown';

    if (typeof fiber.type === 'function') {
      // Handle displayName and name properties
      const name = fiber.type.displayName || fiber.type.name;
      // If we have a name and it's not just 'type', use it
      return (name && name !== 'type') ? name : 'Unknown';
    }

    if (typeof fiber.type === 'object') {
      if (fiber.type.displayName) return fiber.type.displayName;
      if (fiber.type.name && fiber.type.name !== 'type') return fiber.type.name;
      if (fiber.type.$$typeof) {
        const typeSymbol = fiber.type.$$typeof.toString();
        if (typeSymbol.includes('react.memo') && fiber.type.type) {
          return fiber.type.type.displayName || fiber.type.type.name || 'Memo';
        }
        if (typeSymbol.includes('react.forward_ref') && fiber.type.render) {
          return fiber.type.render.displayName || fiber.type.render.name || 'ForwardRef';
        }
      }
    }

    return 'Unknown';
  }

  private transformHooksToState(hooks: any): any {
    if (!hooks) return undefined;

    const state: any = {};
    let stateIndex = 0;
    let reducerIndex = 0;

    // Collect all values
    const allValues: any[] = [];
    let current = hooks;
    while (current) {
      allValues.push(current.memoizedState);
      current = current.next;
    }

    // Process all values with simple rules:
    // 1. Skip null if it's isolated between non-null values (effect)
    // 2. Skip consecutive nulls but keep the last value
    let skipCount = 0;

    for (let i = 0; i < allValues.length; i++) {
      const value = allValues[i];

      // Skip null values based on context
      if (value === null) {
        // Check if this is an isolated null between values (effect pattern)
        if (i > 0 && i < allValues.length - 1) {
          const prev = allValues[i - 1];
          const next = allValues[i + 1];

          // Skip if isolated between non-null values
          if (prev !== null && prev !== undefined &&
              next !== null && next !== undefined) {
            skipCount++;
            continue;
          }
        }

        // For consecutive nulls: skip all but keep processing after them
        if (i > 0 && allValues[i - 1] === null) {
          skipCount++;
          continue; // Skip this null as it's part of a sequence
        }
        if (i < allValues.length - 1 && allValues[i + 1] === null) {
          skipCount++;
          continue; // Skip this null as it starts a sequence
        }
      }

      // Process any defined value
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const keys = Object.keys(value);
          const hasNonFunctionProps = keys.some(k => typeof value[k] !== 'function');

          // Check for circular references - these are usually useState, not reducers
          let hasCircular = false;
          try {
            JSON.stringify(value);
          } catch {
            hasCircular = true;
          }

          // Only treat as reducer if it has multiple keys and is not circular
          if (keys.length > 1 && hasNonFunctionProps && !hasCircular) {
            state[`reducer${reducerIndex}`] = this.sanitizeData(value);
            reducerIndex++;
          } else {
            state[`useState${stateIndex}`] = this.sanitizeData(value);
            stateIndex++;
          }
        } else {
          state[`useState${stateIndex}`] = this.sanitizeData(value);
          stateIndex++;
        }
      }
    }

    return Object.keys(state).length > 0 ? state : undefined;
  }

  private extractHooks(fiber: any): any[] {
    const hooks: any[] = [];
    let current = fiber.memoizedState;
    let hookIndex = 0;
    
    // Map of React's internal hook tags to our hook types
    const hookTypes: { [key: string]: string } = {
      '0': 'state',
      '1': 'reducer',
      '2': 'context',
      '3': 'ref',
      '4': 'effect',
      '5': 'layoutEffect',
      '6': 'callback',
      '7': 'memo',
      '8': 'imperativeHandle',
    };

    while (current) {
      const hook: any = {
        type: 'custom', // default
        value: undefined,
      };

      // Try to determine hook type from the tag
      if (current.tag !== undefined) {
        hook.type = hookTypes[current.tag] || 'custom';
      }

      // Extract hook value based on type
      if (current.memoizedState !== undefined) {
        hook.value = this.sanitizeData(current.memoizedState);
      }

      // Extract dependencies for effect/memo/callback hooks
      if (current.deps) {
        hook.dependencies = this.sanitizeData(current.deps);
      }

      // Try to get custom hook name from stack trace (experimental)
      if (hook.type === 'custom' && fiber.type) {
        const funcString = fiber.type.toString();
        const customHookMatch = funcString.match(/use[A-Z]\w*/g);
        if (customHookMatch && customHookMatch[hookIndex]) {
          hook.name = customHookMatch[hookIndex];
        }
      }

      hooks.push(hook);
      current = current.next;
      hookIndex++;
    }
    
    return hooks;
  }

  private extractContextValues(fiber: any): any[] {
    const contexts: any[] = [];
    let current = fiber;

    while (current) {
      // Check for context providers
      if (current.type?._context) {
        const context = current.type._context;
        contexts.push({
          displayName: context.displayName || 'Context',
          value: this.sanitizeData(current.memoizedProps?.value),
        });
      }

      // Check for context consumers
      if (current.dependencies?.firstContext) {
        let contextDep = current.dependencies.firstContext;
        while (contextDep) {
          contexts.push({
            displayName: contextDep.context?.displayName || 'Context',
            value: this.sanitizeData(contextDep.memoizedValue),
          });
          contextDep = contextDep.next;
        }
      }

      current = current.return;
    }

    // Remove duplicates
    const seen = new Set();
    return contexts.filter(ctx => {
      const key = JSON.stringify(ctx);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractRenderInfo(fiber: any): any {
    const info: any = {};

    // Track render count
    const currentCount = this.renderCounts.get(fiber) || 0;
    info.renderCount = currentCount + 1;
    this.renderCounts.set(fiber, info.renderCount);

    // Track render duration (if available)
    if (fiber.actualDuration !== undefined) {
      info.lastRenderDuration = fiber.actualDuration;
      this.renderTimings.set(fiber, fiber.actualDuration);
    }

    // Try to determine render reasons
    const reasons: string[] = [];
    
    if (fiber.alternate) {
      // Props changed
      if (fiber.memoizedProps !== fiber.alternate.memoizedProps) {
        reasons.push('props changed');
      }
      
      // State changed
      if (fiber.memoizedState !== fiber.alternate.memoizedState) {
        if (fiber.type?.prototype?.isReactComponent) {
          reasons.push('state changed');
        } else {
          reasons.push('hooks changed');
        }
      }
      
      // Context changed
      if (fiber.dependencies !== fiber.alternate.dependencies) {
        reasons.push('context changed');
      }
    } else {
      reasons.push('initial render');
    }

    if (reasons.length > 0) {
      info.renderReasons = reasons;
    }

    return info;
  }

  private findErrorBoundary(fiber: any): any {
    let current = fiber.return;

    while (current) {
      if (current.type?.getDerivedStateFromError || 
          current.type?.prototype?.componentDidCatch) {
        const errorBoundaryName = this.getComponentName(current);
        
        // Check if there's an error in state
        if (current.memoizedState?.error) {
          return {
            componentName: errorBoundaryName,
            error: current.memoizedState.error.toString(),
            errorInfo: this.sanitizeData(current.memoizedState.errorInfo),
          };
        }
        
        return {
          componentName: errorBoundaryName,
        };
      }
      current = current.return;
    }

    return undefined;
  }

  private getFiberType(fiber: any): string | undefined {
    const tag = fiber.tag;
    
    // React fiber tags
    const tagNames: { [key: number]: string } = {
      0: 'FunctionComponent',
      1: 'ClassComponent',
      2: 'IndeterminateComponent',
      3: 'HostRoot',
      4: 'HostPortal',
      5: 'HostComponent',
      6: 'HostText',
      7: 'Fragment',
      8: 'Mode',
      9: 'ContextConsumer',
      10: 'ContextProvider',
      11: 'ForwardRef',
      12: 'Profiler',
      13: 'SuspenseComponent',
      14: 'MemoComponent',
      15: 'SimpleMemoComponent',
      16: 'LazyComponent',
    };

    return tagNames[tag] || `Unknown(${tag})`;
  }

  private getEffectTags(fiber: any): string[] | undefined {
    const flags = fiber.flags || fiber.effectTag;
    if (!flags) return undefined;

    const tags: string[] = [];
    
    // React effect flags
    if (flags & 1) tags.push('PerformedWork');
    if (flags & 2) tags.push('Placement');
    if (flags & 4) tags.push('Update');
    if (flags & 8) tags.push('PlacementAndUpdate');
    if (flags & 16) tags.push('Deletion');
    if (flags & 32) tags.push('ContentReset');
    if (flags & 64) tags.push('Callback');
    if (flags & 128) tags.push('DidCapture');
    if (flags & 256) tags.push('Ref');
    if (flags & 512) tags.push('Snapshot');
    if (flags & 1024) tags.push('Passive');
    if (flags & 2048) tags.push('Hydrating');

    return tags.length > 0 ? tags : undefined;
  }

  private sanitizeData(data: any, depth = 0, maxDepth = 5, seen = new WeakSet()): any {
    if (depth > maxDepth) {
      return '[Max depth]';
    }

    if (data === null || data === undefined) {
      return data;
    }

    // Remove functions
    if (typeof data === 'function') {
      return '[Function]';
    }

    // Handle symbols
    if (typeof data === 'symbol') {
      return data.toString();
    }

    // Truncate long strings
    if (typeof data === 'string') {
      if (data.length > 200) {
        return data.substring(0, 200) + '...';
      }
      // Mask potential sensitive data
      if (this.looksLikeSensitiveData(data)) {
        return '[Redacted]';
      }
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.slice(0, 10).map(item => this.sanitizeData(item, depth + 1, maxDepth, seen));
    }

    // Handle objects
    if (typeof data === 'object') {
      // Check for circular reference
      if (seen.has(data)) {
        return '[Circular]';
      }
      seen.add(data);
      // Handle special objects
      if (data instanceof Date) {
        return data.toISOString();
      }
      if (data instanceof RegExp) {
        return data.toString();
      }
      if (data instanceof Error) {
        return {
          message: data.message,
          stack: data.stack?.substring(0, 500),
        };
      }

      const sanitized: any = {};
      const keys = Object.keys(data).slice(0, 20); // Limit keys
      
      for (const key of keys) {
        // Skip React internal keys
        if (key.startsWith('_') || key.startsWith('$$')) {
          continue;
        }
        
        // Skip sensitive-looking keys
        if (this.looksLikeSensitiveKey(key)) {
          sanitized[key] = '[Redacted]';
          continue;
        }
        
        try {
          sanitized[key] = this.sanitizeData(data[key], depth + 1, maxDepth, seen);
        } catch {
          sanitized[key] = '[Unserializable]';
        }
      }
      
      return sanitized;
    }

    return data;
  }

  private looksLikeSensitiveKey(key: string): boolean {
    const sensitive = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'api_key', 'apikey'];
    const lowerKey = key.toLowerCase();
    return sensitive.some(s => lowerKey.includes(s));
  }

  private looksLikeSensitiveData(value: string): boolean {
    // Check for common token patterns
    const patterns = [
      /^[A-Za-z0-9-_]{20,}$/, // JWT-like
      /^sk_[a-zA-Z0-9]{32,}$/, // Stripe-like
      /^pk_[a-zA-Z0-9]{32,}$/, // Public key patterns
      /\b[A-Z0-9]{20,}\b/, // Generic API key
      /^Bearer\s+/, // Auth header
      /^ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, // JWT token
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
}