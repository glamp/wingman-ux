import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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