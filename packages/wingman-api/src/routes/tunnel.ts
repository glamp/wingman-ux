import express, { Router, Request, Response } from 'express';
import { SessionManager } from '../services/session-manager';
import { ConnectionManager } from '../services/connection-manager';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:TunnelRoutes');

// Store active tunnel metadata (actual connections managed by ConnectionManager)
const activeTunnels = new Map<string, {
  sessionId: string;
  targetPort: number;
  tunnelUrl: string;
  createdAt: Date;
  mode: 'embedded' | 'remote';
}>();

/**
 * Cleanup stale tunnels periodically.
 * Note: Session cleanup is handled by SessionManager,
 * this just cleans up the local tunnel tracking.
 */
function cleanupStaleTunnels(sessionManager?: SessionManager) {
  const now = Date.now();
  const staleTimeout = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, tunnel] of activeTunnels.entries()) {
    const age = now - tunnel.createdAt.getTime();
    
    // Check if tunnel is stale
    if (age > staleTimeout) {
      logger.info(`Cleaning up stale tunnel ${sessionId} (age: ${Math.round(age / 1000)}s)`);
      
      if (sessionManager) {
        // Update session status if using embedded mode
        sessionManager.updateSession(sessionId, { status: 'expired' });
      }
      
      activeTunnels.delete(sessionId);
    }
  }
}

/**
 * Tunnel router for creating and managing tunnel sessions.
 * Can work in two modes:
 * - Embedded: Uses local SessionManager (when passed)
 * - Remote: Connects to external tunnel server
 */
