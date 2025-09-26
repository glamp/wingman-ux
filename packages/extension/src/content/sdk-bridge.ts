/**
 * SDK Bridge Module
 * Handles communication between Chrome extension and Wingman Web SDK
 */

import { generateUniqueSelector, cleanupTempAttributes } from './selector-generator';
import { createLogger } from '../utils/logger';

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
  private logger = createLogger('Wingman:SDKBridge');

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
        this.logger.debug('SDK is ready');
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
        if (!this.sdkReady) {
          this.logger.debug('SDK not detected after', attempts, 'attempts');
        }
        return;
      }
      
      attempts++;
      this.logger.debug('Sending PING to check SDK (attempt', attempts, ')');
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

      this.logger.debug(`Sent request: ${type}`, payload);
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
    this.logger.debug('Getting React data for element:', element);
    this.logger.debug('SDK ready status:', this.sdkReady);

    // Wait a bit for SDK to be ready if it's not yet
    if (!this.sdkReady) {
      this.logger.debug('SDK not ready, waiting 500ms...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.sdkReady) {
      this.logger.debug('SDK not available');
      return { obtainedVia: 'none', error: 'SDK not loaded' };
    }

    try {
      // Generate unique selector for the element
      const selector = generateUniqueSelector(element);
      this.logger.debug('Generated selector for element:', selector);

      this.logger.debug('Sending request to SDK for React data');
      const data = await this.sendRequest<any>('WINGMAN_GET_REACT_DATA', { selector });

      // Clean up any temporary attributes we may have added
      cleanupTempAttributes();

      this.logger.debug('Received React data from SDK:', data);
      this.logger.debug('React data extraction result:', {
        obtainedVia: data?.obtainedVia,
        componentName: data?.componentName,
        hasProps: !!data?.props,
        hasState: !!data?.state,
        propsKeys: data?.props ? Object.keys(data.props) : []
      });
      return data || { obtainedVia: 'none' };
    } catch (error) {
      this.logger.warn('Failed to get React data from SDK:', error);

      // Clean up any temporary attributes
      cleanupTempAttributes();

      return { obtainedVia: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
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
      this.logger.debug('Generated robust selector:', selector);
      cleanupTempAttributes();
      return selector;
    } catch (error) {
      this.logger.warn('Failed to generate selector:', error);
      return undefined;
    }
  }

  // Removed direct extraction methods as we rely solely on SDK now


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