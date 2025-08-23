// Iframe-based Request Proxy for P2P/Relay fallback
(function(window) {
  'use strict';

  class IframeProxy {
    constructor(sessionId, tunnelPath) {
      this.sessionId = sessionId;
      this.tunnelPath = tunnelPath; // Base path for relay fallback
      this.iframe = null;
      this.p2pClient = null;
      this.isP2PEnabled = false;
      this.requestIdCounter = 0;
      this.pendingRequests = new Map();
      
      // Bind methods
      this.handleIframeMessage = this.handleIframeMessage.bind(this);
      this.interceptFetch = this.interceptFetch.bind(this);
      this.interceptXHR = this.interceptXHR.bind(this);
    }

    /**
     * Initialize the iframe proxy
     */
    async init(p2pClient) {
      this.p2pClient = p2pClient;
      
      // Set up message listener for iframe communication
      window.addEventListener('message', this.handleIframeMessage);
      
      // Create iframe for the proxied application
      this.createIframe();
      
      // Wait for iframe to load
      await this.waitForIframeLoad();
      
      // Inject request interceptors into iframe
      this.injectInterceptors();
      
      console.log('[IframeProxy] Initialized');
    }

    /**
     * Create the application iframe
     */
    createIframe() {
      // Remove existing iframe if any
      const existingIframe = document.getElementById('app-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }
      
      // Create new iframe
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'app-iframe';
      this.iframe.style.width = '100%';
      this.iframe.style.height = '600px';
      this.iframe.style.border = 'none';
      this.iframe.style.borderRadius = '8px';
      
      // Set initial source to tunnel path
      this.iframe.src = `${this.tunnelPath}/`;
      
      // Find container and append iframe
      const container = document.querySelector('.iframe-placeholder') || document.body;
      container.innerHTML = '';
      container.appendChild(this.iframe);
    }

    /**
     * Wait for iframe to load
     */
    waitForIframeLoad() {
      return new Promise((resolve) => {
        this.iframe.onload = () => {
          console.log('[IframeProxy] Iframe loaded');
          resolve();
        };
      });
    }

    /**
     * Inject request interceptors into iframe
     */
    injectInterceptors() {
      if (!this.iframe || !this.iframe.contentWindow) {
        console.error('[IframeProxy] Cannot inject interceptors - iframe not ready');
        return;
      }
      
      try {
        const iframeWindow = this.iframe.contentWindow;
        
        // Inject proxy configuration
        iframeWindow.eval(`
          window.__WINGMAN_PROXY__ = {
            enabled: true,
            sessionId: '${this.sessionId}',
            sendRequest: function(request) {
              window.parent.postMessage({
                type: 'proxy-request',
                request: request
              }, '*');
              
              return new Promise(function(resolve, reject) {
                const requestId = request.id;
                const timeout = setTimeout(function() {
                  reject(new Error('Request timeout'));
                }, 30000);
                
                // Store resolver for this request
                window.__WINGMAN_PROXY__.pendingRequests = window.__WINGMAN_PROXY__.pendingRequests || {};
                window.__WINGMAN_PROXY__.pendingRequests[requestId] = {
                  resolve: resolve,
                  reject: reject,
                  timeout: timeout
                };
              });
            }
          };
        `);
        
        // Monkey-patch fetch
        iframeWindow.eval(`
          (function() {
            const originalFetch = window.fetch;
            
            window.fetch = async function(url, options = {}) {
              // Check if proxy is enabled
              if (!window.__WINGMAN_PROXY__ || !window.__WINGMAN_PROXY__.enabled) {
                return originalFetch.apply(this, arguments);
              }
              
              // Convert to absolute URL
              const absoluteUrl = new URL(url, window.location.href).href;
              
              // Create request object
              const request = {
                id: Math.random().toString(36).substr(2, 9),
                method: options.method || 'GET',
                url: absoluteUrl,
                headers: options.headers || {},
                body: options.body || null
              };
              
              try {
                // Send request through proxy
                const response = await window.__WINGMAN_PROXY__.sendRequest(request);
                
                // Convert to Response object
                return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
              } catch (error) {
                // Fallback to original fetch
                console.warn('[IframeProxy] Proxy request failed, falling back:', error);
                return originalFetch.apply(this, arguments);
              }
            };
            
            console.log('[IframeProxy] Fetch interceptor installed');
          })();
        `);
        
        // Monkey-patch XMLHttpRequest
        iframeWindow.eval(`
          (function() {
            const OriginalXHR = window.XMLHttpRequest;
            
            window.XMLHttpRequest = function() {
              const xhr = new OriginalXHR();
              const originalOpen = xhr.open;
              const originalSend = xhr.send;
              let requestData = {};
              
              xhr.open = function(method, url, async, user, password) {
                requestData.method = method;
                requestData.url = new URL(url, window.location.href).href;
                requestData.async = async !== false;
                return originalOpen.apply(this, arguments);
              };
              
              xhr.send = function(body) {
                // Check if proxy is enabled
                if (!window.__WINGMAN_PROXY__ || !window.__WINGMAN_PROXY__.enabled) {
                  return originalSend.apply(this, arguments);
                }
                
                // Create request object
                const request = {
                  id: Math.random().toString(36).substr(2, 9),
                  method: requestData.method,
                  url: requestData.url,
                  headers: {},
                  body: body || null
                };
                
                // Send through proxy
                window.__WINGMAN_PROXY__.sendRequest(request)
                  .then(function(response) {
                    // Simulate XHR response
                    Object.defineProperty(xhr, 'status', { value: response.status });
                    Object.defineProperty(xhr, 'statusText', { value: response.statusText });
                    Object.defineProperty(xhr, 'responseText', { value: response.body });
                    Object.defineProperty(xhr, 'response', { value: response.body });
                    Object.defineProperty(xhr, 'readyState', { value: 4 });
                    
                    // Trigger events
                    if (xhr.onreadystatechange) {
                      xhr.onreadystatechange();
                    }
                    if (xhr.onload) {
                      xhr.onload();
                    }
                  })
                  .catch(function(error) {
                    console.warn('[IframeProxy] XHR proxy failed, falling back:', error);
                    return originalSend.apply(xhr, arguments);
                  });
              };
              
              return xhr;
            };
            
            console.log('[IframeProxy] XMLHttpRequest interceptor installed');
          })();
        `);
        
        // Set up message listener in iframe
        iframeWindow.eval(`
          window.addEventListener('message', function(event) {
            if (event.data.type === 'proxy-response') {
              const requestId = event.data.requestId;
              const pending = window.__WINGMAN_PROXY__.pendingRequests[requestId];
              
              if (pending) {
                clearTimeout(pending.timeout);
                delete window.__WINGMAN_PROXY__.pendingRequests[requestId];
                
                if (event.data.error) {
                  pending.reject(new Error(event.data.error));
                } else {
                  pending.resolve(event.data.response);
                }
              }
            }
          });
        `);
        
        console.log('[IframeProxy] Interceptors injected successfully');
      } catch (error) {
        console.error('[IframeProxy] Failed to inject interceptors:', error);
      }
    }

    /**
     * Handle messages from iframe
     */
    async handleIframeMessage(event) {
      // Verify message is from our iframe
      if (event.source !== this.iframe.contentWindow) {
        return;
      }
      
      if (event.data.type === 'proxy-request') {
        const request = event.data.request;
        console.log('[IframeProxy] Received proxy request:', request.method, request.url);
        
        try {
          let response;
          
          // Check if P2P is available
          if (this.p2pClient && this.p2pClient.isP2PConnected()) {
            console.log('[IframeProxy] Using P2P connection');
            response = await this.sendRequestViaP2P(request);
          } else {
            console.log('[IframeProxy] Using relay fallback');
            response = await this.sendRequestViaRelay(request);
          }
          
          // Send response back to iframe
          this.iframe.contentWindow.postMessage({
            type: 'proxy-response',
            requestId: request.id,
            response: response
          }, '*');
        } catch (error) {
          console.error('[IframeProxy] Request failed:', error);
          
          // Send error back to iframe
          this.iframe.contentWindow.postMessage({
            type: 'proxy-response',
            requestId: request.id,
            error: error.message
          }, '*');
        }
      }
    }

    /**
     * Send request via P2P connection
     */
    async sendRequestViaP2P(request) {
      // Convert URL to relative path for local forwarding
      const url = new URL(request.url);
      const path = url.pathname + url.search;
      
      const p2pRequest = {
        method: request.method,
        path: path,
        headers: request.headers,
        body: request.body
      };
      
      return await this.p2pClient.sendRequest(p2pRequest);
    }

    /**
     * Send request via relay (WebSocket tunnel)
     */
    async sendRequestViaRelay(request) {
      // Rewrite URL to use tunnel path
      const url = new URL(request.url);
      const path = url.pathname + url.search;
      const tunnelUrl = `${this.tunnelPath}${path}`;
      
      // Make actual fetch request to tunnel
      const response = await fetch(tunnelUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      // Convert response to serializable format
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: await response.text()
      };
    }

    /**
     * Enable P2P mode
     */
    enableP2P() {
      this.isP2PEnabled = true;
      console.log('[IframeProxy] P2P mode enabled');
      
      // Update iframe proxy configuration
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.eval(`
          if (window.__WINGMAN_PROXY__) {
            window.__WINGMAN_PROXY__.p2pEnabled = true;
          }
        `);
      }
    }

    /**
     * Disable P2P mode (fallback to relay)
     */
    disableP2P() {
      this.isP2PEnabled = false;
      console.log('[IframeProxy] P2P mode disabled, using relay');
      
      // Update iframe proxy configuration
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.eval(`
          if (window.__WINGMAN_PROXY__) {
            window.__WINGMAN_PROXY__.p2pEnabled = false;
          }
        `);
      }
    }

    /**
     * Clean up proxy
     */
    cleanup() {
      // Remove event listener
      window.removeEventListener('message', this.handleIframeMessage);
      
      // Remove iframe
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
      
      // Clear pending requests
      this.pendingRequests.clear();
      
      console.log('[IframeProxy] Cleaned up');
    }
  }

  // Export to window
  window.IframeProxy = IframeProxy;
  
  // Helper function for P2P request handling (used by P2PClient)
  window.handleP2PRequest = async function(request) {
    // This function will be called by P2PClient when receiving requests
    // In a real implementation, this would forward to the appropriate handler
    console.log('[IframeProxy] Handling P2P request:', request);
    
    // For now, return a mock response
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'P2P response'
    };
  };
  
})(window);