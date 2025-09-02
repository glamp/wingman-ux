const { EventSource } = require('eventsource');
const fetch = require('node-fetch');

/**
 * Wingman Tunnel Client (SSE Version)
 * 
 * Uses Server-Sent Events (SSE) to receive requests and HTTP POST to send responses.
 * This avoids WebSocket compression issues with Fly.io and other proxies.
 */

class SSETunnelClient {
  constructor(config) {
    this.config = {
      tunnelServerUrl: 'http://localhost:8787',
      targetAppUrl: 'https://wingman-test-app.fly.dev',
      sessionId: 'test-tunnel',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      requestTimeout: 30000,
      ...config
    };
    
    // Remove /ws suffix if present and ensure no protocol
    this.config.tunnelServerUrl = this.config.tunnelServerUrl
      .replace(/^wss?:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://')
      .replace(/\/ws$/, '');
    
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.lastHeartbeat = Date.now();
    
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
    
    console.log('🚇 Wingman SSE Tunnel Client initialized');
    console.log('📡 Tunnel Server:', this.config.tunnelServerUrl);
    console.log('🎯 Target App:', this.config.targetAppUrl);
    console.log('🆔 Session ID:', this.config.sessionId);
  }
  
  /**
   * Start the tunnel client
   */
  async start() {
    console.log('🚀 Starting SSE tunnel client...');
    
    // First, ensure the session exists
    await this.ensureSession();
    
    // Connect to SSE endpoint
    await this.connect();
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    console.log('✅ SSE tunnel client started successfully');
  }
  
  /**
   * Ensure tunnel session exists
   */
  async ensureSession() {
    try {
      const response = await fetch(`${this.config.tunnelServerUrl}/tunnel/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          targetPort: 3000
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.log(`⚠️ Session creation response: ${error}`);
      } else {
        const data = await response.json();
        console.log(`✅ Session ready: ${data.sessionId}`);
      }
    } catch (error) {
      console.error('❌ Failed to ensure session:', error.message);
    }
  }
  
  /**
   * Connect to SSE endpoint
   */
  async connect() {
    const sseUrl = `${this.config.tunnelServerUrl}/tunnel/events/${this.config.sessionId}`;
    console.log('🔌 Connecting to SSE endpoint:', sseUrl);
    
    try {
      this.eventSource = new EventSource(sseUrl);
      
      this.eventSource.onopen = () => {
        console.log('✅ Connected to SSE endpoint');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stats.connectionCount++;
        this.lastHeartbeat = Date.now();
      };
      
      this.eventSource.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error.message || 'Connection lost');
        this.stats.lastError = error.message || 'Connection lost';
        this.isConnected = false;
        this.handleDisconnection();
      };
      
      // Monitor heartbeats
      setInterval(() => {
        const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
        if (timeSinceHeartbeat > 60000) { // 60 seconds without heartbeat
          console.warn('⚠️ No heartbeat received for 60 seconds');
          this.handleDisconnection();
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Failed to create SSE connection:', error);
      this.handleDisconnection();
    }
  }
  
  /**
   * Handle incoming SSE messages
   */
  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connected':
          console.log('✅ SSE connection confirmed');
          console.log('🌐 Tunnel URL:', `https://${this.config.sessionId}.wingmanux.com`);
          break;
          
        case 'heartbeat':
          this.lastHeartbeat = Date.now();
          // Silent heartbeat handling
          break;
          
        case 'request':
          await this.handleTunnelRequest(message);
          break;
          
        default:
          console.log('🔄 Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('❌ Error parsing SSE message:', error);
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
    
    const requestId = message.requestId;
    const request = message.request;
    
    console.log(`🔄 Handling request: ${request.method} ${request.url} (ID: ${requestId})`);
    
    try {
      // Build target URL
      const targetUrl = `${this.config.targetAppUrl}${request.url || request.path || '/'}`;
      
      // Prepare request options
      const requestOptions = {
        method: request.method,
        headers: {
          ...request.headers,
          'host': new URL(this.config.targetAppUrl).host,
          'x-tunnel-client': 'wingman-sse-tunnel-client',
          'x-tunnel-session': this.config.sessionId,
          'x-original-host': request.headers?.host || 'unknown'
        },
        timeout: this.config.requestTimeout
      };
      
      // Add body for POST/PUT requests
      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        if (typeof request.body === 'object') {
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
      
      // Send response back through HTTP POST
      await this.sendResponse(requestId, message.sessionId, {
        statusCode: response.status,
        headers: responseHeaders,
        body: isBinary ? responseBuffer.toString('base64') : responseBody,
        bodyLength: responseBuffer.length,
        isBase64: isBinary
      });
      
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
      
      // Send error response
      const errorBody = JSON.stringify({
        error: 'Bad Gateway',
        message: 'Tunnel client failed to forward request',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      
      await this.sendResponse(requestId, message.sessionId, {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: errorBody,
        bodyLength: errorBody.length,
        isBase64: false
      });
    }
  }
  
  /**
   * Send response back to server via HTTP POST
   */
  async sendResponse(requestId, sessionId, response) {
    const responseUrl = `${this.config.tunnelServerUrl}/tunnel/response`;
    
    try {
      const result = await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          sessionId,
          response
        })
      });
      
      if (!result.ok) {
        const error = await result.text();
        console.error(`❌ Failed to send response: ${error}`);
      } else {
        console.log(`📤 Response sent for ${requestId}`);
      }
    } catch (error) {
      console.error(`❌ Error sending response: ${error.message}`);
    }
  }
  
  /**
   * Check if content is binary
   */
  isBinaryContent(contentType, buffer) {
    const binaryTypes = [
      'image/', 'video/', 'audio/', 'application/octet-stream',
      'application/pdf', 'application/zip', 'application/gzip'
    ];
    
    if (binaryTypes.some(type => contentType.includes(type))) {
      return true;
    }
    
    if (buffer.length > 0) {
      const sample = buffer.slice(0, Math.min(512, buffer.length));
      const nonTextBytes = sample.filter(byte => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13).length;
      return (nonTextBytes / sample.length) > 0.3;
    }
    
    return false;
  }
  
  /**
   * Handle disconnection and reconnection
   */
  handleDisconnection() {
    this.isConnected = false;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
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
   * Log current statistics
   */
  logStats() {
    const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
    const successRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) 
      : 0;
    
    console.log('📊 SSE Tunnel Client Stats:');
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
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    this.logStats();
    
    console.log('👋 SSE tunnel client shutdown complete');
    process.exit(0);
  }
}

// Start the SSE tunnel client
const client = new SSETunnelClient({
  tunnelServerUrl: process.env.TUNNEL_SERVER_URL || 'http://localhost:8787',
  targetAppUrl: process.env.TARGET_APP_URL || 'https://wingman-test-app.fly.dev',
  sessionId: process.env.SESSION_ID || 'test-tunnel'
});

// Start monitoring stats
setInterval(() => {
  client.logStats();
}, 60000);

client.start().catch(error => {
  console.error('❌ Failed to start SSE tunnel client:', error);
  process.exit(1);
});