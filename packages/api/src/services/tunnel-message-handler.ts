/**
 * TunnelMessageHandler - Handles WebSocket message routing and processing
 * 
 * This class manages WebSocket connections, message validation, and routing
 * for the tunnel protocol between server and Chrome extension
 */

import WebSocket from 'ws';
import { 
  TunnelMessage, 
  TunnelRequest, 
  TunnelResponse, 
  RegisterMessage,
  RegisteredMessage,
  HeartbeatMessage,
  ErrorMessage,
  ProtocolUtils,
  ProtocolErrorCode,
  isRequest,
  isResponse,
  isRegister
} from '@wingman/shared';
import { RequestResponseManager } from './request-response-manager';
import { createLogger } from '@wingman/shared';

const logger = createLogger('TunnelMessageHandler');

export interface TunnelMessageHandlerConfig {
  onRequest: (request: TunnelRequest) => Promise<TunnelResponse>;
  onError: (error: Error, sessionId?: string) => void;
  requestTimeoutMs: number;
  tunnelBaseUrl?: string;
}

interface TunnelSession {
  sessionId: string;
  role: 'developer' | 'pm';
  websocket: WebSocket;
  targetPort?: number;
  tunnelUrl?: string;
  registeredAt: number;
}

export class TunnelMessageHandler {
  private config: TunnelMessageHandlerConfig;
  private sessions = new Map<string, TunnelSession>();
  private websocketToSession = new Map<WebSocket, string>();
  private requestManager: RequestResponseManager;

