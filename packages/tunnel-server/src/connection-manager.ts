import type { WebSocket } from 'ws';

interface ProxiedRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string | string[]>;
  body: string | null;
}

interface ProxiedResponse {
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
}

interface PendingRequest {
  resolve: (response: ProxiedResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Manages WebSocket connections from developers and handles request forwarding
 */
export class ConnectionManager {
  private connections = new Map<string, WebSocket>();
  private pendingRequests = new Map<string, PendingRequest>();
  private requestTimeout = 30000; // 30 seconds default

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
   * Remove a developer connection
   */
  unregisterDeveloper(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (ws) {
      ws.removeAllListeners();
      this.connections.delete(sessionId);
    }
  }

  /**
   * Check if a developer is connected for a session
   */
  isConnected(sessionId: string): boolean {
    const ws = this.connections.get(sessionId);
    return ws !== undefined && ws.readyState === 1; // WebSocket.OPEN
  }

  /**
   * Get connection for a session
   */
  getConnection(sessionId: string): WebSocket | null {
    return this.connections.get(sessionId) || null;
  }

  /**
   * Forward a request to the developer
   */
  async forwardRequest(sessionId: string, request: ProxiedRequest): Promise<ProxiedResponse> {
    const ws = this.connections.get(sessionId);
    
    if (!ws || ws.readyState !== 1) {
      throw new Error('Developer not connected');
    }

    const requestId = Math.random().toString(36).substr(2, 9);
    
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      // Send request to developer
      ws.send(JSON.stringify({
        type: 'request',
        requestId,
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
      pending.resolve(response);
    }
  }

  /**
   * Handle developer disconnection
   */
  handleDisconnection(sessionId: string): void {
    this.unregisterDeveloper(sessionId);
    
    // Reject all pending requests for this session
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      // In a real implementation, we'd track which requests belong to which session
      clearTimeout(pending.timeout);
      pending.reject(new Error('Developer disconnected'));
    }
    // Clear all for now (would need session tracking in production)
    this.pendingRequests.clear();
    
    console.log(`Developer disconnected for session ${sessionId}`);
  }

  /**
   * Get list of active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.connections.keys()).filter(sessionId => 
      this.isConnected(sessionId)
    );
  }

  /**
   * Broadcast message to all connected developers
   */
  broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    
    for (const [sessionId, ws] of this.connections.entries()) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
      }
    }
  }

  /**
   * Set request timeout
   */
  setRequestTimeout(timeout: number): void {
    this.requestTimeout = timeout;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeSessions: string[];
    pendingRequests: number;
  } {
    return {
      totalConnections: this.connections.size,
      activeSessions: this.getActiveSessions(),
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Forward WebSocket connection
   */
  async forwardWebSocket(sessionId: string, clientWs: WebSocket): Promise<void> {
    const developerWs = this.connections.get(sessionId);
    
    if (!developerWs || developerWs.readyState !== 1) {
      clientWs.close(1001, 'Developer not connected');
      return;
    }

    // Notify developer of new WebSocket connection
    developerWs.send(JSON.stringify({
      type: 'websocket-connect',
      sessionId
    }));

    // Forward messages bidirectionally
    clientWs.on('message', (data) => {
      if (developerWs.readyState === 1) {
        developerWs.send(JSON.stringify({
          type: 'websocket-message',
          sessionId,
          data: data.toString()
        }));
      }
    });

    clientWs.on('close', () => {
      if (developerWs.readyState === 1) {
        developerWs.send(JSON.stringify({
          type: 'websocket-close',
          sessionId
        }));
      }
    });

    // Handle messages from developer
    const messageHandler = (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'websocket-reply' && message.sessionId === sessionId) {
          if (clientWs.readyState === 1) {
            clientWs.send(message.data);
          }
        }
      } catch (error) {
        console.error('Error forwarding WebSocket message:', error);
      }
    };

    developerWs.on('message', messageHandler);

    // Clean up when client disconnects
    clientWs.on('close', () => {
      developerWs.removeListener('message', messageHandler);
    });
  }
}