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
      
      // Add extra safety - only process requests that are definitely tunnel requests
      console.log(`[TunnelProxy] Processing tunnel request for subdomain: ${subdomain}, path: ${req.path}`);

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

      // Check if we're in production/cloud environment
      const isProduction = process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME;
      
      // In production, we can't proxy to localhost - need WebSocket forwarding
      if (session.targetPort && !isProduction) {
        // Local environment: direct proxy to localhost:targetPort works
        logger.debug(`Using direct proxy for ${subdomain} to port ${session.targetPort}`);
        
        const proxy = this.createProxy(subdomain, session.targetPort);
        proxy(req, res, next);
      } else if (session.targetPort && isProduction) {
        // Production environment: need WebSocket forwarding
        const developerWs = this.connectionManager.getDeveloperConnection(subdomain);
        
        if (developerWs) {
          // Developer connected via WebSocket - forward the request
          logger.debug(`Using WebSocket forwarding for ${subdomain} in production`);
          
          // Forward the HTTP request through WebSocket
          this.forwardRequestViaWebSocket(req, res, subdomain, developerWs);
        } else {
          // No developer connected
          logger.debug(`No developer connected for ${subdomain} in production`);
          res.status(502).json({
            error: 'Tunnel not connected',
            code: 'DEVELOPER_NOT_CONNECTED',
            details: 'The tunnel exists but the developer is not connected. Please ensure the Chrome extension is running and connected.'
          });
        }
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
   * Forward HTTP request through WebSocket to developer
   */
  private forwardRequestViaWebSocket(req: Request, res: Response, sessionId: string, developerWs: any): void {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced logging with console.log for production visibility
    console.log(`[TunnelProxy] FORWARDING REQUEST ${requestId}: ${req.method} ${req.url} for session ${sessionId}`);
    console.log(`[TunnelProxy] Request headers for ${requestId}:`, Object.keys(req.headers));
    console.log(`[TunnelProxy] Request content-type:`, req.headers['content-type'] || 'none');
    
    logger.info(`[TunnelProxy] Forwarding request ${requestId}: ${req.method} ${req.url} for session ${sessionId}`);
    
    // Prepare request data to send to developer
    const requestData = {
      type: 'request',
      requestId,
      sessionId,
      request: {
        method: req.method,
        path: req.path,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body
      }
    };
    
    console.log(`[TunnelProxy] Request data prepared for ${requestId}, sending to Chrome extension`);
    logger.debug(`[TunnelProxy] Request data size: headers=${JSON.stringify(req.headers).length}, body=${req.body ? JSON.stringify(req.body).length : 0}`);
    
    // State for handling binary protocol (metadata + body)
    let responseMetadata: any = null;
    let responseBody: Buffer | null = null;
    let responseComplete = false;
    
    // Set up response handler for new binary protocol
    const handleResponse = (data: any) => {
      if (responseComplete) return;
      
      try {
        // Try to parse as JSON first (metadata)
        if (typeof data === 'string' || (data instanceof Buffer && data.length < 10000)) {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'response' && message.requestId === requestId) {
              // This is the metadata message
              responseMetadata = message.response;
              console.log(`[TunnelProxy] Received response metadata for ${requestId}: status=${responseMetadata.statusCode}, bodyLength=${responseMetadata.bodyLength}`);
              
              // If there's no body, send the response immediately with empty body
              if (!responseMetadata.bodyLength || responseMetadata.bodyLength === 0) {
                responseBody = Buffer.alloc(0); // Set empty buffer instead of null
                sendCompleteResponse();
              } else {
                // Otherwise wait for the binary body frame, but set a timeout
                setTimeout(() => {
                  if (!responseComplete && responseMetadata && !responseBody) {
                    console.error(`[TunnelProxy] TIMEOUT waiting for binary body for ${requestId}, expected ${responseMetadata.bodyLength} bytes`);
                    sendErrorResponse(new Error('Timeout waiting for binary body'));
                  }
                }, 5000); // 5 second timeout for binary frame
              }
              // Otherwise wait for the binary body frame
              return;
            }
          } catch (parseError) {
            // Not JSON, continue to binary handling
          }
        }
        
        // Handle binary body frame
        if (responseMetadata && data instanceof Buffer) {
          responseBody = data;
          console.log(`[TunnelProxy] Received binary body for ${requestId}: ${data.length} bytes`);
          sendCompleteResponse();
          return;
        }
        
        // Debug: Log unexpected data
        console.log(`[TunnelProxy] UNEXPECTED DATA for ${requestId}:`, {
          type: typeof data,
          isBuffer: data instanceof Buffer,
          hasMetadata: !!responseMetadata,
          dataLength: data?.length || 'unknown'
        });
        
      } catch (error: any) {
        console.error(`[TunnelProxy] ERROR handling WebSocket response for ${requestId}:`, error);
        sendErrorResponse(error);
      }
    };
    
    const sendCompleteResponse = () => {
      if (responseComplete || !responseMetadata) return;
      responseComplete = true;
      
      // Clear timeout and remove listener
      clearTimeout(timeout);
      developerWs.off('message', handleResponse);
      
      const response = responseMetadata;
      
      // Enhanced logging with console.log for production visibility  
      console.log(`[TunnelProxy] Sending complete response for ${requestId}: status=${response.statusCode}, bodySize=${responseBody?.length || 0}`);
      console.log(`[TunnelProxy] Response headers for ${requestId}:`, Object.keys(response.headers || {}));
      
      logger.debug(`[TunnelProxy] Sending response for ${requestId}: status=${response.statusCode}, bodySize=${responseBody?.length || 0}, headers=${JSON.stringify(Object.keys(response.headers || {}))}`);
      
      // Only process response if headers haven't been sent
      if (!res.headersSent) {
        // Set status code
        res.status(response.statusCode || 200);
        
        // Set headers, skipping problematic ones
        if (response.headers) {
          Object.keys(response.headers).forEach(key => {
            const lowerKey = key.toLowerCase();
            // Skip headers that can cause issues
            if (!['content-length', 'transfer-encoding', 'connection'].includes(lowerKey)) {
              try {
                res.setHeader(key, response.headers[key]);
              } catch (headerError) {
                console.log(`[TunnelProxy] Failed to set header ${key}:`, headerError);
                logger.warn(`Failed to set header ${key}:`, headerError);
              }
            }
          });
        }
        
        // Send binary response body directly (no encoding/decoding needed!)
        if (responseBody && responseBody.length > 0) {
          console.log(`[TunnelProxy] Sending binary content for ${requestId}`);
          res.send(responseBody);
        } else {
          console.log(`[TunnelProxy] Sending empty response for ${requestId}`);
          res.end();
        }
      } else {
        console.log(`[TunnelProxy] Headers already sent for request ${requestId}`);
        logger.warn(`Headers already sent for request ${requestId}`);
      }
    };
    
    const sendErrorResponse = (error: any) => {
      if (responseComplete) return;
      responseComplete = true;
      
      clearTimeout(timeout);
      developerWs.off('message', handleResponse);
      
      console.error(`[TunnelProxy] ERROR handling WebSocket response for ${requestId}:`, error);
      logger.error(`[TunnelProxy] Error handling WebSocket response for ${requestId}:`, error);
      
      // Send 500 error if we haven't sent response yet
      if (!res.headersSent) {
        console.log(`[TunnelProxy] Sending 500 error response for ${requestId}`);
        res.status(500).json({
          error: 'Internal Server Error',
          details: 'Failed to process tunnel response',
          message: error.message,
          requestId
        });
      } else {
        console.log(`[TunnelProxy] Cannot send error response for ${requestId} - headers already sent`);
      }
    };
    
    // Set timeout for response
    const timeout = setTimeout(() => {
      developerWs.off('message', handleResponse);
      res.status(504).json({
        error: 'Gateway Timeout',
        code: 'WEBSOCKET_TIMEOUT',
        details: 'The developer did not respond in time'
      });
    }, 30000); // 30 second timeout
    
    // Listen for response
    developerWs.on('message', handleResponse);
    
    // Send request to developer
    developerWs.send(JSON.stringify(requestData));
  }

  /**
   * Extract subdomain from host header
   */
  private extractSubdomain(host: string): string | null {
    if (!host) return null;
    
    // Remove port if present
    const hostname = host.split(':')[0];
    if (!hostname) return null;
    
    // Only process tunnel requests for the configured tunnel domain
    const tunnelBaseUrl = process.env.TUNNEL_BASE_URL || 'wingmanux.com';
    
    // Check if this request is to the tunnel domain (e.g., *.wingmanux.com)
    if (!hostname.endsWith(`.${tunnelBaseUrl}`)) {
      // This is not a tunnel request (e.g., wingman-tunnel.fly.dev)
      console.log(`[TunnelProxy] Skipping non-tunnel domain: ${hostname} (expected *.${tunnelBaseUrl})`);
      return null;
    }
    
    // Reserved subdomains that should NOT be treated as tunnels
    const RESERVED_SUBDOMAINS = [
      'api',      // API endpoints
      'www',      // Main website
      'app',      // Web application
      'admin',    // Admin panel
      'dashboard', // Dashboard
      'docs',     // Documentation
      'blog',     // Blog
      'status'    // Status page
    ];
    
    // Extract the first part as potential subdomain
    const parts = hostname.split('.');
    if (parts.length < 3) return null; // Need at least subdomain.domain.tld
    
    const subdomain = parts[0]?.toLowerCase();
    if (!subdomain) return null;
    
    // Skip if it's a reserved subdomain
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      console.log(`[TunnelProxy] Skipping reserved subdomain: ${subdomain}`);
      return null;
    }
    
    // Aviation-themed session IDs are always in format: word-word
    // Examples: thunder-xray, ghost-alpha, maverick-bravo
    // This prevents false positives like "api" or "www"
    if (!/^[a-z]+-[a-z]+$/i.test(subdomain)) {
      console.log(`[TunnelProxy] Subdomain doesn't match session pattern: ${subdomain}`);
      return null;
    }
    
    // Additional validation: must be at least 3 chars on each side of hyphen
    const sessionParts = subdomain.split('-');
    if (sessionParts.length !== 2 || 
        !sessionParts[0] || sessionParts[0].length < 3 || 
        !sessionParts[1] || sessionParts[1].length < 3) {
      console.log(`[TunnelProxy] Session ID validation failed: ${subdomain}`);
      return null;
    }
    
    console.log(`[TunnelProxy] Valid tunnel session detected: ${subdomain}`);
    return subdomain;
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