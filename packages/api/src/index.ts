import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { errorHandler } from './middleware/error-handler';
import { createCorsMiddleware, corsDebugMiddleware } from './middleware/cors';
import { createSubdomainProxyMiddleware } from './middleware/subdomain-proxy';
import { annotationsRouter } from './routes/annotations';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { tunnelRouter } from './routes/tunnel';
import { createSessionsRouter } from './routes/sessions';
import { StorageService } from './services/storage';
import { SessionManager } from './services/session-manager';
import { ConnectionManager } from './services/connection-manager';
import { ProxyHandler } from './services/proxy-handler';
import { TunnelProxy } from './services/tunnel-proxy';
import { ShareManager } from './services/share-manager';
import { createLogger } from '@wingman/shared';

export interface ServerOptions {
  port?: number;           // Server port (default: 8787)
  host?: string;           // Host to bind to (default: localhost)
  storagePath?: string;    // Path for storing annotations and sessions
  enableTunnel?: boolean;  // Auto-create tunnel on startup
  tunnelPort?: number;     // Port to tunnel (defaults to server port)
}

const logger = createLogger('Wingman:RelayServer');

/**
 * Check if buffer contains text data (not binary)
 * Binary data typically starts with non-printable characters
 */
function isTextData(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  
  // Check first few bytes for non-printable characters
  // Text data should be printable ASCII/UTF-8
  const sample = buffer.subarray(0, Math.min(100, buffer.length));
  
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Check for common binary file signatures or non-printable bytes
    if (byte !== undefined && byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      // Allow tab (9), LF (10), CR (13) but reject other control chars
      return false;
    }
  }
  
  return true;
}

