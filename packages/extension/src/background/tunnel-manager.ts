import { createLogger } from '../utils/logger';

export interface TunnelSession {
  sessionId: string;
  tunnelUrl: string;
  targetPort: number;
  status: 'connecting' | 'active' | 'error';
}

const logger = createLogger('TunnelManager');

export class TunnelManager {
  private ws: WebSocket | null = null;
  private currentTunnel: TunnelSession | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentRelayUrl: string = '';
  private isLocalRelay: boolean = false;

  constructor() {
    // TunnelManager will be used by the main message listener
  }

  async createTunnel(targetPort: number, relayUrl?: string): Promise<TunnelSession> {
    logger.info(`[TunnelManager] createTunnel called with port: ${targetPort}, relay: ${relayUrl}`);
    
    // Validate port number
    if (!targetPort || targetPort <= 0 || targetPort > 65535) {
      const errorMsg = `Invalid port number: ${targetPort}. Port must be between 1 and 65535.`;
      logger.error(`[TunnelManager] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    try {
      // Stop existing tunnel if any
      logger.debug(`[TunnelManager] Stopping any existing tunnel...`);
      this.stopTunnel();

      logger.info(`[TunnelManager] Creating tunnel for port ${targetPort}`);
      
      // Update status to connecting
      this.currentTunnel = {
        sessionId: '',
        tunnelUrl: '',
        targetPort,
        status: 'connecting'
      };
      this.updateBadge();

      // Determine which server to use
      const baseUrl = relayUrl || 'http://localhost:8787';
      const isLocalRelay = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
      
      // Store for reconnection
      this.currentRelayUrl = baseUrl;
      this.isLocalRelay = isLocalRelay;
      
      // Use local relay for tunnel creation if available, otherwise fall back to external
      const apiUrl = isLocalRelay 
        ? `${baseUrl}/tunnel/create`
        : 'https://api.wingmanux.com/tunnel/create';
      
      const requestBody = JSON.stringify({
        targetPort,
        enableP2P: false
      });
      
      logger.debug(`[TunnelManager] Using ${isLocalRelay ? 'LOCAL' : 'EXTERNAL'} relay`);
      logger.debug(`[TunnelManager] Sending POST request to ${apiUrl}`);
      logger.debug(`[TunnelManager] Request body: ${requestBody}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      });

      logger.debug(`[TunnelManager] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[TunnelManager] API error response: ${errorText}`);
        throw new Error(`Failed to create tunnel: ${errorText}`);
      }

      const data = await response.json();
      logger.debug(`[TunnelManager] API response data:`, data);
      
      this.currentTunnel.sessionId = data.sessionId;
      this.currentTunnel.tunnelUrl = data.tunnelUrl;
      
      logger.info(`[TunnelManager] Tunnel created: ${data.tunnelUrl} (session: ${data.sessionId})`);

      // Connect WebSocket for developer registration
      logger.debug(`[TunnelManager] Connecting WebSocket...`);
      await this.connectWebSocket(baseUrl, isLocalRelay);
      
      // Update status to active
      this.currentTunnel.status = 'active';
      this.updateBadge();
      
      logger.info(`[TunnelManager] Tunnel successfully activated`);
      return this.currentTunnel;
    } catch (error: any) {
      logger.error(`[TunnelManager] Failed to create tunnel:`, error);
      logger.error(`[TunnelManager] Error stack:`, error.stack);
      
      if (this.currentTunnel) {
        this.currentTunnel.status = 'error';
        this.updateBadge();
      }
      throw error;
    }
  }

  private async connectWebSocket(relayUrl: string, isLocalRelay: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentTunnel) {
        const error = new Error('No tunnel session');
        logger.error(`[TunnelManager] WebSocket connect failed: ${error.message}`);
        reject(error);
        return;
      }

      // Use appropriate WebSocket URL based on relay type
      const wsUrl = isLocalRelay
        ? relayUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
        : 'wss://api.wingmanux.com/ws';
      
      logger.info(`[TunnelManager] Connecting to WebSocket at ${wsUrl}... (${isLocalRelay ? 'LOCAL' : 'EXTERNAL'})`);
      
      try {
        this.ws = new WebSocket(wsUrl);
        logger.debug(`[TunnelManager] WebSocket object created`);
      } catch (error: any) {
        logger.error(`[TunnelManager] Failed to create WebSocket:`, error);
        reject(error);
        return;
      }
      
      const timeout = setTimeout(() => {
        logger.error(`[TunnelManager] WebSocket connection timeout after 10 seconds`);
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        logger.info(`[TunnelManager] WebSocket connected successfully`);
        
        // Register as developer
        if (this.ws && this.currentTunnel) {
          const registerMessage = JSON.stringify({
            type: 'register',
            role: 'developer',
            sessionId: this.currentTunnel.sessionId
          });
          logger.debug(`[TunnelManager] Sending registration: ${registerMessage}`);
          this.ws.send(registerMessage);
        } else {
          logger.error(`[TunnelManager] Cannot register - WebSocket or tunnel missing`);
        }
      };

      this.ws.onmessage = (event) => {
        logger.debug(`[TunnelManager] WebSocket message received: ${event.data}`);
        
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'registered' && message.role === 'developer') {
            logger.info(`[TunnelManager] Successfully registered as developer`);
            this.reconnectAttempts = 0;
            resolve();
          } else if (message.type === 'error') {
            logger.error(`[TunnelManager] WebSocket error message:`, message.error);
            reject(new Error(message.error));
          } else if (message.type === 'request') {
            logger.info(`[TunnelManager] Tunnel request: ${message.request?.method} ${message.request?.path}`);
          } else {
            logger.debug(`[TunnelManager] Unhandled message type: ${message.type}`);
          }
        } catch (error) {
          logger.error(`[TunnelManager] Error parsing WebSocket message:`, error);
          logger.error(`[TunnelManager] Raw message: ${event.data}`);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        logger.error(`[TunnelManager] WebSocket error event:`, error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        logger.info(`[TunnelManager] WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`);
        if (this.currentTunnel && this.currentTunnel.status === 'active') {
          logger.debug(`[TunnelManager] Will attempt to reconnect...`);
          this.scheduleReconnect();
        }
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      if (this.currentTunnel) {
        this.currentTunnel.status = 'error';
        this.updateBadge();
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    
    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.currentTunnel) {
        this.connectWebSocket(this.currentRelayUrl, this.isLocalRelay).catch(error => {
          logger.error('Reconnect failed:', error);
          this.scheduleReconnect();
        });
      }
    }, delay);
  }

  stopTunnel(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentTunnel = null;
    this.reconnectAttempts = 0;
    this.updateBadge();
    
    logger.info('Tunnel stopped');
  }

  private updateBadge(): void {
    const status = this.currentTunnel?.status || 'inactive';
    const badgeConfig = {
      inactive: { text: '', color: '#8B5CF6' },
      connecting: { text: '●', color: '#F59E0B' },
      active: { text: '●', color: '#10B981' },
      error: { text: '●', color: '#EF4444' }
    };

    const config = badgeConfig[status];
    chrome.action.setBadgeText({ text: config.text });
    chrome.action.setBadgeBackgroundColor({ color: config.color });
  }

  getCurrentTunnel(): TunnelSession | null {
    return this.currentTunnel;
  }
}