// Client-side JavaScript for Wingman tunnel session page
(function() {
  'use strict';

  console.log('Wingman Tunnel Client initialized');
  console.log('Session data:', window.SESSION_DATA);

  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  // DOM elements
  const statusIndicator = document.querySelector('.status-indicator');
  const statusDot = document.querySelector('.status-dot');
  const statusText = statusIndicator?.querySelector('span');

  /**
   * Initialize WebSocket connection for real-time updates
   */
  function initWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        updateConnectionStatus('connected', 'Connected to tunnel server');
      };

      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = function(event) {
        console.log('WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus('disconnected', 'Connection lost');
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(initWebSocket, 2000 * reconnectAttempts);
        } else {
          updateConnectionStatus('error', 'Connection failed - max retries exceeded');
        }
      };

      ws.onerror = function(error) {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error', 'Connection error');
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      updateConnectionStatus('error', 'Failed to initialize connection');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  function handleWebSocketMessage(data) {
    switch (data.type) {
      case 'session_update':
        handleSessionUpdate(data.session);
        break;
      case 'tunnel_ready':
        handleTunnelReady(data.tunnelUrl);
        break;
      case 'tunnel_error':
        handleTunnelError(data.error);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Handle session status updates
   */
  function handleSessionUpdate(session) {
    console.log('Session updated:', session);
    
    // Update status display
    const statusElement = document.querySelector('.status');
    if (statusElement) {
      statusElement.className = `status status-${session.status}`;
      statusElement.textContent = session.status.toUpperCase();
    }

    // Update status indicator
    if (statusDot) {
      statusDot.className = `status-dot status-${session.status}`;
    }

    let statusMessage;
    switch (session.status) {
      case 'pending':
        statusMessage = 'Waiting for connection...';
        break;
      case 'active':
        statusMessage = 'Connected';
        break;
      case 'expired':
        statusMessage = 'Session expired';
        break;
      default:
        statusMessage = `Status: ${session.status}`;
    }

    if (statusText) {
      statusText.textContent = statusMessage;
    }
  }

  /**
   * Handle tunnel ready event
   */
  function handleTunnelReady(tunnelUrl) {
    console.log('Tunnel ready:', tunnelUrl);
    
    // Replace placeholder with actual iframe
    const placeholder = document.querySelector('.iframe-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <iframe 
          src="${tunnelUrl}" 
          style="width: 100%; height: 500px; border: none; border-radius: 8px;"
          title="Tunneled Application"
        ></iframe>
      `;
    }
  }

  /**
   * Handle tunnel errors
   */
  function handleTunnelError(error) {
    console.error('Tunnel error:', error);
    updateConnectionStatus('error', `Tunnel error: ${error}`);
  }

  /**
   * Update connection status display
   */
  function updateConnectionStatus(status, message) {
    if (statusText) {
      statusText.textContent = message;
    }

    if (statusDot) {
      // Add a temporary class for visual feedback
      statusDot.classList.add(`status-${status}`);
    }
  }

  /**
   * Send message to WebSocket server
   */
  function sendMessage(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message:', data);
    }
  }

  /**
   * Initialize the client
   */
  function init() {
    console.log('Initializing Wingman tunnel client...');
    
    // Initialize WebSocket connection
    initWebSocket();

    // Register with the tunnel server
    if (window.SESSION_DATA) {
      setTimeout(() => {
        sendMessage({
          type: 'register_session',
          sessionId: window.SESSION_DATA.id
        });
      }, 1000);
    }

    // Set up periodic status checks
    setInterval(() => {
      if (window.SESSION_DATA) {
        sendMessage({
          type: 'ping',
          sessionId: window.SESSION_DATA.id
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose some functions globally for debugging
  window.wingmanClient = {
    sendMessage,
    reconnect: initWebSocket
  };
})();