import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { errorHandler } from './middleware/error-handler';
import { createCorsMiddleware, corsDebugMiddleware } from './middleware/cors';
import { annotationsRouter } from './routes/annotations';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { tunnelRouter } from './routes/tunnel';
import { createSessionsRouter } from './routes/sessions';
import { StorageService } from './services/storage';
import { SessionManager } from './services/session-manager';
import { ConnectionManager } from './services/connection-manager';
import { ProxyHandler } from './services/proxy-handler';
import { createLogger } from '@wingman/shared';

export interface ServerOptions {
  port?: number;           // Server port (default: 8787)
  host?: string;           // Host to bind to (default: localhost)
  storagePath?: string;    // Path for storing annotations and sessions
  enableTunnel?: boolean;  // Auto-create tunnel on startup
  tunnelPort?: number;     // Port to tunnel (defaults to server port)
}

const logger = createLogger('Wingman:RelayServer');

export function createServer(options: ServerOptions = {}) {
  const app = express();
  const port = options.port ?? 8787;
  const host = options.host || 'localhost';
  const storagePath = options.storagePath || './.wingman/annotations';
  const sessionsPath = path.join(path.dirname(storagePath), 'sessions');
  const enableTunnel = options.enableTunnel || false;
  const tunnelPort = options.tunnelPort || port;

  // Initialize services
  const storage = new StorageService(storagePath);
  const sessionManager = new SessionManager(sessionsPath);
  const connectionManager = new ConnectionManager();
  const proxyHandler = new ProxyHandler(connectionManager, sessionManager);

  // CORS Middleware - configured for browser extensions
  app.use(corsDebugMiddleware); // Optional: logs CORS requests when DEBUG_CORS=true
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  });
  app.use('/annotations', limiter);

  // Routes
  app.use('/health', healthRouter);
  app.use('/annotations', annotationsRouter(storage));
  app.use('/mcp', mcpRouter(storage));
  app.use('/tunnel', tunnelRouter(sessionManager, connectionManager));
  app.use('/api', createSessionsRouter(sessionManager));
  
  // Proxy routes for tunneled requests
  app.use('/tunnel/:sessionId/*', proxyHandler.handleRequest.bind(proxyHandler));

  logger.debug('NODE_ENV:', process.env.NODE_ENV);

  // Serve webapp - proxy to dev server in development, static files in production
  // Skip webapp setup during testing to avoid proxy issues
  if (process.env.NODE_ENV !== 'test') {
    if (process.env.NODE_ENV === 'development') {
      logger.info('Using development mode - proxying to webapp dev server');
      
      // In development, proxy all non-API routes to the webapp dev server
      // But exclude API routes first
      const apiPaths = ['/api', '/annotations', '/tunnel', '/mcp', '/health', '/ws'];
      
      app.use((req, res, next) => {
        // Skip proxy for API routes
        if (apiPaths.some(path => req.path.startsWith(path))) {
          return next();
        }
        
        // Proxy everything else to webapp
        createProxyMiddleware({
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
          logger: console,
        })(req, res, next);
      });
    } else {
      // In production, serve static files
      const webappPath = path.resolve(process.cwd(), '../webapp/dist');
      
      // Serve static assets
      app.use(express.static(webappPath, {
        index: false, // Don't serve index.html for root, we'll handle it manually
        fallthrough: true,
      }));
      
      // Handle SPA routing - serve index.html for all non-API routes
      app.get('*', (req, res, next) => {
        // Skip for API routes
        const apiPaths = ['/api', '/annotations', '/tunnel', '/mcp', '/health', '/ws'];
        if (apiPaths.some(path => req.path.startsWith(path))) {
          return next();
        }
        
        // Serve index.html for everything else
        res.sendFile(path.join(webappPath, 'index.html'));
      });
    }
  }
  
  // Legacy redirect for old preview URLs
  app.get('/preview', (_req, res) => {
    res.redirect('/annotations');
  });
  app.get('/preview/*', (req, res) => {
    const newPath = req.path.replace('/preview', '');
    res.redirect(newPath);
  });

  // Error handler
  app.use(errorHandler);

  // Start server function
  const start = (): Promise<Server> => {
    return new Promise((resolve, reject) => {
      // Create HTTP server
      const server = createHttpServer(app);
      
      // Initialize WebSocket server
      const wss = new WebSocketServer({ server, path: '/ws' });
      
      /**
       * WebSocket connection handler.
       * Manages connections from both developers (local apps) and PMs (remote users).
       * Handles session registration, P2P signaling, and request forwarding.
       */
      wss.on('connection', (ws, request) => {
        logger.debug('WebSocket connection established');
        let registeredSessionId: string | null = null;
        let isDeveloper = false;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            logger.debug('WebSocket message received:', message.type);

            switch (message.type) {
              case 'register':
                // Handle developer or PM registration for a session
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
                    
                    // Update session status
                    sessionManager.updateSession(message.sessionId, { status: 'active' });
                    
                    // Check if P2P can be initiated
                    if (connectionManager.isP2PAvailable(message.sessionId)) {
                      setTimeout(() => {
                        connectionManager.initiateP2P(message.sessionId);
                      }, 1000);
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
                      }, 1000);
                    }
                  }
                }
                break;
              case 'response':
                // Developer sending response to a forwarded HTTP request (relay mode)
                if (isDeveloper && registeredSessionId) {
                  connectionManager.handleResponse(registeredSessionId, message);
                }
                break;
              case 'p2p:offer':
              case 'p2p:answer':
              case 'p2p:ice-candidate':
              case 'p2p:ready':
              case 'p2p:failed':
                // P2P WebRTC signaling for direct browser-to-browser connection
                if (registeredSessionId) {
                  connectionManager.handleP2PSignaling({
                    type: message.type,
                    sessionId: registeredSessionId,
                    from: isDeveloper ? 'developer' : 'pm',
                    data: message.data
                  });
                }
                break;
              case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
              default:
                logger.debug('Unknown WebSocket message type:', message.type);
            }
          } catch (error) {
            logger.error('Error handling WebSocket message:', error);
          }
        });

        ws.on('close', () => {
          logger.debug('WebSocket connection closed');
          if (registeredSessionId) {
            if (isDeveloper) {
              connectionManager.handleDisconnection(registeredSessionId);
              sessionManager.updateSession(registeredSessionId, { status: 'pending' });
            } else {
              connectionManager.unregisterPM(registeredSessionId);
            }
          }
        });

        ws.on('error', (error) => {
          logger.error('WebSocket error:', error);
        });

        // Send initial connection confirmation
        ws.send(JSON.stringify({
          type: 'connected',
          timestamp: Date.now()
        }));
      });
      
      // Session cleanup interval
      const cleanupInterval = setInterval(() => {
        sessionManager.cleanupExpiredSessions();
      }, 60000); // Every minute
      
      // Store cleanup interval on server for cleanup
      (server as any).cleanupInterval = cleanupInterval;
      
      // Start listening
      server
        .listen(port, host, () => {
          const address = server.address();
          const actualPort =
            typeof address === 'string' ? parseInt(address) : address?.port || port;
          logger.info(`🪶 Wingman Unified Server running on http://${host}:${actualPort}`);
          logger.info(`Health check: http://${host}:${actualPort}/health`);
          logger.info(`Annotations endpoint: http://${host}:${actualPort}/annotations`);
          logger.info(`WebSocket endpoint: ws://${host}:${actualPort}/ws`);
          logger.info(`🪶 MCP endpoint: http://${host}:${actualPort}/mcp (for Claude Code)`);
          
          if (enableTunnel) {
            logger.info(`Tunnel enabled for port ${tunnelPort}`);
            // TODO: Auto-create tunnel session
          }
          
          resolve(server);
        })
        .on('error', reject);
    });
  };

  return { app, start, sessionManager, connectionManager };
}

// If running directly (not imported)
if (require.main === module) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
  const HOST = process.env.HOST || 'localhost';
  
  let server: Server | null = null;

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    if (server) {
      // Clear cleanup interval
      if ((server as any).cleanupInterval) {
        clearInterval((server as any).cleanupInterval);
      }
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force exit after 5 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    } else {
      process.exit(0);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  createServer({ port: PORT, host: HOST })
    .start()
    .then((s) => {
      server = s;
    })
    .catch((error) => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });
}
