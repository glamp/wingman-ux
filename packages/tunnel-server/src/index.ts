import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './session-manager.js';
import { ConnectionManager, type P2PSignalingMessage } from './connection-manager.js';
import { ProxyHandler } from './proxy-handler.js';
import { createSessionsRouter } from './routes/sessions.js';
import { createStaticRouter } from './routes/static.js';
import { createCorsMiddleware, staticAssetHeaders } from './middleware/cors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create the Express app with all middleware and routes configured
 * Exported for testing purposes
 */
export function createApp() {
  // Initialize Express app
  const app = express();
  
  // Initialize managers
  const sessionManager = new SessionManager();
  const connectionManager = new ConnectionManager();
  const proxyHandler = new ProxyHandler(connectionManager, sessionManager);

  // CORS Middleware - configured for P2P WebRTC and PM browser connections
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging in development
  if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  // API routes
  app.use('/api', createSessionsRouter(sessionManager));

  // Static file serving for CSS/JS with security headers
  app.use('/static', staticAssetHeaders, express.static(path.join(__dirname, 'static')));

  // Proxy routes for tunneled requests (must come before static routes)
  app.use('/tunnel/:sessionId/*', proxyHandler.handleRequest.bind(proxyHandler));

  // Session pages
  app.use('/', createStaticRouter(sessionManager));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeSessions: sessionManager.getActiveSessions().length
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
      path: req.path
    });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    
    // Handle JSON parsing errors
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({
        error: 'Invalid JSON',
        code: 'INVALID_JSON'
      });
    }
    
    // Default error handler
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  });

  return { app, sessionManager, connectionManager };
}

/**
 * Initialize and start the server
 * Only runs when this file is executed directly (not imported for testing)
 */
function startServer() {
  const PORT = process.env.PORT || (process.env.NODE_ENV === 'test' ? 0 : 9876);
  
  const { app, sessionManager, connectionManager } = createApp();
  const server = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  // WebSocket connection handling
  wss.on('connection', (ws, request) => {
    console.log('WebSocket connection established');
    let registeredSessionId: string | null = null;
    let isDeveloper = false;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);

        switch (message.type) {
          case 'register':
            // Developer registration
            if (message.role === 'developer' && message.sessionId) {
              const session = sessionManager.getSession(message.sessionId);
              if (session) {
                connectionManager.registerDeveloper(message.sessionId, ws);
                registeredSessionId = message.sessionId;
                isDeveloper = true;
                ws.send(JSON.stringify({ 
                  type: 'registered', 
                  sessionId: message.sessionId,
                  role: 'developer'
                }));
                
                // Check if P2P can be initiated
                if (connectionManager.isP2PAvailable(message.sessionId)) {
                  setTimeout(() => {
                    connectionManager.initiateP2P(message.sessionId);
                  }, 1000); // Give PM time to set up
                }
              } else {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  error: 'Session not found' 
                }));
              }
            } else if (message.role === 'pm' && message.sessionId) {
              // PM registration for P2P
              const session = sessionManager.getSession(message.sessionId);
              if (session) {
                connectionManager.registerPM(message.sessionId, ws);
                registeredSessionId = message.sessionId;
                ws.send(JSON.stringify({ 
                  type: 'registered', 
                  sessionId: message.sessionId,
                  role: 'pm'
                }));
                
                // Check if P2P can be initiated
                if (connectionManager.isP2PAvailable(message.sessionId)) {
                  setTimeout(() => {
                    connectionManager.initiateP2P(message.sessionId);
                  }, 1000); // Give developer time if just connected
                }
              }
            }
            break;
          case 'register_session':
            // PM registration (existing code)
            handleSessionRegistration(ws, message.sessionId);
            break;
          case 'response':
            // Developer sending response to a forwarded request
            if (isDeveloper && registeredSessionId) {
              connectionManager.handleResponse(registeredSessionId, message);
            }
            break;
          case 'p2p:offer':
          case 'p2p:answer':
          case 'p2p:ice-candidate':
          case 'p2p:ready':
          case 'p2p:failed':
            // Handle P2P signaling messages
            if (registeredSessionId) {
              const signalingMessage: P2PSignalingMessage = {
                type: message.type,
                sessionId: registeredSessionId,
                from: isDeveloper ? 'developer' : 'pm',
                data: message.data
              };
              connectionManager.handleP2PSignaling(signalingMessage);
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (registeredSessionId) {
        if (isDeveloper) {
          connectionManager.handleDisconnection(registeredSessionId);
        } else {
          // PM disconnected
          connectionManager.unregisterPM(registeredSessionId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (registeredSessionId) {
        if (isDeveloper) {
          connectionManager.handleDisconnection(registeredSessionId);
        } else {
          // PM error
          connectionManager.unregisterPM(registeredSessionId);
        }
      }
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    /**
     * Handle session registration from WebSocket client
     */
    function handleSessionRegistration(ws: any, sessionId: string) {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Session not found'
        }));
        return;
      }

      // Store WebSocket reference for this session (in a real implementation,
      // you'd want a more sophisticated mapping)
      (ws as any).sessionId = sessionId;

      // Send current session status
      ws.send(JSON.stringify({
        type: 'session_update',
        session
      }));

      console.log(`Session ${sessionId} registered for WebSocket updates`);
    }
  });

  // Session cleanup interval
  const cleanupInterval = setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 60000); // Every minute

  // Start server
  server.listen(PORT, () => {
    console.log(`🪂 Wingman Tunnel Server running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    
    if (NODE_ENV === 'development') {
      console.log(`Test session creation: curl -X POST http://localhost:${PORT}/api/sessions -H "Content-Type: application/json" -d '{"developerId":"test","targetPort":3000}'`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    clearInterval(cleanupInterval);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    clearInterval(cleanupInterval);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  return { app, server, sessionManager, connectionManager };
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}