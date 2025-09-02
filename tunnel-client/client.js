import WebSocket from 'ws';
import fetch from 'node-fetch';

/**
 * Wingman Tunnel Client
 * 
 * Connects to the tunnel server and forwards requests to the target application.
 * Implements the complete tunnel protocol for production use.
 */

class TunnelClient {
  constructor(config) {
    this.config = {
      tunnelServerUrl: 'ws://localhost:8787/ws',
      targetAppUrl: 'https://wingman-test-app.fly.dev',
      sessionId: 'test-tunnel',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      requestTimeout: 30000,
      ...config
    };
    
    this.websocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pendingRequests = new Map();
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalLatency: 0,
      startTime: Date.now(),
      lastRequestTime: null,
      connectionCount: 0,
      lastError: null
    };
    
    console.log('🚇 Wingman Tunnel Client initialized');
    console.log('📡 Tunnel Server:', this.config.tunnelServerUrl);
    console.log('🎯 Target App:', this.config.targetAppUrl);
    console.log('🆔 Session ID:', this.config.sessionId);
  }
  
  /**
   * Start the tunnel client
   */
  async start() {
    console.log('🚀 Starting tunnel client...');
    await this.connect();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    console.log('✅ Tunnel client started successfully');
  }
  
  /**
   * Connect to tunnel server
   */
  async connect() {
    if (this.websocket) {
      this.websocket.close();
    }
    
    console.log('🔌 Connecting to tunnel server...');
    
    return new Promise((resolve, reject) => {
      try {
        // Explicitly disable compression to avoid RSV1 frame errors
        const wsOptions = {
          perMessageDeflate: false,
          headers: {
            'Sec-WebSocket-Extensions': '',  // Explicitly no extensions
            'Accept-Encoding': 'identity'     // No compression
          }
        };
        this.websocket = new WebSocket(this.config.tunnelServerUrl, wsOptions);
        
        this.websocket.on('open', () => {
          console.log('✅ Connected to tunnel server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.stats.connectionCount++;
          
          // Register as developer for test-tunnel session
          this.register();
          resolve();
        });
        
        this.websocket.on('message', (data) => {
          this.handleMessage(data);
        });
        
        this.websocket.on('close', (code, reason) => {
          console.log(`❌ WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.handleDisconnection();
        });
        
        this.websocket.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          this.stats.lastError = error.message;
          this.handleDisconnection();
          reject(error);
        });
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Register with tunnel server
   */
  register() {
    const registerMessage = {
      type: 'register',
      role: 'developer',
      sessionId: this.config.sessionId,
      targetPort: 3000,
      timestamp: Date.now(),
      clientInfo: {
        name: 'wingman-tunnel-client',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production'
      }
    };
    
    console.log('📝 Registering with tunnel server...');
    this.sendMessage(registerMessage);
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'connected':
          console.log('✅ Connected to WebSocket server');
          break;
          
        case 'registered':
          console.log('✅ Successfully registered as developer');
          console.log('🌐 Tunnel URL:', message.tunnelUrl || 'https://test-tunnel.wingmanux.com');
          this.startHeartbeat();
          break;
          
        case 'request':
          await this.handleTunnelRequest(message);
          break;
          
        case 'heartbeat':
        case 'pong':
          // Handle both heartbeat and pong messages
          this.sendMessage({
            type: 'pong',
            sessionId: this.config.sessionId,
            timestamp: Date.now()
          });
          break;
          
        case 'error':
          console.error('❌ Server error:', message.error);
          this.stats.lastError = message.error;
          break;
          
        default:
          console.log('🔄 Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      this.stats.lastError = 'Message parse error';
    }
  }
  
  /**
   * Handle tunnel request from server
   */
  async handleTunnelRequest(message) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.lastRequestTime = startTime;
    
    // Extract the actual request data from the nested structure
    const requestId = message.requestId || message.id;
    const request = message.request || message; // Handle both nested and flat structures
    
    console.log(`🔄 Handling request: ${request.method} ${request.url} (ID: ${requestId})`);
    console.log(`📦 Request structure: nested=${!!message.request}, sessionId=${message.sessionId}`);
    
    try {
      // Build target URL
      const targetUrl = `${this.config.targetAppUrl}${request.url || request.path || '/'}`;
      
      // Prepare request options
      const requestOptions = {
        method: request.method,
        headers: {
          ...request.headers,
          // Override host header to target app
          'host': new URL(this.config.targetAppUrl).host,
          // Add tunnel identification
          'x-tunnel-client': 'wingman-tunnel-client',
          'x-tunnel-session': this.config.sessionId,
          'x-original-host': request.headers?.host || 'unknown'
        },
        timeout: this.config.requestTimeout
      };
      
      // Add body for POST/PUT requests
      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        if (request.isBase64 || message.isBase64) {
          requestOptions.body = Buffer.from(request.body, 'base64');
        } else if (typeof request.body === 'object') {
          // JSON body needs to be stringified
          requestOptions.body = JSON.stringify(request.body);
        } else {
          requestOptions.body = request.body;
        }
      }
      
      // Forward request to target app
      console.log(`➡️ Forwarding to: ${targetUrl}`);
      const response = await fetch(targetUrl, requestOptions);
      
      // Get response body
      const responseBuffer = await response.buffer();
      const responseBody = responseBuffer.toString('utf-8');
      
      // Check if response is binary
      const contentType = response.headers.get('content-type') || '';
      const isBinary = this.isBinaryContent(contentType, responseBuffer);
      
      // Convert headers to plain object
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Send response back through tunnel in the format the server expects
      const tunnelResponse = {
        type: 'response',
        requestId: requestId,  // Use requestId instead of id
        sessionId: message.sessionId,
        response: {  // Wrap in response object as server expects
          statusCode: response.status,
          headers: responseHeaders,
          body: isBinary ? responseBuffer.toString('base64') : responseBody,
          bodyLength: responseBuffer.length,
          isBase64: isBinary
        },
        timestamp: Date.now()
      };
      
      console.log(`📤 Sending response: status=${response.status}, bodyLength=${responseBuffer.length}, requestId=${requestId}`);
      this.sendMessage(tunnelResponse);
      
      // Update stats
      const latency = Date.now() - startTime;
      this.stats.successfulRequests++;
      this.stats.totalLatency += latency;
      this.stats.averageLatency = Math.round(this.stats.totalLatency / this.stats.successfulRequests);
      
      console.log(`✅ Request completed: ${response.status} (${latency}ms)`);
      
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      this.stats.failedRequests++;
      this.stats.lastError = error.message;
      
      // Send error response in the format the server expects
      const errorBody = JSON.stringify({
        error: 'Bad Gateway',
        message: 'Tunnel client failed to forward request',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      
      const errorResponse = {
        type: 'response',
        requestId: requestId,  // Use requestId instead of id
        sessionId: message.sessionId,
        response: {  // Wrap in response object as server expects
          statusCode: 502,
          headers: { 'content-type': 'application/json' },
          body: errorBody,
          bodyLength: errorBody.length,
          isBase64: false
        }
      };
      
      console.log(`❌ Sending error response: requestId=${requestId}, error=${error.message}`);
      this.sendMessage(errorResponse);
    }
  }
  
  /**
   * Check if content is binary
   */
  isBinaryContent(contentType, buffer) {
    // Check content type
    const binaryTypes = [
      'image/', 'video/', 'audio/', 'application/octet-stream',
      'application/pdf', 'application/zip', 'application/gzip'
    ];
    
    if (binaryTypes.some(type => contentType.includes(type))) {
      return true;
    }
    
    // Check for non-text content by examining buffer
    if (buffer.length > 0) {
      const sample = buffer.slice(0, Math.min(512, buffer.length));
      const nonTextBytes = sample.filter(byte => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13).length;
      return (nonTextBytes / sample.length) > 0.3; // More than 30% non-text bytes
    }
    
    return false;
  }
  
  /**
   * Send message through WebSocket
   */
  sendMessage(message) {
    if (this.isConnected && this.websocket) {
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send message: not connected');
    }
  }
  
  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({
          type: 'ping',
          sessionId: this.config.sessionId,
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
    
    console.log('💓 Heartbeat started');
  }
  
  /**
   * Handle disconnection and implement reconnection logic
   */
  handleDisconnection() {
    this.isConnected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Don't reconnect if we're shutting down
    if (this.shuttingDown) {
      return;
    }
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }, this.config.reconnectInterval);
      
    } else {
      console.error('❌ Max reconnection attempts reached. Giving up.');
      process.exit(1);
    }
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Log stats every minute
    setInterval(() => {
      this.logStats();
    }, 60000);
    
    // Health check endpoint simulation
    setInterval(() => {
      if (this.isConnected) {
        console.log('💚 Health check: Connected and operational');
      } else {
        console.log('💔 Health check: Disconnected');
      }
    }, 300000); // Every 5 minutes
  }
  
  /**
   * Log current statistics
   */
  logStats() {
    const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
    const successRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) 
      : 0;
    
    console.log('📊 Tunnel Client Stats:');
    console.log(`   Uptime: ${uptime}s`);
    console.log(`   Connections: ${this.stats.connectionCount}`);
    console.log(`   Total Requests: ${this.stats.totalRequests}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Average Latency: ${this.stats.averageLatency}ms`);
    console.log(`   Status: ${this.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
    if (this.stats.lastError) {
      console.log(`   Last Error: ${this.stats.lastError}`);
    }
  }
  
  /**
   * Graceful shutdown
   */
  shutdown(signal) {
    console.log(`🛑 ${signal} received, shutting down gracefully...`);
    this.shuttingDown = true;
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
    }
    
    // Log final stats
    this.logStats();
    
    console.log('👋 Tunnel client shutdown complete');
    process.exit(0);
  }
}

// Start the tunnel client
const client = new TunnelClient({
  tunnelServerUrl: process.env.TUNNEL_SERVER_URL || 'ws://localhost:8787/ws',
  targetAppUrl: process.env.TARGET_APP_URL || 'https://wingman-test-app.fly.dev',
  sessionId: process.env.SESSION_ID || 'test-tunnel'
});

client.start().catch(error => {
  console.error('❌ Failed to start tunnel client:', error);
  process.exit(1);
});