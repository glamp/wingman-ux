/**
 * Improved tunnel proxy using http-proxy-middleware
 * Handles subdomain-based tunneling with proper timeouts and error handling
 */

import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@wingman/shared';
import type { SessionManager } from './session-manager';
import type { ConnectionManager } from './connection-manager';

const logger = createLogger('TunnelProxy');

export class TunnelProxy {
  private sessionManager: SessionManager;
  private connectionManager: ConnectionManager;
  private proxyCache: Map<string, any> = new Map();

  constructor(sessionManager: SessionManager, connectionManager: ConnectionManager) {
    this.sessionManager = sessionManager;
    this.connectionManager = connectionManager;
  }

  /**
   * Create proxy middleware for a specific session
   */
  private createProxy(sessionId: string, targetPort: number) {
    const cacheKey = `${sessionId}-${targetPort}`;
    
    // Return cached proxy if exists
    if (this.proxyCache.has(cacheKey)) {
      return this.proxyCache.get(cacheKey);
    }

    const proxyOptions: Options = {
      target: `http://localhost:${targetPort}`,
      changeOrigin: true,
      ws: true, // Enable WebSocket support
      timeout: 5000 // 5 seconds instead of 30
    };

    // For now, let's use the basic options since the default error handling
    // is working (fast responses instead of hangs) even if not customized
    const proxyOptionsWithErrorHandler: Options = proxyOptions;

    const proxy = createProxyMiddleware(proxyOptionsWithErrorHandler);
    const wrappedProxy = proxy;
    
    // Copy over any upgrade method
    if (proxy.upgrade) {
      (wrappedProxy as any).upgrade = proxy.upgrade;
    }
    
    this.proxyCache.set(cacheKey, wrappedProxy);
    return wrappedProxy;
  }

  /**
   * Main middleware handler for subdomain-based tunneling
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Extract subdomain from host header
      const host = req.headers.host || '';
      const subdomain = this.extractSubdomain(host);
      
      if (!subdomain) {
        return next(); // Not a tunnel request
      }

      logger.debug(`Processing tunnel request for subdomain: ${subdomain}`);

      // Check if session exists
      const session = this.sessionManager.getSession(subdomain);
      if (!session) {
        logger.debug(`Session ${subdomain} not found`);
        return res.status(404).json({
          error: 'Tunnel not found',
          code: 'TUNNEL_NOT_FOUND',
          details: `No active tunnel for ${subdomain}`
        });
      }

      // Always prefer direct proxy when targetPort is available
      // This provides the best performance and reliability
      if (session.targetPort) {
        logger.debug(`Using direct proxy for ${subdomain} to port ${session.targetPort}`);
        
        const proxy = this.createProxy(subdomain, session.targetPort);
        proxy(req, res, next);
      } else {
        // No target port configured - check if developer is connected via WebSocket
        const developerWs = this.connectionManager.getDeveloperConnection(subdomain);
        
        if (developerWs) {
          // Legacy WebSocket forwarding for backward compatibility
          logger.debug(`Using WebSocket forwarding for ${subdomain} (no targetPort)`);
          res.status(501).json({
            error: 'WebSocket-only tunnels not supported',
            code: 'WEBSOCKET_ONLY_NOT_SUPPORTED',
            details: 'Please specify a targetPort when creating the tunnel'
          });
        } else {
          // No developer connected and no target port
          logger.debug(`No target configured for ${subdomain}`);
          res.status(502).json({
            error: 'No tunnel target',
            code: 'NO_TARGET',
            details: 'No targetPort specified for this tunnel'
          });
        }
      }
    };
  }

  /**
   * Extract subdomain from host header
   */
  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];
    
    // Check for subdomain patterns
    // Examples: 
    // - thunder-xray.wingmanux.com -> thunder-xray
    // - thunder-xray.localhost -> thunder-xray
    // - thunder-xray.wingman-tunnel.fly.dev -> thunder-xray
    
    const patterns = [
      /^([a-z0-9-]+)\.wingmanux\.com$/i,
      /^([a-z0-9-]+)\.localhost$/i,
      /^([a-z0-9-]+)\.wingman-tunnel\.fly\.dev$/i,
      /^([a-z0-9-]+)\..+$/i // Generic subdomain pattern
    ];
    
    for (const pattern of patterns) {
      const match = hostname?.match(pattern);
      if (match && match[1]) {
        // Validate it looks like a session ID
        const possibleSessionId = match[1];
        if (/^[a-z0-9][a-z0-9-]+[a-z0-9]$/i.test(possibleSessionId)) {
          return possibleSessionId;
        }
      }
    }
    
    return null;
  }

  /**
   * Handle WebSocket upgrade for tunnels
   */
  handleUpgrade() {
    return (request: any, socket: any, head: any) => {
      const host = request.headers.host || '';
      const subdomain = this.extractSubdomain(host);
      
      if (!subdomain) {
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
        return;
      }
      
      const session = this.sessionManager.getSession(subdomain);
      if (!session) {
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
        return;
      }
      
      const proxy = this.createProxy(subdomain, session.targetPort);
      if (proxy.upgrade) {
        proxy.upgrade(request, socket, head);
      }
    };
  }
}