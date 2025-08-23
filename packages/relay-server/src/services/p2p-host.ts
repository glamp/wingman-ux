import SimplePeer from 'simple-peer';
import wrtc from '@roamhq/wrtc';
import { EventEmitter } from 'events';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface P2PHostOptions {
  localPort: number;
  sessionId: string;
  debug?: boolean;
}

interface ProxiedRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[]>;
  body: string | null;
}

interface ProxiedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  body: string;
}

/**
 * P2P Host that accepts WebRTC connections and forwards requests to localhost
 */
export class P2PHost extends EventEmitter {
  private localPort: number;
  private sessionId: string;
  private peer: SimplePeer.Instance | null = null;
  private isConnected = false;
  private debug: boolean;
  
  // STUN server configuration
  private rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  };

  constructor(options: P2PHostOptions) {
    super();
    this.localPort = options.localPort;
    this.sessionId = options.sessionId;
    this.debug = options.debug || false;
  }

  /**
   * Initialize P2P host
   * @param initiator - Whether this peer initiates the connection
   */
  async init(initiator = false): Promise<boolean> {
    try {
      this.log(`Initializing P2P host as ${initiator ? 'initiator' : 'responder'}`);
      
      // Create SimplePeer instance with Node.js WebRTC
      this.peer = new SimplePeer({
        initiator: initiator,
        wrtc: wrtc,
        config: this.rtcConfig,
        trickle: true,
        channelConfig: {
          label: 'wingman-data',
          ordered: true
        }
      });
      
      // Set up peer event handlers
      this.setupPeerHandlers();
      
      return true;
    } catch (error) {
      this.error('Failed to initialize P2P host:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerHandlers(): void {
    if (!this.peer) return;
    
    // Handle signaling data
    this.peer.on('signal', (data: any) => {
      this.log('Signal data:', data.type || 'ice-candidate');
      this.emit('signal', data);
    });
    
    // Handle connection established
    this.peer.on('connect', () => {
      this.log('P2P connection established');
      this.isConnected = true;
      this.emit('connected');
    });
    
    // Handle incoming data
    this.peer.on('data', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (error) {
        this.error('Error handling data:', error);
      }
    });
    
    // Handle errors
    this.peer.on('error', (error: Error) => {
      this.error('Peer connection error:', error);
      this.emit('error', error);
      this.cleanup();
    });
    
    // Handle connection close
    this.peer.on('close', () => {
      this.log('P2P connection closed');
      this.isConnected = false;
      this.emit('disconnected');
      this.cleanup();
    });
  }

  /**
   * Process signaling data from remote peer
   */
  signal(data: any): void {
    if (!this.peer) {
      this.error('Cannot signal - peer not initialized');
      return;
    }
    
    try {
      this.peer.signal(data);
    } catch (error) {
      this.error('Error processing signal:', error);
    }
  }

  /**
   * Handle incoming messages from data channel
   */
  private async handleMessage(message: any): Promise<void> {
    this.log('Received message:', message.type);
    
    switch (message.type) {
      case 'http-request':
        await this.handleHttpRequest(message);
        break;
      case 'websocket-connect':
        await this.handleWebSocketConnect(message);
        break;
      case 'websocket-message':
        await this.handleWebSocketMessage(message);
        break;
      case 'websocket-close':
        await this.handleWebSocketClose(message);
        break;
      case 'ping':
        this.send({ type: 'pong', timestamp: Date.now() });
        break;
      default:
        this.log('Unknown message type:', message.type);
    }
  }

  /**
   * Handle HTTP request forwarding
   */
  private async handleHttpRequest(message: any): Promise<void> {
    const { requestId, request } = message;
    
    try {
      // Forward request to localhost
      const response = await this.forwardToLocalhost(request);
      
      // Send response back through data channel
      this.send({
        type: 'http-response',
        requestId: requestId,
        response: response
      });
    } catch (error: any) {
      this.error('Error forwarding request:', error);
      
      // Send error response
      this.send({
        type: 'http-response',
        requestId: requestId,
        response: {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/plain' },
          body: `Failed to forward request: ${error.message}`
        }
      });
    }
  }

  /**
   * Forward request to localhost
   */
  private async forwardToLocalhost(request: ProxiedRequest): Promise<ProxiedResponse> {
    return new Promise((resolve, reject) => {
      const url = `http://localhost:${this.localPort}${request.path}`;
      this.log(`Forwarding ${request.method} ${url}`);
      
      const options = {
        method: request.method,
        headers: request.headers || {}
      };
      
      // Create request
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.request(url, options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          // Convert headers to plain object
          const headers: Record<string, string | string[]> = {};
          Object.keys(res.headers).forEach(key => {
            headers[key] = res.headers[key]!;
          });
          
          resolve({
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            headers: headers,
            body: body
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // Set timeout
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      // Send request body if present
      if (request.body) {
        req.write(request.body);
      }
      
      req.end();
    });
  }

  /**
   * Handle WebSocket connection (placeholder)
   */
  private async handleWebSocketConnect(message: any): Promise<void> {
    // TODO: Implement WebSocket proxying
    this.log('WebSocket connect request:', message);
    
    this.send({
      type: 'websocket-connected',
      sessionId: message.sessionId
    });
  }

  /**
   * Handle WebSocket message (placeholder)
   */
  private async handleWebSocketMessage(message: any): Promise<void> {
    // TODO: Implement WebSocket message forwarding
    this.log('WebSocket message:', message);
  }

  /**
   * Handle WebSocket close (placeholder)
   */
  private async handleWebSocketClose(message: any): Promise<void> {
    // TODO: Implement WebSocket close handling
    this.log('WebSocket close:', message);
  }

  /**
   * Send data through the data channel
   */
  private send(data: any): void {
    if (!this.peer || !this.isConnected) {
      this.error('Cannot send - not connected');
      return;
    }
    
    try {
      const message = JSON.stringify(data);
      this.peer.send(message);
    } catch (error) {
      this.error('Error sending data:', error);
    }
  }

  /**
   * Check if connected
   */
  isP2PConnected(): boolean {
    return this.isConnected && this.peer !== null && !this.peer.destroyed;
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<any> {
    if (!this.peer || !(this.peer as any)._pc) {
      return null;
    }
    
    try {
      const pc = (this.peer as any)._pc;
      const stats = await pc.getStats();
      const report: any = {};
      
      stats.forEach((stat: any) => {
        if (stat.type === 'data-channel') {
          report.dataChannel = {
            state: stat.state,
            messagesSent: stat.messagesSent,
            messagesReceived: stat.messagesReceived,
            bytesSent: stat.bytesSent,
            bytesReceived: stat.bytesReceived
          };
        } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          report.connection = {
            rtt: stat.currentRoundTripTime,
            localCandidate: stat.localCandidateId,
            remoteCandidate: stat.remoteCandidateId
          };
        }
      });
      
      return report;
    } catch (error) {
      this.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Clean up peer connection
   */
  cleanup(): void {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        this.error('Error destroying peer:', error);
      }
      this.peer = null;
    }
    
    this.isConnected = false;
    this.removeAllListeners();
  }

  /**
   * Log message (if debug enabled)
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[P2PHost]', ...args);
    }
  }

  /**
   * Log error
   */
  private error(...args: any[]): void {
    console.error('[P2PHost]', ...args);
  }
}

export default P2PHost;