import { Router, Request, Response } from 'express';
import { SessionManager } from '../session-manager.js';

interface CreateSessionRequest {
  developerId: string;
  targetPort: number;
}

export function createSessionsRouter(sessionManager: SessionManager): Router {
  const router = Router();

  /**
   * POST /api/sessions - Create new tunnel session
   */
  router.post('/sessions', (req: Request, res: Response) => {
    try {
      const { developerId, targetPort }: CreateSessionRequest = req.body;

      if (!developerId || !targetPort) {
        return res.status(400).json({
          error: 'Missing required fields: developerId and targetPort',
          code: 'INVALID_REQUEST'
        });
      }

      if (typeof targetPort !== 'number' || targetPort < 1 || targetPort > 65535) {
        return res.status(400).json({
          error: 'targetPort must be a valid port number (1-65535)',
          code: 'INVALID_PORT'
        });
      }

      const sessionId = sessionManager.createSession(developerId, targetPort);
      const session = sessionManager.getSession(sessionId);

      res.status(201).json({
        sessionId,
        session,
        tunnelUrl: `https://${sessionId}.wingmanux.com`
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * GET /api/sessions/:id - Get session details
   */
  router.get('/sessions/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          error: 'Session ID is required',
          code: 'INVALID_REQUEST'
        });
      }
      const session = sessionManager.getSession(id);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      res.json({
        session,
        tunnelUrl: `https://${id}.wingmanux.com`
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  return router;
}