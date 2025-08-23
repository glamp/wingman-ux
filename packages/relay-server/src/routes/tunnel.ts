import express, { Router, Request, Response } from 'express';
import TunnelConnector from '../services/tunnel-connector';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:TunnelRoutes');

// Store active tunnel connections
const activeTunnels = new Map<string, {
  connector: TunnelConnector;
  sessionId: string;
  targetPort: number;
  tunnelUrl: string;
  createdAt: Date;
}>();

export function tunnelRouter(): Router {
  const router = Router();

  /**
   * POST /tunnel/create
   * Create a new tunnel session
   */
  router.post('/create', async (req: Request, res: Response) => {
    try {
      const { targetPort } = req.body;

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

      // Check if we already have an active tunnel
      const existingTunnel = Array.from(activeTunnels.values()).find(t => t.targetPort === port);
      if (existingTunnel) {
        return res.json({
          success: true,
          sessionId: existingTunnel.sessionId,
          tunnelUrl: `https://wingman-tunnel.fly.dev/sessions/${existingTunnel.sessionId}`,
          targetPort: existingTunnel.targetPort,
          status: 'active'
        });
      }

      // Create session on tunnel server
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
      const sessionId = data.sessionId || data.session?.id;
      logger.info('Created tunnel session:', sessionId);

      // Create and connect tunnel connector
      const connector = new TunnelConnector({
        sessionId: sessionId,
        targetPort: port,
        tunnelUrl: tunnelServerUrl,
        developerId: 'relay-server',
        enableP2P: false, // Start with relay mode for simplicity
        debug: process.env.NODE_ENV === 'development'
      });

      // Store the tunnel
      activeTunnels.set(sessionId, {
        connector,
        sessionId: sessionId,
        targetPort: port,
        tunnelUrl: data.tunnelUrl || `${tunnelServerUrl}/sessions/${sessionId}`,
        createdAt: new Date()
      });

      // Connect to tunnel server
      try {
        await connector.connect();
        logger.info('Connected to tunnel server for session:', sessionId);
      } catch (error) {
        logger.error('Failed to connect to tunnel server:', error);
        activeTunnels.delete(sessionId);
        return res.status(502).json({
          error: 'Failed to connect to tunnel server',
          code: 'TUNNEL_CONNECT_FAILED'
        });
      }

      // Handle disconnection
      connector.on('disconnected', () => {
        logger.info('Tunnel disconnected:', sessionId);
        activeTunnels.delete(sessionId);
      });

      res.json({
        success: true,
        sessionId: sessionId,
        tunnelUrl: data.tunnelUrl || `${tunnelServerUrl}/sessions/${sessionId}`,
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
      connectionMode: tunnel.connector.getConnectionMode()
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
        tunnel.connector.disconnect();
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
        tunnel.connector.disconnect();
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