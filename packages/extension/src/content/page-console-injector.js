/**
 * Page Console Injector
 * 
 * This script runs in the main page context (not the isolated content script world)
 * to capture console logs. It's injected as a web accessible resource to bypass CSP.
 */

(function() {
  // Skip if already injected
  if (window.__wingmanConsoleWrapped) return;
  window.__wingmanConsoleWrapped = true;

  // Initialize buffer for storing logs (accessible from content script)
  window.__wingmanConsoleLogs = window.__wingmanConsoleLogs || [];
  
  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  // Helper to serialize arguments safely
  function serializeArgs(args) {
    try {
      return Array.from(args).map(arg => {
        // Handle primitive types
        if (arg === null || arg === undefined) return arg;
        if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return arg;
        
        // Handle functions
        if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
        
        // Handle symbols
        if (typeof arg === 'symbol') return arg.toString();
        
        // Handle DOM elements
        if (arg instanceof HTMLElement) {
          return '[HTMLElement: ' + arg.tagName + (arg.id ? '#' + arg.id : '') + ']';
        }
        
        // Handle errors specially to preserve stack traces
        if (arg instanceof Error) {
          return {
            __wingmanError: true,
            message: arg.message,
            stack: arg.stack,
            name: arg.name
          };
        }
        
        // Try to JSON stringify objects and arrays
        try {
          // Use a replacer to handle circular references and special values
          const seen = new WeakSet();
          return JSON.parse(JSON.stringify(arg, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            if (typeof value === 'function') return '[Function]';
            if (typeof value === 'undefined') return '[undefined]';
            if (typeof value === 'symbol') return value.toString();
            return value;
          }));
        } catch (e) {
          // If JSON stringify fails, return a string representation
          try {
            return arg.toString();
          } catch {
            return '[Unserializable]';
          }
        }
      });
    } catch (error) {
      return ['[Error serializing arguments]'];
    }
  }

  // Wrap each console method
  ['log', 'info', 'warn', 'error'].forEach(level => {
    console[level] = function(...args) {
      // Call original method first
      originalConsole[level].apply(console, args);
      
      const logEntry = {
        source: '__wingman_console',
        level: level,
        args: serializeArgs(args),
        timestamp: Date.now(),
        url: window.location.href
      };
      
      // Store in buffer for later retrieval
      try {
        window.__wingmanConsoleLogs.push(logEntry);
        // Keep buffer size reasonable (last 500 entries)
        if (window.__wingmanConsoleLogs.length > 500) {
          window.__wingmanConsoleLogs.shift();
        }
      } catch (error) {
        // Buffer might be full or readonly
      }
      
      // Also send via postMessage for real-time capture
      try {
        window.postMessage(logEntry, '*');
      } catch (error) {
        // If we can't send the message, at least we have it buffered
      }
    };
  });

  // Also capture unhandled errors
  window.addEventListener('error', function(event) {
    try {
      const errorEntry = {
        source: '__wingman_console',
        level: 'error',
        args: [{
          __wingmanError: true,
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error ? event.error.stack : undefined
        }],
        timestamp: Date.now(),
        url: window.location.href,
        isUncaught: true
      };
      
      // Buffer the error
      window.__wingmanConsoleLogs.push(errorEntry);
      if (window.__wingmanConsoleLogs.length > 500) {
        window.__wingmanConsoleLogs.shift();
      }
      
      // Also send via postMessage
      window.postMessage(errorEntry, '*');
    } catch {}
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    try {
      let reason = event.reason;
      // Try to extract useful information from the rejection reason
      if (reason instanceof Error) {
        reason = {
          __wingmanError: true,
          message: reason.message,
          stack: reason.stack,
          name: reason.name
        };
      }
      
      const rejectionEntry = {
        source: '__wingman_console',
        level: 'error',
        args: ['Unhandled Promise Rejection:', reason],
        timestamp: Date.now(),
        url: window.location.href,
        isUncaught: true
      };
      
      // Buffer the rejection
      window.__wingmanConsoleLogs.push(rejectionEntry);
      if (window.__wingmanConsoleLogs.length > 500) {
        window.__wingmanConsoleLogs.shift();
      }
      
      // Also send via postMessage
      window.postMessage(rejectionEntry, '*');
    } catch {}
  });
  // Function to send all buffered logs
  // This can be called when a new listener (content script) connects
  window.__wingmanSendBufferedLogs = function() {
    if (window.__wingmanConsoleLogs && window.__wingmanConsoleLogs.length > 0) {
      console.log('[Wingman Injector] Sending', window.__wingmanConsoleLogs.length, 'buffered logs');
      // Send each buffered log as if it just happened
      window.__wingmanConsoleLogs.forEach(log => {
        try {
          window.postMessage(log, '*');
        } catch {}
      });
    }
  };
  
  // Listen for requests to send buffered logs
  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === '__wingman_request_logs') {
      window.__wingmanSendBufferedLogs();
    }
  });
})();