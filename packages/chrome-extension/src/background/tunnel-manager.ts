import { Logger } from '../lib/logger';

export interface TunnelSession {
  sessionId: string;
  tunnelUrl: string;
  targetPort: number;
  status: 'connecting' | 'active' | 'error';
}

const logger = new Logger('TunnelManager');

export class TunnelManager {
  private ws: WebSocket | null = null;
  private currentTunnel: TunnelSession | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // TunnelManager will be used by the main message listener
  }

  async createTunnel(targetPort: number): Promise<TunnelSession> {
    // Validate port number
    if (!targetPort || targetPort <= 0 || targetPort > 65535) {
      throw new Error(`Invalid port number: ${targetPort}. Port must be between 1 and 65535.`);
    }
    
    try {
      // Stop existing tunnel if any
      this.stopTunnel();

      logger.info(`Creating tunnel for port ${targetPort}`);
      
      // Update status to connecting
      this.currentTunnel = {
        sessionId: '',
        tunnelUrl: '',
        targetPort,
        status: 'connecting'
      };
      this.updateBadge();

      // Create tunnel session via API
      const response = await fetch('https://api.wingmanux.com/tunnel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetPort,
          enableP2P: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create tunnel: ${await response.text()}`);
      }

      const data = await response.json();
      this.currentTunnel.sessionId = data.sessionId;
      this.currentTunnel.tunnelUrl = data.tunnelUrl;
      
      logger.info(`Tunnel created: ${data.tunnelUrl}`);

      // Connect WebSocket for developer registration
      await this.connectWebSocket();
      
      // Update status to active
      this.currentTunnel.status = 'active';
      this.updateBadge();
      
      return this.currentTunnel;
    } catch (error) {
      logger.error('Failed to create tunnel:', error);
      if (this.currentTunnel) {
        this.currentTunnel.status = 'error';
        this.updateBadge();
      }
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentTunnel) {
        reject(new Error('No tunnel session'));
        return;
      }

      logger.info('Connecting to tunnel WebSocket...');
      
      this.ws = new WebSocket('wss://api.wingmanux.com/ws');
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        logger.info('WebSocket connected');
        
        // Register as developer
        if (this.ws && this.currentTunnel) {
          this.ws.send(JSON.stringify({
            type: 'register',
            role: 'developer',
            sessionId: this.currentTunnel.sessionId
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'registered' && message.role === 'developer') {
            logger.info('Registered as developer');
            this.reconnectAttempts = 0;
            resolve();
          } else if (message.type === 'error') {
            logger.error('WebSocket error:', message.error);
            reject(new Error(message.error));
          } else if (message.type === 'request') {
            logger.info(`Tunnel request: ${message.request?.method} ${message.request?.path}`);
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        logger.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        logger.info('WebSocket connection closed');
        if (this.currentTunnel && this.currentTunnel.status === 'active') {
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
        this.connectWebSocket().catch(error => {
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