import { Router } from 'express';
import type { WingmanAnnotation, RelayResponse } from '@wingman/shared';
import type { StorageService } from '../services/storage';
import { SearchService } from '../services/search';

export function annotationsRouter(storage: StorageService): Router {
  const router = Router();
  const searchService = new SearchService();

  // POST /annotations - Create new annotation
  router.post('/', async (req, res, next) => {
    try {
      const annotation: WingmanAnnotation = req.body;
      
      // Basic validation
      if (!annotation.id) {
        return res.status(422).json({
          error: 'Schema validation failed',
          code: 'SCHEMA_ERROR',
          details: {
            missing: ['id'],
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

  // GET /annotations/search - Search annotations
  router.get('/search', async (req, res, next) => {
    try {
      const query = req.query.q as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate query
      if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      // Get all annotations
      const allAnnotations = await storage.getAllAnnotations();

      // Use search service for better search functionality
      const searchResult = searchService.search(allAnnotations, {
        query,
        limit,
        offset
      });

      res.json(searchResult);
    } catch (error) {
      // Handle validation errors
      if (error instanceof Error && error.message === 'Query parameter is required') {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Error searching annotations:', error);
      res.status(500).json({ 
        error: 'Failed to search annotations',
        code: 'SEARCH_ERROR'
      });
    }
  });

  // GET /annotations/stats - Get annotation statistics (must come before /:id)
  router.get('/stats', async (req, res, next) => {
    try {
      const { from, to } = req.query;

      // Validate date parameters if provided
      if (from && isNaN(Date.parse(from as string))) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      if (to && isNaN(Date.parse(to as string))) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const fromDate = from ? new Date(from as string) : null;
      const toDate = to ? new Date(to as string) : null;

      // Get all annotations
      const annotations = await storage.getAllAnnotations();

      // Filter by date range if provided
      const filteredAnnotations = annotations.filter(annotation => {
        if (!annotation.createdAt) return false;
        
        const annotationDate = new Date(annotation.createdAt);
        
        if (fromDate && annotationDate < fromDate) return false;
        if (toDate && annotationDate > toDate) return false;
        
        return true;
      });

      // Calculate statistics
      const stats = {
        totalAnnotations: filteredAnnotations.length,
        annotationsByMode: {
          element: 0,
          region: 0
        },
        annotationsByHour: {} as Record<string, number>,
        topPages: [] as Array<{ url: string; count: number }>,
        averageNoteLength: 0,
        lastAnnotationTime: null as string | null
      };

      if (filteredAnnotations.length === 0) {
        return res.json(stats);
      }

      // Count by mode
      const pageCount = new Map<string, number>();
      let totalNoteLength = 0;
      let notesCount = 0;

      filteredAnnotations.forEach(annotation => {
        // Count by mode
        if (annotation.target?.mode === 'element') {
          stats.annotationsByMode.element++;
        } else if (annotation.target?.mode === 'region') {
          stats.annotationsByMode.region++;
        }

        // Count by hour
        if (annotation.createdAt) {
          const hour = new Date(annotation.createdAt).getUTCHours().toString();
          stats.annotationsByHour[hour] = (stats.annotationsByHour[hour] || 0) + 1;
        }

        // Count pages
        if (annotation.page?.url) {
          const count = pageCount.get(annotation.page.url) || 0;
          pageCount.set(annotation.page.url, count + 1);
        }

        // Calculate note length
        if (annotation.note) {
          totalNoteLength += annotation.note.length;
          notesCount++;
        }
      });

      // Calculate average note length
      stats.averageNoteLength = notesCount > 0 ? Math.round(totalNoteLength / notesCount) : 0;

      // Get top pages (limited to 10)
      stats.topPages = Array.from(pageCount.entries())
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get last annotation time
      const sortedAnnotations = filteredAnnotations
        .filter(a => a.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      
      if (sortedAnnotations.length > 0) {
        stats.lastAnnotationTime = sortedAnnotations[0].createdAt!;
      }

      res.json(stats);
    } catch (error) {
      console.error('Error getting annotation stats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve annotation statistics',
        code: 'STATS_ERROR'
      });
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