export function tunnelRouter(sessionManager?: SessionManager, connectionManager?: ConnectionManager): Router {
  const router = Router();
  
  // Run cleanup every 5 minutes
  setInterval(() => cleanupStaleTunnels(sessionManager), 5 * 60 * 1000);

  /**
   * POST /tunnel/create
   * Create a new tunnel session
   */
  router.post('/create', async (req: Request, res: Response) => {
    try {
      const { targetPort, enableP2P = false } = req.body;

      // Validate input
      if (!targetPort) {
        return res.status(400).json({
          error: 'Target port is required',
          code: 'MISSING_PORT'
        });
      }

      const port = parseInt(targetPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          error: 'Invalid port number',
          code: 'INVALID_PORT'
        });
      }

      // Clean up any existing tunnels for the same port
      const existingTunnels = Array.from(activeTunnels.entries()).filter(([_, t]) => t.targetPort === port);
      if (existingTunnels.length > 0) {
        logger.info(`Cleaning up ${existingTunnels.length} existing tunnel(s) for port ${port}`);
        for (const [sessionId, tunnel] of existingTunnels) {
          // Clean up session if using embedded mode
          if (sessionManager && tunnel.mode === 'embedded') {
            sessionManager.deleteSession(sessionId);
          }
          activeTunnels.delete(sessionId);
          logger.info(`Cleaned up tunnel ${sessionId}`);
        }
      }

      // Check if we're using embedded session manager or remote tunnel server
      let sessionId: string;
      let tunnelUrl: string;
      
      if (sessionManager) {
        // Use embedded session manager
        const session = sessionManager.createSession('relay-server', port, { enableP2P });
        sessionId = session.id;
        
        // Generate tunnel URL based on environment
        const baseUrl = process.env.TUNNEL_BASE_URL || 'wingmanux.com';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const portSuffix = process.env.NODE_ENV === 'production' ? '' : `:${process.env.PORT || '8787'}`;
        tunnelUrl = `${protocol}://${sessionId}.${baseUrl}${portSuffix}`;
        
        session.tunnelUrl = tunnelUrl;
        sessionManager.updateSession(sessionId, { tunnelUrl, status: 'active' });
        logger.info('Created local tunnel session:', sessionId, 'URL:', tunnelUrl);
      } else {
        // Fall back to remote tunnel server
        const tunnelServerUrl = process.env.TUNNEL_SERVER_URL || 'https://wingman-tunnel.fly.dev';
        const response = await fetch(`${tunnelServerUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            developerId: 'relay-server',
            targetPort: port
          })
        });

        if (!response.ok) {
          const error = await response.text();
          logger.error('Failed to create tunnel session:', error);
          return res.status(502).json({
            error: 'Failed to create tunnel session',
            code: 'TUNNEL_CREATE_FAILED'
          });
        }

        const data = await response.json() as { sessionId: string; session: { id: string; developerId: string; targetPort: number; status: string }; tunnelUrl: string };
        sessionId = data.sessionId || data.session?.id;
        tunnelUrl = data.tunnelUrl || `https://${sessionId}.wingmanux.com`;
        logger.info('Created remote tunnel session:', sessionId);
      }

      // Store tunnel info
      activeTunnels.set(sessionId, {
        sessionId: sessionId,
        targetPort: port,
        tunnelUrl: tunnelUrl,
        createdAt: new Date(),
        mode: sessionManager ? 'embedded' : 'remote'
      });
      
      // If using embedded mode, the WebSocket connections will be handled
      // by the main server's WebSocket handler
      if (sessionManager) {
        logger.info('Tunnel created in embedded mode:', sessionId);
      } else {
        logger.info('Tunnel created in remote mode:', sessionId);
        // In remote mode, the actual tunnel server handles the connections
      }

      res.json({
        success: true,
        sessionId: sessionId,
        tunnelUrl: tunnelUrl, // Use the consistent subdomain format
        targetPort: port,
        status: 'active'
      });

    } catch (error) {
      logger.error('Error creating tunnel:', error);
      res.status(500).json({
        error: 'Failed to create tunnel',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * GET /tunnel/status
   * Get status of active tunnel(s)
   */
  router.get('/status', (req: Request, res: Response) => {
    const tunnels = Array.from(activeTunnels.values()).map(tunnel => ({
      sessionId: tunnel.sessionId,
      tunnelUrl: tunnel.tunnelUrl,
      targetPort: tunnel.targetPort,
      createdAt: tunnel.createdAt,
      connectionMode: tunnel.mode
    }));

    res.json({
      active: tunnels.length > 0,
      tunnels
    });
  });

  /**
   * DELETE /tunnel/stop
   * Stop active tunnel(s)
   */
  router.delete('/stop', (req: Request, res: Response) => {
    const { sessionId } = req.body;

    if (sessionId) {
      // Stop specific tunnel
      const tunnel = activeTunnels.get(sessionId);
      if (tunnel) {
        // Clean up session if using embedded mode
        if (sessionManager && tunnel.mode === 'embedded') {
          sessionManager.deleteSession(sessionId);
        }
        
        activeTunnels.delete(sessionId);
        logger.info('Stopped tunnel:', sessionId);
        
        res.json({
          success: true,
          message: `Tunnel ${sessionId} stopped`
        });
      } else {
        res.status(404).json({
          error: 'Tunnel not found',
          code: 'TUNNEL_NOT_FOUND'
        });
      }
    } else {
      // Stop all tunnels
      for (const [id, tunnel] of activeTunnels) {
        // Clean up session if using embedded mode
        if (sessionManager && tunnel.mode === 'embedded') {
          sessionManager.deleteSession(id);
        }
        logger.info('Stopped tunnel:', id);
      }
      const count = activeTunnels.size;
      activeTunnels.clear();
      
      res.json({
        success: true,
        message: `Stopped ${count} tunnel(s)`
      });
    }
  });

  /**
   * GET /tunnel/detect
   * Auto-detect local development server port
   */
  router.get('/detect', async (req: Request, res: Response) => {
    const commonPorts = [3000, 3001, 8080, 8000, 4200, 5173, 5000, 8787];
    const detected: number[] = [];

    // Try to detect which ports have servers running
    for (const port of commonPorts) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        // If we get any response (even error), the port is likely in use
        detected.push(port);
      } catch (error) {
        // Port not responding or timeout - not in use
      }
    }

    res.json({
      detected,
      suggested: detected[0] || 3000
    });
  });

  return router;
}