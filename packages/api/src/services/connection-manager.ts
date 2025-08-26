import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { createLogger } from '@wingman/shared';

export interface P2PSignalingMessage {
  type: string;
  sessionId: string;
  from: 'developer' | 'pm';
  data: any;
}

interface PendingRequest {
  requestId: string;
  ws: WebSocket;
  timestamp: number;
}

/**
 * Manages WebSocket connections between developers and product managers.
 * Handles both relay mode (forwarding requests) and P2P signaling.
 */
export class ConnectionManager extends EventEmitter {
  private developers: Map<string, WebSocket> = new Map();
  private pms: Map<string, WebSocket> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private logger = createLogger('Wingman:ConnectionManager');

  constructor() {
    super();
    // Clean up old pending requests periodically to prevent memory leaks
    setInterval(() => this.cleanupPendingRequests(), 30000);
  }

  registerDeveloper(sessionId: string, ws: WebSocket): void {
    this.developers.set(sessionId, ws);
    this.logger.info(`Developer registered for session ${sessionId}`);
    this.emit('developer-connected', sessionId);
  }

  registerPM(sessionId: string, ws: WebSocket): void {
    this.pms.set(sessionId, ws);
    this.logger.info(`PM registered for session ${sessionId}`);
    this.emit('pm-connected', sessionId);
  }

  unregisterDeveloper(sessionId: string): void {
    this.developers.delete(sessionId);
    this.logger.info(`Developer unregistered for session ${sessionId}`);
    this.emit('developer-disconnected', sessionId);
  }

  unregisterPM(sessionId: string): void {
    this.pms.delete(sessionId);
    this.logger.info(`PM unregistered for session ${sessionId}`);
    this.emit('pm-disconnected', sessionId);
  }

  getDeveloperConnection(sessionId: string): WebSocket | undefined {
    return this.developers.get(sessionId);
  }

  getPMConnection(sessionId: string): WebSocket | undefined {
    return this.pms.get(sessionId);
  }

  /**
   * Check if both developer and PM are connected for P2P negotiation
   */
  isP2PAvailable(sessionId: string): boolean {
    return this.developers.has(sessionId) && this.pms.has(sessionId);
  }

  initiateP2P(sessionId: string): void {
    const developerWs = this.developers.get(sessionId);
    const pmWs = this.pms.get(sessionId);

    if (!developerWs || !pmWs) {
      this.logger.warn(`Cannot initiate P2P for session ${sessionId}: missing connections`);
      return;
    }

    this.logger.info(`Initiating P2P for session ${sessionId}`);

    // Notify both parties to start P2P negotiation
    const initiateMessage = JSON.stringify({
      type: 'p2p:initiate',
      sessionId,
      role: 'developer'
    });

    developerWs.send(initiateMessage);
    pmWs.send(JSON.stringify({
      type: 'p2p:initiate',
      sessionId,
      role: 'pm'
    }));
  }

  handleP2PSignaling(message: P2PSignalingMessage): void {
    const { sessionId, from } = message;
    
    // Forward signaling to the other party
    const targetWs = from === 'developer' 
      ? this.pms.get(sessionId)
      : this.developers.get(sessionId);

    if (!targetWs) {
      this.logger.warn(`Cannot forward P2P signaling for session ${sessionId}: target not connected`);
      return;
    }

    targetWs.send(JSON.stringify(message));
  }

  /**
   * Forward HTTP request to developer via WebSocket (relay mode).
   * Returns a promise that resolves with the response from the developer.
   */
  forwardRequest(sessionId: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const developerWs = this.developers.get(sessionId);
      
      if (!developerWs) {
        reject(new Error('Developer not connected'));
        return;
      }

      const requestId = Math.random().toString(36).substring(7);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        requestId,
        ws: developerWs,
        timestamp: Date.now()
      });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      // Listen for response
      const handleResponse = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'response' && message.requestId === requestId) {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);
            developerWs.off('message', handleResponse);
            resolve(message.response);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      developerWs.on('message', handleResponse);

      // Send request
      developerWs.send(JSON.stringify({
        type: 'request',
        requestId,
        request
      }));
    });
  }

  /**
   * Handle response from developer.
   * Note: Currently handled inline in forwardRequest for simplicity.
   */
  handleResponse(sessionId: string, message: any): void {
    // This is handled inline in forwardRequest for simplicity
    this.logger.debug(`Received response for session ${sessionId}:`, message.requestId);
  }

  handleDisconnection(sessionId: string): void {
    this.unregisterDeveloper(sessionId);
    
    // Notify PM if connected
    const pmWs = this.pms.get(sessionId);
    if (pmWs) {
      pmWs.send(JSON.stringify({
        type: 'developer-disconnected',
        sessionId
      }));
    }
  }

  private cleanupPendingRequests(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > timeout) {
        this.pendingRequests.delete(requestId);
      }
    }
  }

  // Get connection statistics
  getStats(): { developers: number; pms: number; pendingRequests: number } {
    return {
      developers: this.developers.size,
      pms: this.pms.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}