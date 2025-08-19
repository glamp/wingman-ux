import { Router } from 'express';
import type { WingmanAnnotation, RelayResponse } from '@wingman/shared';
import type { StorageService } from '../services/storage';

export function annotationsRouter(storage: StorageService): Router {
  const router = Router();

  // POST /annotations - Create new annotation
  router.post('/', async (req, res, next) => {
    try {
      const annotation: WingmanAnnotation = req.body;
      
      // Basic validation
      if (!annotation.id || !annotation.note) {
        return res.status(422).json({
          error: 'Schema validation failed',
          code: 'SCHEMA_ERROR',
          details: {
            missing: [
              !annotation.id && 'id',
              !annotation.note && 'note',
            ].filter(Boolean),
          },
        });
      }

      const stored = await storage.save(annotation);
      
      const response: RelayResponse = {
        id: stored.id,
        receivedAt: stored.receivedAt,
      };

      res.status(201)
        .location(`/annotations/${stored.id}`)
        .json(response);
    } catch (error) {
      next(error);
    }
  });

  // GET /annotations/last - Get most recent annotation
  router.get('/last', async (_req, res, next) => {
    try {
      const annotation = await storage.getLast();
      
      if (!annotation) {
        return res.status(404).json({
          error: 'No annotations found',
          code: 'NOT_FOUND',
        });
      }

      res.json(annotation);
    } catch (error) {
      next(error);
    }
  });

  // GET /annotations/:id - Get specific annotation
  router.get('/:id', async (req, res, next) => {
    try {
      const annotation = await storage.get(req.params.id);
      
      if (!annotation) {
        return res.status(404).json({
          error: 'Annotation not found',
          code: 'NOT_FOUND',
        });
      }

      res.json(annotation);
    } catch (error) {
      next(error);
    }
  });

  // GET /annotations - List annotations
  router.get('/', async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const since = req.query.since as string;
      
      const items = await storage.list({ limit, since });
      
      res.json({
        items,
        nextCursor: items.length === limit ? items[items.length - 1]?.id : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /annotations/:id/preview - Redirect to preview UI
  router.get('/:id/preview', async (req, res, next) => {
    try {
      const annotation = await storage.get(req.params.id);
      
      if (!annotation) {
        return res.status(404).json({
          error: 'Annotation not found',
          code: 'NOT_FOUND',
        });
      }

      // Redirect to preview UI with annotation ID
      res.redirect(`/preview/?id=${req.params.id}`);
    } catch (error) {
      next(error);
    }
  });

  // GET /annotations/:id/preview-data - API endpoint for preview UI
  router.get('/:id/preview-data', async (req, res, next) => {
    try {
      const annotation = await storage.get(req.params.id);
      
      if (!annotation) {
        return res.status(404).json({
          error: 'Annotation not found',
          code: 'NOT_FOUND',
        });
      }

      res.json(annotation);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /annotations/:id - Delete annotation (dev only)
  router.delete('/:id', async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Delete not allowed in production',
          code: 'FORBIDDEN',
        });
      }

      const deleted = await storage.delete(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Annotation not found',
          code: 'NOT_FOUND',
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}