import type { WebSocket } from 'ws';

export interface ProxiedRequest {
  id: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ProxiedResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: any;
}

interface PendingRequest {
  resolve: (response: ProxiedResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  sessionId: string; // Track which session owns this request
  createdAt: number; // Track when request was created for cleanup
}

export interface P2PSignalingMessage {
  type: 'p2p:offer' | 'p2p:answer' | 'p2p:ice-candidate' | 'p2p:ready' | 'p2p:failed';
  sessionId: string;
  from: 'developer' | 'pm';
  data?: any;
}

/**
 * ConnectionManager with proper memory management and resource cleanup
 * Fixes memory leaks identified in performance review
 */
export class ConnectionManager {
  private connections = new Map<string, WebSocket>();
  private pmConnections = new Map<string, WebSocket>();
  private pendingRequests = new Map<string, PendingRequest>();
  private requestsBySession = new Map<string, Set<string>>(); // Track requests per session
  private requestTimeout = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout;
  private maxRequestAge = 60000; // 1 minute - max age before forced cleanup
  
  constructor() {
    // Start periodic cleanup of stale requests
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, 30000); // Run every 30 seconds
  }

  /**
   * Clean up old/stale requests to prevent memory leaks
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    const staleRequests: string[] = [];
    
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      if (now - pending.createdAt > this.maxRequestAge) {
        staleRequests.push(requestId);
      }
    }
    
    for (const requestId of staleRequests) {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Request expired'));
        this.pendingRequests.delete(requestId);
        
        // Remove from session tracking
        const sessionRequests = this.requestsBySession.get(pending.sessionId);
        if (sessionRequests) {
          sessionRequests.delete(requestId);
          if (sessionRequests.size === 0) {
            this.requestsBySession.delete(pending.sessionId);
          }
        }
      }
    }
    
    if (staleRequests.length > 0) {
      console.log(`[ConnectionManager] Cleaned up ${staleRequests.length} stale requests`);
    }
  }

  /**
   * Register a developer connection for a session
   */
  registerDeveloper(sessionId: string, ws: WebSocket): void {
    // Close existing connection if any
    const existing = this.connections.get(sessionId);
    if (existing) {
      existing.close();
    }

    this.connections.set(sessionId, ws);
    
    // Initialize request tracking for this session
    if (!this.requestsBySession.has(sessionId)) {
      this.requestsBySession.set(sessionId, new Set());
    }
    
    // Setup connection handlers
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'response') {
          this.handleResponse(sessionId, message);
        }
      } catch (error) {
        console.error('Error handling developer message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      this.handleDisconnection(sessionId);
    });

    console.log(`Developer registered for session ${sessionId}`);
  }

  /**
   * Remove a developer connection with proper cleanup
   */
  unregisterDeveloper(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (ws) {
      // Remove all event listeners to prevent memory leaks
      ws.removeAllListeners('message');
      ws.removeAllListeners('close');
      ws.removeAllListeners('error');
      this.connections.delete(sessionId);
    }
  }

  /**
   * Register a PM connection for a session
   */
  registerPM(sessionId: string, ws: WebSocket): void {
    // Close existing PM connection if any
    const existing = this.pmConnections.get(sessionId);
    if (existing) {
      existing.close();
    }

    this.pmConnections.set(sessionId, ws);
    
    // Setup PM connection handlers
    ws.on('close', () => {
      this.unregisterPM(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`PM WebSocket error for session ${sessionId}:`, error);
      this.unregisterPM(sessionId);
    });

    console.log(`PM registered for session ${sessionId}`);
  }

  /**
   * Remove a PM connection with proper cleanup
   */
  unregisterPM(sessionId: string): void {
    const ws = this.pmConnections.get(sessionId);
    if (ws) {
      // Remove all event listeners
      ws.removeAllListeners('close');
      ws.removeAllListeners('error');
      this.pmConnections.delete(sessionId);
    }
    console.log(`PM unregistered for session ${sessionId}`);
  }

  /**
   * Check if a developer is connected for a session
   */
  isConnected(sessionId: string): boolean {
    const ws = this.connections.get(sessionId);
    return ws !== undefined && ws.readyState === 1; // WebSocket.OPEN
  }

  /**
   * Check if P2P is available (both developer and PM connected)
   */
  isP2PAvailable(sessionId: string): boolean {
    const devWs = this.connections.get(sessionId);
    const pmWs = this.pmConnections.get(sessionId);
    
    return devWs !== undefined && 
           devWs.readyState === 1 &&
           pmWs !== undefined && 
           pmWs.readyState === 1;
  }

  /**
   * Forward a request to the developer with proper tracking
   */
  async forwardRequest(sessionId: string, request: ProxiedRequest): Promise<ProxiedResponse> {
    const ws = this.connections.get(sessionId);
    
    if (!ws || ws.readyState !== 1) {
      throw new Error('Developer not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = request.id;
      
      // Set up timeout for request
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.removeRequestFromSession(sessionId, requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      // Store pending request with session tracking
      this.pendingRequests.set(requestId, { 
        resolve, 
        reject, 
        timeout,
        sessionId,
        createdAt: Date.now()
      });
      
      // Track request for this session
      let sessionRequests = this.requestsBySession.get(sessionId);
      if (!sessionRequests) {
        sessionRequests = new Set();
        this.requestsBySession.set(sessionId, sessionRequests);
      }
      sessionRequests.add(requestId);

      // Send request to developer
      ws.send(JSON.stringify({
        type: 'request',
        request
      }));
    });
  }

  /**
   * Handle response from developer
   */
  handleResponse(sessionId: string, message: any): void {
    const { requestId, response } = message;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      this.removeRequestFromSession(sessionId, requestId);
      pending.resolve(response);
    }
  }

  /**
   * Handle developer disconnection with proper cleanup
   * FIXED: Only clears requests for the disconnected session
   */
  handleDisconnection(sessionId: string): void {
    this.unregisterDeveloper(sessionId);
    
    // Only reject requests for this specific session
    const sessionRequests = this.requestsBySession.get(sessionId);
    if (sessionRequests) {
      for (const requestId of sessionRequests) {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Developer disconnected'));
          this.pendingRequests.delete(requestId);
        }
      }
      this.requestsBySession.delete(sessionId);
    }
    
    console.log(`Developer disconnected for session ${sessionId}`);
  }

  /**
   * Remove a request from session tracking
   */
  private removeRequestFromSession(sessionId: string, requestId: string): void {
    const sessionRequests = this.requestsBySession.get(sessionId);
    if (sessionRequests) {
      sessionRequests.delete(requestId);
      if (sessionRequests.size === 0) {
        this.requestsBySession.delete(sessionId);
      }
    }
  }

  /**
   * Handle P2P signaling messages
   */
  handleP2PSignaling(message: P2PSignalingMessage): void {
    const { sessionId, from } = message;
    
    // Route message to appropriate recipient
    if (from === 'developer') {
      // Send to PM
      const pmWs = this.pmConnections.get(sessionId);
      if (pmWs && pmWs.readyState === 1) {
        pmWs.send(JSON.stringify(message));
        console.log(`Relayed P2P signaling from developer to PM for session ${sessionId}`);
      }
    } else if (from === 'pm') {
      // Send to developer
      const devWs = this.connections.get(sessionId);
      if (devWs && devWs.readyState === 1) {
        devWs.send(JSON.stringify(message));
        console.log(`Relayed P2P signaling from PM to developer for session ${sessionId}`);
      }
    }
  }

  /**
   * Initiate P2P connection between developer and PM
   */
  initiateP2P(sessionId: string): void {
    const devWs = this.connections.get(sessionId);
    const pmWs = this.pmConnections.get(sessionId);
    
    if (devWs && devWs.readyState === 1) {
      devWs.send(JSON.stringify({
        type: 'p2p:initiate',
        sessionId,
        role: 'developer'
      }));
    }
    
    if (pmWs && pmWs.readyState === 1) {
      pmWs.send(JSON.stringify({
        type: 'p2p:initiate',
        sessionId,
        role: 'pm'
      }));
    }
    
    console.log(`Initiated P2P connection for session ${sessionId}`);
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all pending requests
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection manager shutting down'));
    }
    this.pendingRequests.clear();
    this.requestsBySession.clear();
    
    // Close all connections
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();
    
    for (const ws of this.pmConnections.values()) {
      ws.close();
    }
    this.pmConnections.clear();
  }
}