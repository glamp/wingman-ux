// Safe IframeProxy implementation without eval()
// This version uses script injection instead of eval() to avoid security vulnerabilities

(function() {
  'use strict';

  /**
   * IframeProxy - Intercepts HTTP requests from iframe without using eval()
   */
  class IframeProxy {
    constructor(sessionId, tunnelPath) {
      this.sessionId = sessionId;
      this.tunnelPath = tunnelPath;
      this.iframe = null;
      this.isP2PEnabled = false;
      this.p2pClient = null;
      this.requestCount = 0;
      this.injectionScript = null;
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
      
      // Inject request interceptors using safe script injection
      this.injectInterceptorsSafe();
      
      // Set up message handling
      this.setupMessageHandling();
      
      console.log('[IframeProxy] Initialized with session:', this.sessionId);
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
      
      // Create new iframe
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'wingman-iframe';
      this.iframe.src = this.tunnelPath;
      this.iframe.style.width = '100%';
      this.iframe.style.height = '600px';
      this.iframe.style.border = '1px solid #ddd';
      this.iframe.style.borderRadius = '8px';
      
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
     * Inject interceptors safely without eval()
     */
    injectInterceptorsSafe() {
      if (!this.iframe?.contentWindow) {
        console.error('[IframeProxy] No iframe content window available');
        return;
      }

      try {
        // Create a script element in the iframe's document
        const script = this.iframe.contentDocument.createElement('script');
        script.type = 'text/javascript';
        
        // Define the interceptor code as a string
        const interceptorCode = `
          (function() {
            'use strict';
            
            // Create proxy configuration
            window.__WINGMAN_PROXY__ = {
              enabled: true,
              sessionId: '${this.sessionId.replace(/'/g, "\\'")}',
              pendingRequests: {},
              
              sendRequest: function(request) {
                // Send request to parent window
                window.parent.postMessage({
                  type: 'proxy-request',
                  request: request
                }, '*');
                
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
            
            // Listen for responses from parent
            window.addEventListener('message', function(event) {
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
            
            // Override fetch
            const originalFetch = window.fetch;
            window.fetch = async function(url, options = {}) {
              if (!window.__WINGMAN_PROXY__.enabled) {
                return originalFetch.apply(window, arguments);
              }
              
              try {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(url, window.location.href).href;
                
                // Prepare request
                const request = {
                  id: Math.random().toString(36).substr(2, 9),
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
            
            // Override XMLHttpRequest
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
                
                // Prepare request
                const request = {
                  id: Math.random().toString(36).substr(2, 9),
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
            
            console.log('[IframeProxy] Interceptors installed safely');
          })();
        `;
        
        // Set the script content
        script.textContent = interceptorCode;
        
        // Append script to iframe's head
        this.iframe.contentDocument.head.appendChild(script);
        
        console.log('[IframeProxy] Safe interceptors injected without eval()');
      } catch (error) {
        console.error('[IframeProxy] Error injecting interceptors:', error);
      }
    }

    /**
     * Set up message handling from iframe
     */
    setupMessageHandling() {
      window.addEventListener('message', async (event) => {
        // Validate origin if needed
        // if (event.origin !== expectedOrigin) return;
        
        if (event.data.type === 'proxy-request') {
          await this.handleProxyRequest(event.data.request);
        }
      });
    }

    /**
     * Handle proxy request from iframe
     */
    async handleProxyRequest(request) {
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
        
        // Send response back to iframe
        this.iframe.contentWindow.postMessage({
          type: 'proxy-response',
          response: response
        }, '*');
        
      } catch (error) {
        console.error('[IframeProxy] Request failed:', error);
        
        // Send error response
        this.iframe.contentWindow.postMessage({
          type: 'proxy-response',
          response: {
            requestId: request.id,
            error: error.message
          }
        }, '*');
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
          'content-type': 'application/json'
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
      
      // Update iframe config
      if (this.iframe?.contentWindow?.__WINGMAN_PROXY__) {
        this.iframe.contentWindow.__WINGMAN_PROXY__.mode = 'p2p';
      }
    }

    /**
     * Disable P2P mode (fallback to relay)
     */
    disableP2P() {
      this.isP2PEnabled = false;
      console.log('[IframeProxy] P2P mode disabled - using relay');
      
      // Update iframe config
      if (this.iframe?.contentWindow?.__WINGMAN_PROXY__) {
        this.iframe.contentWindow.__WINGMAN_PROXY__.mode = 'relay';
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