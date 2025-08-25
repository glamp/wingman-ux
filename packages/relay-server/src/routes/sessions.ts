import { Router, Request, Response } from 'express';
import { SessionManager } from '../services/session-manager';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:SessionRoutes');

export function createSessionsRouter(sessionManager: SessionManager): Router {
  const router = Router();

  /**
   * POST /api/sessions
   * Create a new tunnel session
   */
  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const { developerId, targetPort, metadata } = req.body;

      // Validate input
      if (!developerId || !targetPort) {
        return res.status(400).json({
          error: 'Missing required fields: developerId and targetPort',
          code: 'INVALID_REQUEST'
        });
      }

      const port = parseInt(targetPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          error: 'Invalid port number. Must be between 1 and 65535',
          code: 'INVALID_PORT'
        });
      }

      // Create session
      const session = sessionManager.createSession(developerId, port, metadata);
      
      // Generate tunnel URL (using subdomain format)
      const tunnelUrl = process.env.TUNNEL_BASE_URL 
        ? `https://${session.id}.${process.env.TUNNEL_BASE_URL}`
        : `https://${session.id}.wingmanux.com`;
      
      session.tunnelUrl = tunnelUrl;
      sessionManager.updateSession(session.id, { tunnelUrl });

      logger.info(`Created session ${session.id} for developer ${developerId}`);

      res.status(201).json({
        sessionId: session.id,
        session,
        tunnelUrl
      });
    } catch (error) {
      logger.error('Error creating session:', error);
      res.status(500).json({
        error: 'Failed to create session',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * GET /api/sessions/:id
   * Get session details
   */
  router.get('/sessions/:id', (req: Request, res: Response) => {
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        code: 'SESSION_ID_REQUIRED'
      });
    }
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    res.json({ session });
  });

  /**
   * GET /api/sessions
   * List all sessions (optionally filtered)
   */
  router.get('/sessions', (req: Request, res: Response) => {
    const { developerId, targetPort, status } = req.query;

    let sessions = sessionManager.getAllSessions();

    // Apply filters
    if (developerId) {
      sessions = sessions.filter(s => s.developerId === developerId);
    }
    if (targetPort) {
      const port = parseInt(targetPort as string, 10);
      if (!isNaN(port)) {
        sessions = sessions.filter(s => s.targetPort === port);
      }
    }
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }

    res.json({ sessions });
  });

  /**
   * PUT /api/sessions/:id
   * Update session status
   */
  router.put('/sessions/:id', (req: Request, res: Response) => {
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        code: 'SESSION_ID_REQUIRED'
      });
    }
    const { status, metadata } = req.body;

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (metadata) updates.metadata = { ...session.metadata, ...metadata };

    const updatedSession = sessionManager.updateSession(sessionId, updates) || session;

    res.json({ session: updatedSession });
  });

  /**
   * DELETE /api/sessions/:id
   * Delete a session
   */
  router.delete('/sessions/:id', (req: Request, res: Response) => {
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        code: 'SESSION_ID_REQUIRED'
      });
    }
    
    const deleted = sessionManager.deleteSession(sessionId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    logger.info(`Deleted session ${sessionId}`);
    res.json({ success: true, message: `Session ${sessionId} deleted` });
  });

  return router;
}