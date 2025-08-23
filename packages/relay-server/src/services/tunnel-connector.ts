import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { P2PHost } from './p2p-host.js';

interface TunnelConnectorOptions {
  sessionId: string;
  targetPort: number;
  tunnelUrl: string;
  developerId: string;
  enableP2P?: boolean;
  debug?: boolean;
}

/**
 * Connects relay-server to tunnel-server via WebSocket
 * Handles both relay mode and P2P mode
 */
export class TunnelConnector extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private targetPort: number;
  private tunnelUrl: string;
  private developerId: string;
  private enableP2P: boolean;
  private debug: boolean;
  private p2pHost: P2PHost | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(options: TunnelConnectorOptions) {
    super();
    this.sessionId = options.sessionId;
    this.targetPort = options.targetPort;
    this.tunnelUrl = options.tunnelUrl;
    this.developerId = options.developerId;
    this.enableP2P = options.enableP2P !== false;
    this.debug = options.debug || false;
  }

  /**
   * Connect to tunnel server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert HTTP URL to WebSocket URL
        const wsUrl = this.tunnelUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const fullWsUrl = `${wsUrl}/ws`;
        
        this.log(`Connecting to tunnel server: ${fullWsUrl}`);
        
        this.ws = new WebSocket(fullWsUrl);
        
        this.ws.on('open', () => {
          this.log('Connected to tunnel server');
          this.isConnected = true;
          
          // Register as developer
          this.ws!.send(JSON.stringify({
            type: 'register',
            role: 'developer',
            sessionId: this.sessionId
          }));
          
          resolve();
        });
        
        this.ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            await this.handleMessage(message);
          } catch (error) {
            this.error('Error handling message:', error);
          }
        });
        
        this.ws.on('close', () => {
          this.log('Disconnected from tunnel server');
          this.isConnected = false;
          this.emit('disconnected');
          
          // Attempt reconnect after delay
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect().catch(err => {
                this.error('Reconnect failed:', err);
              });
            }, 5000);
          }
        });
        
        this.ws.on('error', (error) => {
          this.error('WebSocket error:', error);
          this.emit('error', error);
          
          // If not connected yet, reject the promise
          if (!this.isConnected) {
            reject(error);
          }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from tunnel server
   */
  private async handleMessage(message: any): Promise<void> {
    this.log('Received message:', message.type);
    
    switch (message.type) {
      case 'registered':
        this.log(`Registered as ${message.role} for session ${message.sessionId}`);
        this.emit('registered', message);
        break;
        
      case 'request':
        // Handle HTTP request forwarding (relay mode)
        await this.handleHttpRequest(message);
        break;
        
      case 'websocket-connect':
        // Handle WebSocket connection request
        this.emit('websocket-connect', message);
        break;
        
      case 'websocket-message':
        // Handle WebSocket message
        this.emit('websocket-message', message);
        break;
        
      case 'websocket-close':
        // Handle WebSocket close
        this.emit('websocket-close', message);
        break;
        
      case 'p2p:initiate':
        // Initialize P2P connection
        if (this.enableP2P) {
          await this.initializeP2P(message);
        }
        break;
        
      case 'p2p:offer':
      case 'p2p:answer':
      case 'p2p:ice-candidate':
        // Handle P2P signaling
        if (this.p2pHost) {
          this.handleP2PSignaling(message);
        }
        break;
        
      case 'ping':
        this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      default:
        this.log('Unknown message type:', message.type);
    }
  }

  /**
   * Handle HTTP request in relay mode
   */
  private async handleHttpRequest(message: any): Promise<void> {
    const { requestId, request } = message;
    
    try {
      // Forward to localhost
      const response = await this.forwardToLocalhost(request);
      
      // Send response back
      this.ws?.send(JSON.stringify({
        type: 'response',
        requestId: requestId,
        response: response
      }));
    } catch (error: any) {
      this.error('Error handling request:', error);
      
      // Send error response
      this.ws?.send(JSON.stringify({
        type: 'response',
        requestId: requestId,
        response: {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
          body: `Error: ${error.message}`
        }
      }));
    }
  }

  /**
   * Forward request to localhost (used in relay mode)
   */
  private async forwardToLocalhost(request: any): Promise<any> {
    // This is a simplified version - in production you'd use http/https modules
    const fetch = (await import('node-fetch')).default;
    
    const url = `http://localhost:${this.targetPort}${request.path}`;
    
    try {
      const response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      const body = await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize P2P host
   */
  private async initializeP2P(message: any): Promise<void> {
    if (this.p2pHost) {
      this.log('P2P already initialized');
      return;
    }
    
    this.log('Initializing P2P host');
    
    // Create P2P host
    this.p2pHost = new P2PHost({
      localPort: this.targetPort,
      sessionId: this.sessionId,
      debug: this.debug
    });
    
    // Listen for signaling data
    this.p2pHost.on('signal', (data) => {
      this.sendP2PSignal(data);
    });
    
    // Listen for connection events
    this.p2pHost.on('connected', () => {
      this.log('P2P connection established');
      this.sendP2PSignal({ type: 'ready' });
      this.emit('p2p-connected');
    });
    
    this.p2pHost.on('disconnected', () => {
      this.log('P2P connection lost');
      this.emit('p2p-disconnected');
    });
    
    this.p2pHost.on('error', (error) => {
      this.error('P2P error:', error);
      this.sendP2PSignal({ type: 'failed', error: error.message });
    });
    
    // Initialize P2P connection
    const success = await this.p2pHost.init(message.role === 'developer');
    
    if (!success) {
      this.error('Failed to initialize P2P');
      this.p2pHost = null;
    }
  }

  /**
   * Handle P2P signaling messages
   */
  private handleP2PSignaling(message: any): void {
    if (!this.p2pHost) {
      this.log('P2P not initialized, cannot handle signaling');
      return;
    }
    
    this.p2pHost.signal(message.data);
  }

  /**
   * Send P2P signaling data
   */
  private sendP2PSignal(data: any): void {
    if (!this.ws || !this.isConnected) {
      this.error('Cannot send P2P signal - not connected');
      return;
    }
    
    let type = 'p2p:ice-candidate';
    if (data.type === 'offer') {
      type = 'p2p:offer';
    } else if (data.type === 'answer') {
      type = 'p2p:answer';
    } else if (data.type === 'ready') {
      type = 'p2p:ready';
    } else if (data.type === 'failed') {
      type = 'p2p:failed';
    }
    
    this.ws.send(JSON.stringify({
      type: type,
      sessionId: this.sessionId,
      data: data
    }));
  }

  /**
   * Check if P2P is connected
   */
  isP2PConnected(): boolean {
    return this.p2pHost?.isP2PConnected() || false;
  }

  /**
   * Get connection mode
   */
  getConnectionMode(): 'p2p' | 'relay' | 'disconnected' {
    if (this.isP2PConnected()) {
      return 'p2p';
    } else if (this.isConnected) {
      return 'relay';
    } else {
      return 'disconnected';
    }
  }

  /**
   * Disconnect from tunnel server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.p2pHost) {
      this.p2pHost.cleanup();
      this.p2pHost = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Log message (if debug enabled)
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[TunnelConnector]', ...args);
    }
  }

  /**
   * Log error
   */
  private error(...args: any[]): void {
    console.error('[TunnelConnector]', ...args);
  }
}

export default TunnelConnector;