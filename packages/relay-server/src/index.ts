import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { annotationsRouter } from './routes/annotations';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { StorageService } from './services/storage';

const app = express();
const PORT = process.env.PORT || 8787;

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

// Start server
app.listen(PORT, () => {
  console.log(`Wingman Relay Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Annotations endpoint: http://localhost:${PORT}/annotations`);
});