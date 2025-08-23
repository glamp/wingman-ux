import express from 'express';
import rateLimit from 'express-rate-limit';
import type { Server } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { errorHandler } from './middleware/error-handler';
import { createCorsMiddleware, corsDebugMiddleware } from './middleware/cors';
import { annotationsRouter } from './routes/annotations';
import { healthRouter } from './routes/health';
import { mcpRouter } from './routes/mcp';
import { tunnelRouter } from './routes/tunnel';
import { StorageService } from './services/storage';
import { createLogger } from '@wingman/shared';

export interface ServerOptions {
  port?: number;
  host?: string;
  storagePath?: string;
}

const logger = createLogger('Wingman:RelayServer');

export function createServer(options: ServerOptions = {}) {
  const app = express();
  const port = options.port ?? 8787;
  const host = options.host || 'localhost';
  const storagePath = options.storagePath || './wingman/annotations';

  // Initialize storage
  const storage = new StorageService(storagePath);

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
  app.use('/tunnel', tunnelRouter());

  logger.debug('NODE_ENV:', process.env.NODE_ENV);

  // Serve preview UI - proxy to dev server in development, static files in production
  // Skip preview UI setup during testing to avoid proxy issues
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV === 'development') {
    logger.info('Using development mode - proxying to preview UI dev server');
    // In development, proxy to the preview UI dev server
    app.use(
      '/preview',
      createProxyMiddleware({
        target: 'http://localhost:3001/preview',
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/preview': '', // Remove /preview prefix since target already includes it
        },
        logger: console,
        on: {
          proxyReq: (proxyReq, req) => {
            logger.debug('Proxying:', req.method, req.url, '->', proxyReq.path);
          },
        },
      })
    );
  } else {
    // In production, serve static files
    const previewUIPath = path.resolve(process.cwd(), '../preview-ui/dist');
    app.use(
      '/preview',
      express.static(previewUIPath, {
        index: 'index.html',
        fallthrough: false,
      })
    );

    // Handle preview UI routes - serve index.html for SPA routing
    app.get('/preview/*', (_req, res) => {
      res.sendFile(path.join(previewUIPath, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  // Start server function
  const start = (): Promise<Server> => {
    return new Promise((resolve, reject) => {
      const server = app
        .listen(port, host, () => {
          const address = server.address();
          const actualPort =
            typeof address === 'string' ? parseInt(address) : address?.port || port;
          logger.info(`🪶 Wingman Relay Server running on http://${host}:${actualPort}`);
          logger.info(`Health check: http://${host}:${actualPort}/health`);
          logger.info(`Annotations endpoint: http://${host}:${actualPort}/annotations`);
          logger.info(`🪶 MCP endpoint: http://${host}:${actualPort}/mcp (for Claude Code)`);
          resolve(server);
        })
        .on('error', reject);
    });
  };

  return { app, start };
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
