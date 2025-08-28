/**
 * WebSocketManager - Manages persistent WebSocket connections for Chrome extension
 * 
 * This class handles the WebSocket connection to the tunnel server,
 * including automatic reconnection, message handling, and session management
 */

import { TunnelMessage, RegisterMessage, RegisteredMessage, HeartbeatMessage, ProtocolUtils, ProtocolErrorCode, isError } from '@wingman/shared';

export interface WebSocketManagerConfig {
  serverUrl: string;
  onMessage: (message: TunnelMessage) => void;
  onError: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface SessionInfo {
  sessionId: string;
  tunnelUrl?: string;
  connectedAt: number;
}

export class WebSocketManager {
  private config: WebSocketManagerConfig;
  private websocket: WebSocket | null = null;
  private sessionId: string | null = null;
  private tunnelUrl: string | null = null;
  private isManuallyDisconnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageQueue: TunnelMessage[] = [];

  constructor(config: WebSocketManagerConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };

    // Generate session ID
    this.sessionId = this.generateSessionId();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.isManuallyDisconnected = false;

    try {
      await this.establishConnection();
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      this.config.onError(error as Error);
      
      // Attempt reconnection if not manually disconnected
      if (!this.isManuallyDisconnected && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
        this.scheduleReconnection();
      }
      
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    this.isManuallyDisconnected = true;
    this.clearReconnectionTimer();
    this.clearHeartbeatTimer();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message: TunnelMessage): void {
    if (this.isConnected() && this.websocket) {
      this.websocket.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get tunnel URL
   */
  getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.serverUrl);

      const connectionTimeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected to', this.config.serverUrl);
        
        this.websocket = ws;
        this.reconnectAttempts = 0;
        
        this.setupEventListeners();
        this.registerSession();
        this.startHeartbeat();
        this.sendQueuedMessages();
        
        resolve();
      };

      ws.onerror = (event) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket connection error:', event);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (!this.isManuallyDisconnected) {
          console.log('WebSocket disconnected, code:', event.code);
          this.handleDisconnection();
        }
      };
    });
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.websocket) return;

    this.websocket.onmessage = (event) => {
      try {
        const message: TunnelMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.config.onError(new Error(`Invalid WebSocket message: ${event.data}`));
      }
    };

    this.websocket.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.config.onError(new Error('WebSocket error occurred'));
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (!this.isManuallyDisconnected) {
        this.handleDisconnection();
      }
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleIncomingMessage(message: TunnelMessage): void {
    // Handle protocol-level messages
    switch (message.type) {
      case 'registered':
        this.handleRegistrationResponse(message as RegisteredMessage);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(message as HeartbeatMessage);
        break;
        
      case 'error':
        this.handleServerError(message);
        break;
        
      default:
        // Forward other messages to handler
        this.config.onMessage(message);
    }
  }

  /**
   * Handle session registration response
   */
  private handleRegistrationResponse(message: RegisteredMessage): void {
    this.tunnelUrl = message.tunnelUrl || null;
    
    console.log(`Session ${this.sessionId} registered as ${message.role}`);
    if (this.tunnelUrl) {
      console.log('Tunnel URL:', this.tunnelUrl);
    }

    // Store session info in Chrome storage
    this.storeSessionInfo();
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(message: HeartbeatMessage): void {
    // Respond with pong
    const pong: HeartbeatMessage = {
      type: 'pong',
      sessionId: this.sessionId!,
      timestamp: Date.now()
    };
    
    this.sendMessage(pong);
  }

  /**
   * Handle server error message
   */
  private handleServerError(message: TunnelMessage): void {
    if (isError(message)) {
      const error = new Error(`Server error ${message.code}: ${message.message}`);
      this.config.onError(error);
    }
  }

  /**
   * Register session with server
   */
  private registerSession(): void {
    const registerMessage: RegisterMessage = {
      type: 'register',
      sessionId: this.sessionId!,
      role: 'developer', // Extension is always developer role
      timestamp: Date.now()
    };

    this.sendMessage(registerMessage);
  }

  /**
   * Handle disconnection and schedule reconnection
   */
  private handleDisconnection(): void {
    this.websocket = null;
    this.clearHeartbeatTimer();

    if (!this.isManuallyDisconnected) {
      this.scheduleReconnection();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('Max reconnection attempts reached');
      this.config.onError(new Error('Failed to reconnect after maximum attempts'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${this.config.reconnectInterval}ms`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval!);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectionTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();

    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        const heartbeat: HeartbeatMessage = {
          type: 'heartbeat',
          sessionId: this.sessionId!,
          timestamp: Date.now()
        };
        
        this.sendMessage(heartbeat);
      }
    }, this.config.heartbeatInterval!);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send queued messages
   */
  private sendQueuedMessages(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.websocket!.send(JSON.stringify(message));
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `ext_${timestamp}_${randomStr}`;
  }

  /**
   * Store session info in Chrome storage
   */
  private storeSessionInfo(): void {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const sessionInfo: SessionInfo = {
        sessionId: this.sessionId!,
        tunnelUrl: this.tunnelUrl || undefined,
        connectedAt: Date.now()
      };

      // Chrome storage API might not return a promise in tests
      try {
        const result = chrome.storage.local.set(sessionInfo);
        if (result && typeof result.catch === 'function') {
          result.catch((error: Error) => {
            console.error('Failed to store session info:', error);
          });
        }
      } catch (error) {
        console.error('Failed to store session info:', error);
      }
    }
  }
}