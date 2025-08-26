export class ConsoleCapture {
  private entries: Array<{ level: 'log' | 'info' | 'warn' | 'error'; args: any[]; ts: number }> =
    [];
  private errors: Array<{ message: string; stack?: string; ts: number }> = [];
  private maxConsoleEntries = 100;
  private maxErrorEntries = 100;
  private removeWingmanLogs = true;

  constructor() {
    this.initializeConfig();
    this.loadBufferedLogs();
    this.injectConsoleWrapper();
    this.listenForPageLogs();
    this.setupErrorHandlers();
  }

  private initializeConfig() {
    // Try to get configuration from environment
    try {
      const config = (globalThis as any).__WINGMAN_CONFIG__;
      if (config?.dataCapture) {
        this.maxConsoleEntries = config.dataCapture.console.maxEntries || 100;
        this.maxErrorEntries = config.dataCapture.errors.maxEntries || 100;
      }
    } catch (error) {
      console.debug('[Wingman] Using default capture limits:', error);
    }
  }
  
  private loadBufferedLogs() {
    // Request any buffered logs from the injected script
    // The injected script (if present) will respond by sending all buffered logs
    try {
      window.postMessage({ source: '__wingman_request_logs' }, '*');
      console.log('[Wingman] Requested buffered console logs from page');
    } catch (error) {
      console.warn('[Wingman] Could not request buffered logs:', error);
    }
  }

  private injectConsoleWrapper() {
    // Check if chrome.runtime is available
    if (!chrome?.runtime?.getURL) {
      console.error('[Wingman] chrome.runtime.getURL not available, retrying...');
      // Retry after a short delay
      setTimeout(() => this.injectConsoleWrapper(), 100);
      return;
    }

    // Inject script into the page context using web accessible resource
    // This bypasses CSP restrictions that block inline scripts
    const script = document.createElement('script');
    const scriptUrl = chrome.runtime.getURL('page-console-injector.js');

    // Validate URL
    if (!scriptUrl || scriptUrl.includes('invalid')) {
      console.error('[Wingman] Invalid extension URL, extension context may not be ready');
      return;
    }

    script.src = scriptUrl;
    script.id = 'wingman-console-injector';

    // Clean up after injection
    script.onload = function () {
      this.remove();
    };

    // Handle injection errors
    script.onerror = function () {
      console.warn('[Wingman] Failed to inject console capture script');
      this.remove();
    };

    // Inject as early as possible
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(script);
    } else {
      // If neither head nor documentElement exist yet, wait for them
      // This can happen with document_start on very fast loads
      const observer = new MutationObserver((mutations, obs) => {
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(script);
          obs.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  }

  private listenForPageLogs() {
    // Listen for messages from the injected script
    // Using postMessage instead of CustomEvent for better cross-context communication
    window.addEventListener('message', (event: MessageEvent) => {
      // Only accept messages from the same window
      if (event.source !== window) return;

      // Check if it's our console message
      if (event.data?.source !== '__wingman_console') return;

      const { level, args, timestamp, isUncaught } = event.data;

      // Handle uncaught errors separately
      if (isUncaught && level === 'error') {
        const errorInfo = args[0];
        if (errorInfo && errorInfo.__wingmanError) {
          this.addError({
            message: errorInfo.message || 'Unknown error',
            stack: errorInfo.stack,
            ts: timestamp,
          });
        }
      }

      // Add to console entries (apply Wingman log filtering)
      this.addEntry(level, args, timestamp);
    });
  }

  private setupErrorHandlers() {
    // Error handling is now done in the injected script
    // which captures errors in the page context and sends them via custom events
    // This ensures we capture page errors, not content script errors
  }

  private addEntry(level: 'log' | 'info' | 'warn' | 'error', args: any[], timestamp?: number) {
    // Filter out Wingman's internal logs if removeWingmanLogs is enabled
    if (this.removeWingmanLogs && this.isWingmanInternalLog(args)) {
      return;
    }
    this.entries.push({
      level,
      args: this.sanitizeArgs(args),
      ts: timestamp || Date.now(),
    });

    if (this.entries.length > this.maxConsoleEntries) {
      this.entries.shift();
    }
  }

  /**
   * Detects if the log entry is from Wingman's internal logging system.
   * Matches patterns like:
   * - [Wingman] message
   * - [Wingman:Content] message
   * - [Wingman Popup] message
   * - [Wingman:Background] [DEBUG] message
   */
  private isWingmanInternalLog(args: any[]): boolean {
    // Check if first argument matches Wingman's log format
    if (typeof args?.[0] === 'string') {
      // Match [Wingman], [Wingman:*], [Wingman *] patterns
      // This regex matches strings that start with [Wingman and have a closing ]
      const wingmanLogPattern = /^\[Wingman[^\]]*\]/;
      return wingmanLogPattern.test(args[0]);
    }
    return false;
  }

  private addError(error: { message: string; stack?: string; ts: number }) {
    this.errors.push(error);

    if (this.errors.length > this.maxErrorEntries) {
      this.errors.shift();
    }
  }

  private sanitizeArgs(args: any[]): any[] {
    return args.map((arg) => {
      try {
        if (typeof arg === 'function') {
          return '[Function]';
        }
        if (typeof arg === 'object' && arg !== null) {
          // Basic circular reference protection
          return JSON.parse(
            JSON.stringify(arg, (key, value) => {
              if (typeof value === 'function') return '[Function]';
              if (typeof value === 'undefined') return '[undefined]';
              return value;
            })
          );
        }
        return arg;
      } catch {
        return '[Unserializable]';
      }
    });
  }

  getEntries() {
    return this.entries;
  }

  getErrors() {
    return this.errors;
  }

  clear() {
    this.entries = [];
    this.errors = [];
  }
}
