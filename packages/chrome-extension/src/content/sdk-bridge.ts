/**
 * SDK Bridge Module
 * Handles communication between Chrome extension and Wingman Web SDK
 */

import { generateUniqueSelector, cleanupTempAttributes } from './selector-generator';

export interface SDKBridgeOptions {
  debug?: boolean;
  timeout?: number;
}

export class SDKBridge {
  private debug: boolean;
  private timeout: number;
  private sdkReady: boolean = false;
  private requestCounter = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeoutId: number;
  }>();

  constructor(options: SDKBridgeOptions = {}) {
    this.debug = options.debug || false;
    this.timeout = options.timeout || 3000; // 3 seconds default timeout
    this.initialize();
  }

  private initialize() {
    // Listen for SDK ready message
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Check if SDK is already ready
    this.checkSDKReady();
  }

  private handleMessage(event: MessageEvent) {
    // Only listen to messages from the same window
    if (event.source !== window) return;

    const { type, requestId, data, selector } = event.data || {};

    switch (type) {
      case 'WINGMAN_SDK_READY':
        this.sdkReady = true;
        if (this.debug) {
          console.log('[Wingman Bridge] SDK is ready');
        }
        break;

      case 'WINGMAN_REACT_DATA_RESPONSE':
        this.handleResponse(requestId, data);
        break;

      case 'WINGMAN_SELECTOR_RESPONSE':
        this.handleResponse(requestId, selector);
        break;
    }
  }

  private handleResponse(requestId: string, data: any) {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pending.resolve(data);
      this.pendingRequests.delete(requestId);
    }
  }

  private checkSDKReady() {
    // Send a ping to check if SDK is ready
    // The SDK will respond with WINGMAN_SDK_READY if it's loaded
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryPing = () => {
      if (this.sdkReady || attempts >= maxAttempts) {
        if (!this.sdkReady && this.debug) {
          console.log('[Wingman Bridge] SDK not detected after', attempts, 'attempts');
        }
        return;
      }
      
      attempts++;
      console.log('[Wingman Bridge] Sending PING to check SDK (attempt', attempts, ')');
      window.postMessage({ type: 'WINGMAN_PING' }, '*');
      
      // Retry with exponential backoff
      setTimeout(tryPing, Math.min(100 * Math.pow(2, attempts), 2000));
    };
    
    tryPing();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private sendRequest<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`SDK request timeout after ${this.timeout}ms`));
      }, this.timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId: timeoutId as number,
      });

      // Send message
      window.postMessage({
        type,
        requestId,
        ...payload,
      }, '*');

      if (this.debug) {
        console.log(`[Wingman Bridge] Sent request: ${type}`, payload);
      }
    });
  }

  /**
   * Check if SDK is available and ready
   */
  isSDKReady(): boolean {
    return this.sdkReady;
  }

  /**
   * Get React data for an element
   */
  async getReactData(element: HTMLElement): Promise<any> {
    console.log('[Wingman Bridge] Getting React data for element:', element);
    
    // Wait a bit for SDK to be ready if it's not yet
    if (!this.sdkReady) {
      console.log('[Wingman Bridge] SDK not ready, waiting 500ms...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!this.sdkReady) {
      if (this.debug) {
        console.log('[Wingman Bridge] SDK still not ready after wait, attempting direct extraction');
      }
      // Try direct extraction as fallback
      const directData = this.extractReactDataDirectly(element);
      console.log('[Wingman Bridge] Direct extraction result:', directData);
      return directData;
    }

    try {
      // Generate unique selector for the element
      const selector = generateUniqueSelector(element);
      console.log('[Wingman Bridge] Generated selector for element:', selector);
      
      console.log('[Wingman Bridge] Sending request to SDK for React data');
      const data = await this.sendRequest<any>('WINGMAN_GET_REACT_DATA', { selector });
      
      // Clean up any temporary attributes we may have added
      cleanupTempAttributes();
      
      if (this.debug) {
        console.log('[Wingman Bridge] Received React data from SDK:', data);
      }
      return data || { obtainedVia: 'none' };
    } catch (error) {
      if (this.debug) {
        console.warn('[Wingman Bridge] Failed to get React data from SDK:', error);
      }
      // Fallback to direct extraction
      const directData = this.extractReactDataDirectly(element);
      console.log('[Wingman Bridge] Fallback direct extraction result:', directData);
      
      // Clean up any temporary attributes
      cleanupTempAttributes();
      
      return directData;
    }
  }

  /**
   * Get robust selector for an element
   */
  async getRobustSelector(element: HTMLElement): Promise<string | undefined> {
    // Just use our selector generator directly
    // No need to go through SDK for this
    try {
      const selector = generateUniqueSelector(element);
      if (this.debug) {
        console.log('[Wingman Bridge] Generated robust selector:', selector);
      }
      cleanupTempAttributes();
      return selector;
    } catch (error) {
      if (this.debug) {
        console.warn('[Wingman Bridge] Failed to generate selector:', error);
      }
      return this.generateBasicSelector(element);
    }
  }

  /**
   * Direct extraction of React data (fallback when SDK is not available)
   */
  private extractReactDataDirectly(element: HTMLElement): any {
    try {
      // Try to find React fiber directly - support multiple React versions
      // React 16-17: __reactFiber, __reactInternalInstance
      // React 18-19: __reactFiber$[hash], __reactProps$[hash]
      const keys = Object.keys(element);
      console.log('[Wingman Bridge] Element keys:', keys.filter(k => k.includes('react') || k.includes('React')));
      
      const key = keys.find(
        key => key.startsWith('__reactInternalInstance') || 
               key.startsWith('__reactFiber') ||
               key.startsWith('_reactInternal') ||
               /^__reactFiber\$/.test(key) ||
               /^__reactProps\$/.test(key)
      );
      
      if (!key) {
        console.log('[Wingman Bridge] No React fiber key found on element');
        return { obtainedVia: 'none' };
      }
      
      console.log('[Wingman Bridge] Found React fiber key:', key);

      const fiber = (element as any)[key];
      if (!fiber) {
        return { obtainedVia: 'none' };
      }

      // Find component fiber
      let componentFiber = fiber;
      while (componentFiber && typeof componentFiber.type === 'string') {
        componentFiber = componentFiber.return;
      }

      if (!componentFiber) {
        return { obtainedVia: 'none' };
      }

      // Extract basic data
      const data: any = {
        obtainedVia: 'fiber-direct',
      };

      // Get component name
      if (componentFiber.type) {
        if (typeof componentFiber.type === 'function') {
          data.componentName = componentFiber.type.displayName || 
                             componentFiber.type.name || 
                             'Unknown';
          
          // Check if it's a class component
          if (componentFiber.type.prototype?.isReactComponent) {
            data.componentType = 'class';
          } else {
            data.componentType = 'function';
          }
        }
      }

      // Get props (basic sanitization)
      if (componentFiber.memoizedProps) {
        data.props = this.sanitizeBasic(componentFiber.memoizedProps);
      }

      // Get state (for class components)
      if (componentFiber.memoizedState && data.componentType === 'class') {
        data.state = this.sanitizeBasic(componentFiber.memoizedState);
      }

      // Try to get parent components
      const parents: string[] = [];
      let current = componentFiber.return;
      let depth = 0;
      while (current && depth < 5) {
        if (current.type && typeof current.type !== 'string') {
          const name = current.type.displayName || current.type.name;
          if (name) {
            parents.push(name);
          }
        }
        current = current.return;
        depth++;
      }
      if (parents.length > 0) {
        data.parentComponents = parents;
      }

      return data;
    } catch (error) {
      if (this.debug) {
        console.warn('[Wingman Bridge] Direct React extraction failed:', error);
      }
      return { obtainedVia: 'none' };
    }
  }

  /**
   * Basic data sanitization for direct extraction
   */
  private sanitizeBasic(data: any, depth = 0, maxDepth = 2): any {
    if (depth > maxDepth) {
      return '[Max depth]';
    }

    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'function') {
      return '[Function]';
    }

    if (typeof data === 'symbol') {
      return data.toString();
    }

    if (typeof data === 'string') {
      if (data.length > 100) {
        return data.substring(0, 100) + '...';
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.slice(0, 5).map(item => this.sanitizeBasic(item, depth + 1, maxDepth));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      const keys = Object.keys(data).slice(0, 10);
      
      for (const key of keys) {
        if (key.startsWith('_') || key.startsWith('$$')) {
          continue;
        }
        try {
          sanitized[key] = this.sanitizeBasic(data[key], depth + 1, maxDepth);
        } catch {
          sanitized[key] = '[Unserializable]';
        }
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Generate basic CSS selector (fallback)
   */
  private generateBasicSelector(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith('wingman-'))
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }
      
      const siblings = Array.from(current.parentNode?.children || []);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clear all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('SDK Bridge destroyed'));
    }
    this.pendingRequests.clear();

    // Remove event listener
    window.removeEventListener('message', this.handleMessage.bind(this));
  }
}