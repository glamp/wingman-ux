import type { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from './connection-manager';
import { SessionManager } from './session-manager';

interface ProxiedRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string | string[]>;
  body: string | null;
}

/**
 * Handles HTTP proxy requests and forwards them to developers
 */
export class ProxyHandler {
  constructor(
    private connectionManager: ConnectionManager,
    private sessionManager: SessionManager
  ) {}

  /**
   * Express middleware to handle proxy requests
   */
  async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID required',
          code: 'SESSION_ID_REQUIRED'
        });
        return;
      }
      
      // Check if session exists
      const session = this.sessionManager.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
        return;
      }
      
      // Check if developer is connected
      if (!this.connectionManager.isConnected(sessionId)) {
        res.status(502).json({
          error: 'Developer not connected',
          code: 'DEVELOPER_NOT_CONNECTED'
        });
        return;
      }
      
      // Build the path from the remaining URL
      const path = '/' + (req.params[0] || '');
      
      // Prepare the request to forward
      const proxiedRequest: ProxiedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        method: req.method,
        path: path + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''),
        headers: req.headers as Record<string, string | string[]>,
        body: null
      };
      
      // Add body if present
      if (req.body) {
        if (typeof req.body === 'object') {
          proxiedRequest.body = JSON.stringify(req.body);
        } else {
          proxiedRequest.body = req.body;
        }
      }
      
      try {
        // Forward the request to the developer
        const response = await this.connectionManager.forwardRequest(sessionId, proxiedRequest);
        
        // Set response headers
        Object.entries(response.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        // Send the response
        res.status(response.status);
        
        // Handle different content types
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
          try {
            res.json(JSON.parse(response.body));
          } catch {
            res.send(response.body);
          }
        } else if (contentType && contentType.includes('image/')) {
          // Binary data is base64 encoded
          const buffer = Buffer.from(response.body, 'base64');
          res.send(buffer);
        } else {
          res.send(response.body);
        }
      } catch (error: any) {
        // Handle specific error cases
        if (error.message === 'Request timeout') {
          res.status(504).json({
            error: 'Request timeout',
            code: 'GATEWAY_TIMEOUT'
          });
        } else if (error.message === 'Developer disconnected') {
          res.status(502).json({
            error: 'Developer disconnected',
            code: 'DEVELOPER_DISCONNECTED'
          });
        } else {
          res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
          });
        }
      }
    } catch (error) {
      console.error('Proxy handler error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle WebSocket upgrade requests
   */
  async handleWebSocketUpgrade(sessionId: string, ws: any, req: any): Promise<void> {
    // Check if session exists
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      ws.close(1001, 'Session not found');
      return;
    }
    
    // Check if developer is connected
    if (!this.connectionManager.isConnected(sessionId)) {
      ws.close(1001, 'Developer not connected');
      return;
    }
    
    // Forward the WebSocket connection
    await this.connectionManager.forwardWebSocket(sessionId, ws);
  }
}