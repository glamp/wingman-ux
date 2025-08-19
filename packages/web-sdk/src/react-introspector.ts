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

  constructor(debug = false) {
    this.debug = debug;
    this.initialize();
  }

  private initialize() {
    // Check if React DevTools hook is available
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      this.hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      if (this.debug) {
        console.log('[Wingman] React DevTools hook detected');
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
      console.log('[Wingman] React DevTools hook not found');
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
        console.warn('[Wingman] Failed to get fiber roots:', error);
      }
    }
  }

  getReactData(element: HTMLElement): any {
    if (!this.hook) {
      return { obtainedVia: 'none' };
    }

    try {
      // Try to find React fiber for this element
      const fiber = this.findFiberByHostInstance(element);
      
      if (!fiber) {
        return { obtainedVia: 'none' };
      }

      // Extract component data
      const componentData = this.extractComponentData(fiber);
      
      return {
        ...componentData,
        obtainedVia: 'devtools-hook',
      };
    } catch (error) {
      if (this.debug) {
        console.warn('[Wingman] Failed to get React data:', error);
      }
      return { obtainedVia: 'none' };
    }
  }

  private findFiberByHostInstance(element: HTMLElement): any {
    // React stores fiber reference in DOM element
    const key = Object.keys(element).find(
      key => key.startsWith('__reactInternalInstance') || 
             key.startsWith('__reactFiber')
    );
    
    if (key) {
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
    while (componentFiber && typeof componentFiber.type === 'string') {
      componentFiber = componentFiber.return;
    }

    if (!componentFiber) {
      return data;
    }

    // Get component name
    if (componentFiber.type) {
      if (typeof componentFiber.type === 'function') {
        data.componentName = componentFiber.type.displayName || 
                           componentFiber.type.name || 
                           'Unknown';
      } else if (typeof componentFiber.type === 'object' && componentFiber.type.name) {
        // For object types with a name property (as in our tests)
        data.componentName = componentFiber.type.name;
      }
    }

    // Get props (sanitized)
    if (componentFiber.memoizedProps) {
      data.props = this.sanitizeData(componentFiber.memoizedProps);
    }

    // Get state (for class components or hooks)
    if (componentFiber.memoizedState) {
      // For function components with hooks
      if (componentFiber.type && typeof componentFiber.type === 'function') {
        const states = this.extractHookStates(componentFiber.memoizedState);
        if (states.length > 0) {
          data.state = states;
        }
      } else {
        // For class components
        data.state = this.sanitizeData(componentFiber.memoizedState);
      }
    }

    return data;
  }

  private extractHookStates(memoizedState: any): any[] {
    const states: any[] = [];
    let current = memoizedState;
    
    while (current) {
      if (current.memoizedState !== undefined) {
        states.push(this.sanitizeData(current.memoizedState));
      }
      current = current.next;
    }
    
    return states;
  }

  private sanitizeData(data: any, depth = 0, maxDepth = 3): any {
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
      return data.slice(0, 10).map(item => this.sanitizeData(item, depth + 1, maxDepth));
    }

    // Handle objects
    if (typeof data === 'object') {
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
          sanitized[key] = this.sanitizeData(data[key], depth + 1, maxDepth);
        } catch {
          sanitized[key] = '[Unserializable]';
        }
      }
      
      return sanitized;
    }

    return data;
  }

  private looksLikeSensitiveKey(key: string): boolean {
    const sensitive = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const lowerKey = key.toLowerCase();
    return sensitive.some(s => lowerKey.includes(s));
  }

  private looksLikeSensitiveData(value: string): boolean {
    // Check for common token patterns
    const patterns = [
      /^[A-Za-z0-9-_]{20,}$/, // JWT-like
      /^sk_[a-zA-Z0-9]{32,}$/, // Stripe-like
      /\b[A-Z0-9]{20,}\b/, // Generic API key
      /^Bearer\s+/, // Auth header
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
}