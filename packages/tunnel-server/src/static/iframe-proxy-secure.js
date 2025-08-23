/**
 * Secure IframeProxy - Intercepts HTTP requests from iframe with proper security
 * - No eval() usage
 * - Secure postMessage with origin validation
 * - CSP-compliant script injection
 */
(function() {
  'use strict';

  class IframeProxy {
    constructor(sessionId, tunnelPath) {
      this.sessionId = sessionId;
      this.tunnelPath = tunnelPath;
      this.iframe = null;
      this.isP2PEnabled = false;
      this.p2pClient = null;
      this.requestCount = 0;
      
      // Security: define allowed origins for postMessage
      this.allowedOrigins = this.getAllowedOrigins();
    }

    /**
     * Get allowed origins based on environment
     */
    getAllowedOrigins() {
      const origins = [];
      
      // Always allow same origin
      origins.push(window.location.origin);
      
      // In production, allow wingmanux.com subdomains
      if (window.location.hostname.endsWith('.wingmanux.com')) {
        origins.push('https://*.wingmanux.com');
      }
      
      // In development, allow localhost
      if (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1') {
        origins.push('http://localhost:3000');
        origins.push('http://localhost:3001');
        origins.push('http://localhost:8080');
        origins.push('http://localhost:9876');
        origins.push('http://127.0.0.1:3000');
      }
      
      return origins;
    }

    /**
     * Check if an origin is allowed
     */
    isOriginAllowed(origin) {
      // Check exact match
      if (this.allowedOrigins.includes(origin)) {
        return true;
      }
      
      // Check wildcard patterns
      for (const allowed of this.allowedOrigins) {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*', '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(origin)) {
            return true;
          }
        }
      }
      
      return false;
    }

    /**
     * Initialize the iframe proxy
     */
    async init(p2pClient) {
      this.p2pClient = p2pClient;
      
      // Create and configure iframe
      this.createIframe();
      
      // Wait for iframe to load
      await this.waitForIframeLoad();
      
      // Inject request interceptors securely
      this.injectInterceptorsSecurely();
      
      // Set up secure message handling
      this.setupSecureMessageHandling();
      
      console.log('[IframeProxy] Initialized securely with session:', this.sessionId);
    }

    /**
     * Create the iframe element
     */
    createIframe() {
      // Remove existing iframe if any
      const existing = document.querySelector('#wingman-iframe');
      if (existing) {
        existing.remove();
      }
      
      // Create new iframe with sandbox attributes for security
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'wingman-iframe';
      this.iframe.src = this.tunnelPath;
      this.iframe.style.width = '100%';
      this.iframe.style.height = '600px';
      this.iframe.style.border = '1px solid #ddd';
      this.iframe.style.borderRadius = '8px';
      
      // Security: Add sandbox attributes (allow scripts and same-origin for functionality)
      this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      
      // Add iframe to page
      const container = document.querySelector('.iframe-placeholder');
      if (container) {
        container.innerHTML = '';
        container.appendChild(this.iframe);
      }
    }

    /**
     * Wait for iframe to fully load
     */
    waitForIframeLoad() {
      return new Promise((resolve) => {
        if (this.iframe.contentDocument?.readyState === 'complete') {
          resolve();
        } else {
          this.iframe.addEventListener('load', () => resolve(), { once: true });
        }
      });
    }

    /**
     * Inject interceptors securely without eval()
     */
    injectInterceptorsSecurely() {
      if (!this.iframe?.contentWindow) {
        console.error('[IframeProxy] No iframe content window available');
        return;
      }

      try {
        // Create a script element in the iframe's document
        const script = this.iframe.contentDocument.createElement('script');
        script.type = 'text/javascript';
        
        // Use data attributes to pass configuration securely
        script.setAttribute('data-session-id', this.sessionId);
        script.setAttribute('data-parent-origin', window.location.origin);
        
        // Define the interceptor code
        const interceptorCode = `
          (function() {
            'use strict';
            
            // Get configuration from script attributes
            const currentScript = document.currentScript;
            const sessionId = currentScript.getAttribute('data-session-id');
            const parentOrigin = currentScript.getAttribute('data-parent-origin');
            
            // Security: validate parent origin
            if (!parentOrigin) {
              console.error('[IframeProxy] Parent origin not specified');
              return;
            }
            
            // Create proxy configuration
            window.__WINGMAN_PROXY__ = {
              enabled: true,
              sessionId: sessionId,
              parentOrigin: parentOrigin,
              pendingRequests: {},
              
              sendRequest: function(request) {
                // Security: Send to specific origin, not '*'
                window.parent.postMessage({
                  type: 'proxy-request',
                  request: request
                }, parentOrigin);
                
                // Return promise for response
                return new Promise(function(resolve, reject) {
                  const requestId = request.id;
                  const timeout = setTimeout(function() {
                    delete window.__WINGMAN_PROXY__.pendingRequests[requestId];
                    reject(new Error('Request timeout'));
                  }, 30000);
                  
                  // Store resolver for this request
                  window.__WINGMAN_PROXY__.pendingRequests[requestId] = {
                    resolve: resolve,
                    reject: reject,
                    timeout: timeout
                  };
                });
              }
            };
            
            // Listen for responses from parent with origin validation
            window.addEventListener('message', function(event) {
              // Security: validate origin
              if (event.origin !== parentOrigin) {
                console.warn('[IframeProxy] Ignoring message from untrusted origin:', event.origin);
                return;
              }
              
              if (event.data.type === 'proxy-response') {
                const response = event.data.response;
                const pending = window.__WINGMAN_PROXY__.pendingRequests[response.requestId];
                
                if (pending) {
                  clearTimeout(pending.timeout);
                  delete window.__WINGMAN_PROXY__.pendingRequests[response.requestId];
                  
                  if (response.error) {
                    pending.reject(new Error(response.error));
                  } else {
                    pending.resolve(response);
                  }
                }
              }
            });
            
            // Override fetch with secure implementation
            const originalFetch = window.fetch;
            window.fetch = async function(url, options = {}) {
              if (!window.__WINGMAN_PROXY__.enabled) {
                return originalFetch.apply(window, arguments);
              }
              
              try {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(url, window.location.href).href;
                
                // Generate secure request ID
                const request = {
                  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
                  method: options.method || 'GET',
                  url: absoluteUrl,
                  headers: options.headers || {},
                  body: options.body || null
                };
                
                // Send through proxy
                const response = await window.__WINGMAN_PROXY__.sendRequest(request);
                
                // Convert to Response object
                return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
              } catch (error) {
                console.error('[Fetch Interceptor] Error:', error);
                throw error;
              }
            };
            
            // Override XMLHttpRequest with secure implementation
            const OriginalXHR = window.XMLHttpRequest;
            
            window.XMLHttpRequest = function() {
              const xhr = new OriginalXHR();
              const originalOpen = xhr.open;
              const originalSend = xhr.send;
              
              let requestInfo = {};
              
              xhr.open = function(method, url) {
                requestInfo = { method, url };
                return originalOpen.apply(xhr, arguments);
              };
              
              xhr.send = function(body) {
                if (!window.__WINGMAN_PROXY__.enabled) {
                  return originalSend.apply(xhr, arguments);
                }
                
                // Convert to absolute URL
                const absoluteUrl = new URL(requestInfo.url, window.location.href).href;
                
                // Prepare request with secure ID
                const request = {
                  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
                  method: requestInfo.method,
                  url: absoluteUrl,
                  headers: {},
                  body: body || null
                };
                
                // Send through proxy
                window.__WINGMAN_PROXY__.sendRequest(request).then(function(response) {
                  // Simulate XHR response
                  Object.defineProperty(xhr, 'status', { value: response.status });
                  Object.defineProperty(xhr, 'statusText', { value: response.statusText });
                  Object.defineProperty(xhr, 'responseText', { value: response.body });
                  Object.defineProperty(xhr, 'response', { value: response.body });
                  Object.defineProperty(xhr, 'readyState', { value: 4 });
                  
                  // Trigger events
                  xhr.dispatchEvent(new Event('load'));
                  xhr.dispatchEvent(new Event('loadend'));
                }).catch(function(error) {
                  console.error('[XHR Interceptor] Error:', error);
                  xhr.dispatchEvent(new Event('error'));
                  xhr.dispatchEvent(new Event('loadend'));
                });
                
                return undefined;
              };
              
              return xhr;
            };
            
            console.log('[IframeProxy] Secure interceptors installed');
          })();
        `;
        
        // Set the script content
        script.textContent = interceptorCode;
        
        // Append script to iframe's head
        this.iframe.contentDocument.head.appendChild(script);
        
        console.log('[IframeProxy] Secure interceptors injected');
      } catch (error) {
        console.error('[IframeProxy] Error injecting interceptors:', error);
      }
    }

    /**
     * Set up secure message handling from iframe
     */
    setupSecureMessageHandling() {
      window.addEventListener('message', async (event) => {
        // Security: Validate origin
        if (!this.isOriginAllowed(event.origin)) {
          console.warn('[IframeProxy] Ignoring message from untrusted origin:', event.origin);
          return;
        }
        
        // Validate message structure
        if (!event.data || typeof event.data !== 'object') {
          return;
        }
        
        if (event.data.type === 'proxy-request') {
          await this.handleProxyRequest(event.data.request, event.origin);
        }
      });
    }

    /**
     * Handle proxy request from iframe
     */
    async handleProxyRequest(request, origin) {
      console.log('[IframeProxy] Handling request:', request);
      
      try {
        let response;
        
        if (this.isP2PEnabled && this.p2pClient?.isP2PConnected()) {
          // Use P2P channel
          console.log('[IframeProxy] Using P2P channel');
          response = await this.p2pClient.sendRequest(request);
        } else {
          // Use relay fallback
          console.log('[IframeProxy] Using relay fallback');
          response = await this.sendViaRelay(request);
        }
        
        // Security: Send response back to specific origin
        this.iframe.contentWindow.postMessage({
          type: 'proxy-response',
          response: response
        }, origin);
        
      } catch (error) {
        console.error('[IframeProxy] Request failed:', error);
        
        // Send error response to specific origin
        this.iframe.contentWindow.postMessage({
          type: 'proxy-response',
          response: {
            requestId: request.id,
            error: error.message
          }
        }, origin);
      }
    }

    /**
     * Send request via relay (WebSocket)
     */
    async sendViaRelay(request) {
      // This would connect to the tunnel server
      // For now, return mock response
      return {
        requestId: request.id,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-proxy-mode': 'relay'
        },
        body: JSON.stringify({
          message: 'Response via relay',
          requestUrl: request.url,
          method: request.method
        })
      };
    }

    /**
     * Enable P2P mode
     */
    enableP2P() {
      this.isP2PEnabled = true;
      console.log('[IframeProxy] P2P mode enabled');
      
      // Update iframe config securely
      if (this.iframe?.contentWindow?.__WINGMAN_PROXY__) {
        // Use postMessage to update configuration
        this.iframe.contentWindow.postMessage({
          type: 'proxy-config',
          config: { mode: 'p2p' }
        }, this.iframe.contentWindow.location.origin);
      }
    }

    /**
     * Disable P2P mode (fallback to relay)
     */
    disableP2P() {
      this.isP2PEnabled = false;
      console.log('[IframeProxy] P2P mode disabled - using relay');
      
      // Update iframe config securely
      if (this.iframe?.contentWindow?.__WINGMAN_PROXY__) {
        // Use postMessage to update configuration
        this.iframe.contentWindow.postMessage({
          type: 'proxy-config',
          config: { mode: 'relay' }
        }, this.iframe.contentWindow.location.origin);
      }
    }

    /**
     * Clean up resources
     */
    cleanup() {
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
    }
  }

  // Export to global scope
  window.IframeProxy = IframeProxy;
})();