export function createServer(options: ServerOptions = {}) {
  const app = express();
  const port = options.port ?? 8787;
  const host = options.host || 'localhost';
  // Use environment variable for storage path in production
  const baseStoragePath = process.env.STORAGE_PATH || options.storagePath || './.wingman';
  const storagePath = path.join(baseStoragePath, 'annotations');
  const sessionsPath = path.join(baseStoragePath, 'sessions');
  const enableTunnel = options.enableTunnel || false;
  const tunnelPort = options.tunnelPort || port;

  // Initialize services
  const storage = new StorageService(storagePath);
  const sessionManager = new SessionManager(sessionsPath);
  const connectionManager = new ConnectionManager();
  const proxyHandler = new ProxyHandler(connectionManager, sessionManager);
  const tunnelProxy = new TunnelProxy(sessionManager, connectionManager);
  const shareManager = new ShareManager(path.join(path.dirname(storagePath), 'shares'));

  // CORS Middleware - configured for browser extensions
  app.use(corsDebugMiddleware); // Optional: logs CORS requests when DEBUG_CORS=true
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Subdomain-based tunnel routing - MUST come before other routes
  // This handles requests like session-id.wingmanux.com
  // Using new improved tunnel proxy with proper timeouts
  app.use(tunnelProxy.middleware());

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
  app.use('/tunnel', tunnelRouter(sessionManager, connectionManager, shareManager));
  app.use('/api', createSessionsRouter(sessionManager));
  
  // Store console output for debugging (since logs aren't accessible)
  const consoleOutput: string[] = [];
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    consoleOutput.push(`${new Date().toISOString()}: ${message}`);
    // Keep last 50 messages
    if (consoleOutput.length > 50) {
      consoleOutput.shift();
    }
    originalConsoleLog(...args);
  };

  // Debug endpoint to check tunnel proxy behavior and see console output
  app.get('/debug/tunnel-proxy', (req, res) => {
    const host = req.headers.host || '';
    console.log('[DEBUG] /debug/tunnel-proxy accessed');
    console.log('[DEBUG] Host header:', host);
    console.log('[DEBUG] TUNNEL_BASE_URL:', process.env.TUNNEL_BASE_URL);
    console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
    
    res.json({
      host,
      message: 'Debug info from tunnel proxy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tunnelBaseUrl: process.env.TUNNEL_BASE_URL,
      consoleOutput: consoleOutput.slice(-20), // Last 20 messages
      request: {
        path: req.path,
        method: req.method,
        headers: Object.keys(req.headers)
      }
    });
  });
  
  // Proxy routes for tunneled requests
  app.use('/tunnel/:sessionId/*', proxyHandler.handleRequest.bind(proxyHandler));

  logger.debug('NODE_ENV:', process.env.NODE_ENV);
  logger.debug('CORS_ORIGIN:', process.env.CORS_ORIGIN);

  // Serve webapp in production, provide helpful message in development
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const webappDevUrl = process.env.WEBAPP_DEV_URL || 'http://localhost:3001';
  
  if (isDevelopment) {
    // In development, show helpful message for root access
    app.get('/', (req, res) => {
      // Check if this is a browser request (accepts HTML)
      if (req.accepts('html')) {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Wingman API Server</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              h1 { color: #333; }
              .info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .links { margin: 20px 0; }
              a { color: #0066cc; text-decoration: none; padding: 10px 15px; display: inline-block; background: #f5f5f5; border-radius: 3px; margin: 5px; }
              a:hover { background: #e0e0e0; }
              code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1>🦅 Wingman API Server</h1>
            <div class="info">
              <p>This is the API server running on port <strong>${port}</strong></p>
              <p>The web interface is available at:</p>
              <div class="links">
                <a href="${webappDevUrl}">Open Wingman UI</a>
                <a href="${webappDevUrl}/annotations">View Annotations</a>
                <a href="${webappDevUrl}/tunnels">Manage Tunnels</a>
              </div>
            </div>
            <div class="info">
              <p><strong>API Endpoints:</strong></p>
              <ul>
                <li><code>POST /annotations</code> - Submit annotation</li>
                <li><code>GET /annotations/:id</code> - Get annotation</li>
                <li><code>GET /health</code> - Health check</li>
                <li><code>WS /ws</code> - WebSocket connection</li>
              </ul>
            </div>
            <div class="info">
              <p>To view a specific annotation preview, use:</p>
              <code>${webappDevUrl}/annotations?id=YOUR_ANNOTATION_ID</code>
            </div>
          </body>
          </html>
        `);
      } else {
        res.json({ 
          message: 'Wingman API Server',
          webapp: webappDevUrl,
          endpoints: {
            annotations: '/annotations',
            health: '/health',
            tunnel: '/tunnel',
            mcp: '/mcp',
            websocket: '/ws'
          }
        });
      }
    });
  } else {
    // In production, serve the built webapp
    const webappPath = path.join(__dirname, '../../webapp/dist');
    if (require('fs').existsSync(webappPath)) {
      // Serve static files
      app.use(express.static(webappPath));
      
      // Catch-all route for client-side routing
      app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api') || 
            req.path.startsWith('/annotations') || 
            req.path.startsWith('/tunnel') || 
            req.path.startsWith('/mcp') || 
            req.path.startsWith('/health') ||
            req.path.startsWith('/ws')) {
          return next();
        }
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
      
      // Initialize WebSocket server with compression disabled
      const wss = new WebSocketServer({ 
        server, 
        path: '/ws',
        perMessageDeflate: false // Disable compression to avoid RSV1 issues
      });
      
      // Handle WebSocket upgrade for tunnel subdomains
      server.on('upgrade', (request, socket, head) => {
        // Check if this is a tunnel WebSocket upgrade
        const host = request.headers.host || '';
        
        // Extract and validate subdomain using the same logic as HTTP
        const hostname = host.split(':')[0];
        const parts = hostname?.split('.') || [];
        
        if (parts.length >= 2) {
          const subdomain = parts[0]?.toLowerCase();
          
          // Check if it's a valid tunnel session ID (word-word format)
          // This prevents api.wingmanux.com from being intercepted
          if (subdomain && /^[a-z]+-[a-z]+$/i.test(subdomain)) {
            const handler = tunnelProxy.handleUpgrade();
            handler(request, socket, head);
          }
        }
        // Let all other requests (including api.wingmanux.com) pass through to main WebSocket server
      });
      
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
            // Skip JSON parsing for binary data (tunnel proxy handles these separately)
            if (data instanceof Buffer && !isTextData(data)) {
              // Binary data is handled by tunnel proxy, not main WebSocket handler
              return;
            }
            
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
          } catch (error: any) {
            // Don't log JSON parsing errors for binary data - these are expected
            if (error.message && error.message.includes('Unexpected token') && error.message.includes('not valid JSON')) {
              logger.debug('Skipping binary data frame (handled by tunnel proxy)');
            } else {
              logger.error('Error handling WebSocket message:', error);
            }
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
