import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { annotationsRouter } from './routes/annotations';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { StorageService } from './services/storage';
import type { Server } from 'http';

export interface ServerOptions {
  port?: number;
  host?: string;
}

export function createServer(options: ServerOptions = {}) {
  const app = express();
  const port = options.port || 8787;
  const host = options.host || 'localhost';

  // Initialize storage
  const storage = new StorageService('./wingman/annotations');

  // Middleware
  app.use(cors());
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

  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // Serve preview UI - proxy to dev server in development, static files in production
  if (process.env.NODE_ENV === 'development') {
    console.log('Using development mode - proxying to preview UI dev server');
    // In development, proxy to the preview UI dev server
    app.use('/preview', createProxyMiddleware({
      target: 'http://localhost:3001/preview',
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/preview': '' // Remove /preview prefix since target already includes it
      },
      logger: console,
      on: {
        proxyReq: (proxyReq, req) => {
          console.log('Proxying:', req.method, req.url, '->', proxyReq.path);
        }
      }
    }));
  } else {
    // In production, serve static files
    const previewUIPath = path.resolve(process.cwd(), '../preview-ui/dist');
    app.use('/preview', express.static(previewUIPath, {
      index: 'index.html',
      fallthrough: false
    }));

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
      const server = app.listen(port, host, () => {
        console.log(`Wingman Relay Server running on http://${host}:${port}`);
        console.log(`Health check: http://${host}:${port}/health`);
        console.log(`Annotations endpoint: http://${host}:${port}/annotations`);
        resolve(server);
      }).on('error', reject);
    });
  };

  return { app, start };
}

// If running directly (not imported)
if (require.main === module) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
  const HOST = process.env.HOST || 'localhost';
  
  createServer({ port: PORT, host: HOST }).start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}