  constructor(config: TunnelMessageHandlerConfig) {
    this.config = config;
    
    // Initialize request-response manager
    this.requestManager = new RequestResponseManager({
      requestTimeoutMs: config.requestTimeoutMs,
      onTimeout: (requestId: string, error: Error) => {
        logger.warn(`Request ${requestId} timed out:`, error.message);
        this.config.onError(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(websocket: WebSocket, rawMessage: string): void {
    try {
      // Parse JSON message
      const message: TunnelMessage = JSON.parse(rawMessage);
      
      // Validate message structure
      if (!ProtocolUtils.validateMessage(message)) {
        this.sendError(websocket, ProtocolErrorCode.INVALID_MESSAGE, 'Invalid message structure');
        return;
      }

      // Route message based on type
      this.routeMessage(websocket, message);
      
    } catch (error) {
      logger.error('Failed to parse message:', error);
      this.sendError(websocket, ProtocolErrorCode.INVALID_MESSAGE, 'Invalid JSON message');
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  handleDisconnect(websocket: WebSocket): void {
    const sessionId = this.websocketToSession.get(websocket);
    if (sessionId) {
      logger.info(`Session ${sessionId} disconnected`);
      
      // Cancel all pending requests for this session
      this.requestManager.cancelRequestsForSession(sessionId);
      
      // Remove session
      this.sessions.delete(sessionId);
      this.websocketToSession.delete(websocket);
    }
  }

  /**
   * Add a pending request (for outbound requests from server to extension)
   */
  addPendingRequest(request: TunnelRequest): Promise<TunnelResponse> {
    return this.requestManager.addPendingRequest(request);
  }

  /**
   * Check if session is active
   */
  hasActiveSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get count of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Cleanup all sessions and resources
   */
  async cleanup(): Promise<void> {
    // Cancel all pending requests
    this.requestManager.cleanup();
    
    // Close all WebSocket connections
    for (const [sessionId, session] of this.sessions) {
      try {
        if (session.websocket.readyState === WebSocket.OPEN) {
          session.websocket.close();
        }
      } catch (error) {
        logger.error(`Failed to close WebSocket for session ${sessionId}:`, error);
      }
    }
    
    // Clear all sessions
    this.sessions.clear();
    this.websocketToSession.clear();
  }

  /**
   * Route message to appropriate handler
   */
  private routeMessage(websocket: WebSocket, message: TunnelMessage): void {
    switch (message.type) {
      case 'register':
        this.handleRegister(websocket, message as RegisterMessage);
        break;
        
      case 'request':
        this.handleRequest(websocket, message as TunnelRequest);
        break;
        
      case 'response':
        this.handleResponse(websocket, message as TunnelResponse);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(websocket, message as HeartbeatMessage);
        break;
        
      case 'disconnect':
        this.handleDisconnect(websocket);
        break;
        
      default:
        this.sendError(websocket, ProtocolErrorCode.INVALID_MESSAGE, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle session registration
   */
  private handleRegister(websocket: WebSocket, message: RegisterMessage): void {
    const { sessionId, role, targetPort } = message;
    
    // Check for duplicate session ID
    if (this.sessions.has(sessionId)) {
      const error = new Error(`Session ${sessionId} already exists`);
      this.config.onError(error, sessionId);
      return;
    }

    // Generate tunnel URL
    const tunnelUrl = this.generateTunnelUrl(sessionId, targetPort);
    
    // Create session
    const session: TunnelSession = {
      sessionId,
      role,
      websocket,
      tunnelUrl,
      registeredAt: Date.now()
    };
    
    // Add targetPort if defined
    if (targetPort !== undefined) {
      session.targetPort = targetPort;
    }
    
    // Store session mappings
    this.sessions.set(sessionId, session);
    this.websocketToSession.set(websocket, sessionId);
    
    // Send registration confirmation
    const response: RegisteredMessage = {
      type: 'registered',
      sessionId,
      role,
      tunnelUrl,
      timestamp: Date.now()
    };
    
    this.sendMessage(websocket, response);
    
    logger.info(`Session ${sessionId} registered as ${role}${targetPort ? ` targeting port ${targetPort}` : ''}`);
  }

  /**
   * Handle incoming request (from extension to server)
   */
  private handleRequest(websocket: WebSocket, message: TunnelRequest): void {
    const { sessionId } = message;
    
    // Verify session exists
    if (!this.sessions.has(sessionId)) {
      this.sendError(websocket, ProtocolErrorCode.UNKNOWN_SESSION, `Unknown session: ${sessionId}`, sessionId);
      return;
    }

    // Process request asynchronously
    this.processRequest(message).catch(error => {
      logger.error(`Failed to process request ${message.id}:`, error);
      
      // Send error response
      const errorResponse: TunnelResponse = {
        type: 'response',
        id: message.id,
        sessionId: message.sessionId,
        status: 500,
        headers: {},
        error: error.message,
        timestamp: Date.now()
      };
      
      this.sendMessage(websocket, errorResponse);
    });
  }

  /**
   * Handle incoming response (from extension to server) 
   */
  private handleResponse(websocket: WebSocket, message: TunnelResponse): void {
    // Forward response to pending request
    this.requestManager.resolveRequest(message.id, message);
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(websocket: WebSocket, message: HeartbeatMessage): void {
    // Send pong response
    const pong: HeartbeatMessage = {
      type: 'pong',
      sessionId: message.sessionId,
      timestamp: Date.now()
    };
    
    this.sendMessage(websocket, pong);
  }

  /**
   * Process request through configured handler
   */
  private async processRequest(request: TunnelRequest): Promise<void> {
    try {
      const response = await this.config.onRequest(request);
      
      // Get session WebSocket to send response
      const session = this.sessions.get(request.sessionId);
      if (session) {
        this.sendMessage(session.websocket, response);
      }
      
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(websocket: WebSocket, message: TunnelMessage): void {
    if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(message));
    } else {
      logger.warn('Attempted to send message to closed WebSocket');
    }
  }

  /**
   * Send error message
   */
  private sendError(
    websocket: WebSocket, 
    code: ProtocolErrorCode, 
    message: string, 
    sessionId?: string
  ): void {
    const error: ErrorMessage = ProtocolUtils.createError(code, message, sessionId);
    this.sendMessage(websocket, error);
  }

  /**
   * Generate tunnel URL for session
   */
  private generateTunnelUrl(sessionId: string, targetPort?: number): string {
    const baseUrl = this.config.tunnelBaseUrl || 'localhost:8787';
    
    if (targetPort) {
      // For developer tunnels, use subdomain pattern
      return `http://${sessionId}.${baseUrl}`;
    } else {
      // For PM/viewer tunnels, use path pattern
      return `http://${baseUrl}/tunnel/${sessionId}`;
    }
  }
}