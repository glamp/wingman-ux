import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';
import type { Express } from 'express';
import type { Server } from 'http';
import fs from 'fs/promises';
import { WingmanAnnotation } from '@wingman/shared';

describe('Annotation Statistics API (TDD)', () => {
  let app: Express;
  let server: Server;
  let actualPort: number;
  const annotationsDir = './test-stats-wingman/annotations';

  beforeEach(async () => {
    // Clean up any existing annotations
    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }

    const serverInstance = createServer({ port: 0, host: 'localhost', storagePath: annotationsDir });
    app = serverInstance.app;
    server = await serverInstance.start();
    
    const address = server.address();
    actualPort = typeof address === 'string' ? parseInt(address) : address!.port;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  });

  describe('GET /annotations/stats', () => {
    it('should return empty stats when no annotations exist', async () => {
      const response = await request(app)
        .get('/annotations/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAnnotations: 0,
        annotationsByMode: {
          element: 0,
          region: 0
        },
        annotationsByHour: {},
        topPages: [],
        averageNoteLength: 0,
        lastAnnotationTime: null
      });
    });

    it('should return correct stats for multiple annotations', async () => {
      // Create test annotations
      const annotations: WingmanAnnotation[] = [
        {
          id: 'test-1',
          createdAt: new Date('2025-01-20T10:00:00Z').toISOString(),
          note: 'First test comment',
          page: {
            url: 'https://example.com/page1',
            title: 'Page 1',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            selector: '.test'
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test'
            }
          },
          console: [],
          errors: [],
          network: []
        },
        {
          id: 'test-2',
          createdAt: new Date('2025-01-20T10:30:00Z').toISOString(),
          note: 'Second comment here',
          page: {
            url: 'https://example.com/page1',
            title: 'Page 1',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'region',
            rect: { x: 50, y: 50, width: 200, height: 200 }
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test2'
            }
          },
          console: [],
          errors: [],
          network: []
        },
        {
          id: 'test-3',
          createdAt: new Date('2025-01-20T11:15:00Z').toISOString(),
          note: 'Third',
          page: {
            url: 'https://example.com/page2',
            title: 'Page 2',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 100, y: 100, width: 150, height: 150 },
            selector: '#button'
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test3'
            }
          },
          console: [],
          errors: [],
          network: []
        }
      ];

      // Post all annotations
      for (const annotation of annotations) {
        await request(app)
          .post('/annotations')
          .send(annotation)
          .expect(201);
      }

      // Get stats
      const response = await request(app)
        .get('/annotations/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalAnnotations: 3,
        annotationsByMode: {
          element: 2,
          region: 1
        },
        annotationsByHour: {
          '10': 2,
          '11': 1
        },
        topPages: [
          { url: 'https://example.com/page1', count: 2 },
          { url: 'https://example.com/page2', count: 1 }
        ],
        averageNoteLength: Math.round((18 + 18 + 5) / 3),
        lastAnnotationTime: '2025-01-20T11:15:00.000Z'
      });
    });

    it('should handle annotations without notes gracefully', async () => {
      const annotation: WingmanAnnotation = {
        id: 'no-note-test',
        createdAt: new Date().toISOString(),
        note: undefined,
        page: {
          url: 'https://example.com',
          title: 'Test',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'data:image/png;base64,test'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      await request(app)
        .post('/annotations')
        .send(annotation)
        .expect(201);

      const response = await request(app)
        .get('/annotations/stats')
        .expect(200);

      expect(response.body.averageNoteLength).toBe(0);
    });

    it('should limit top pages to 10 entries', async () => {
      // Create annotations for 15 different pages
      const promises = [];
      for (let i = 1; i <= 15; i++) {
        const annotation: WingmanAnnotation = {
          id: `test-page-${i}`,
          createdAt: new Date().toISOString(),
          note: `Note ${i}`,
          page: {
            url: `https://example.com/page${i}`,
            title: `Page ${i}`,
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 }
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test'
            }
          },
          console: [],
          errors: [],
          network: []
        };

        promises.push(
          request(app)
            .post('/annotations')
            .send(annotation)
        );
      }

      await Promise.all(promises);

      const response = await request(app)
        .get('/annotations/stats')
        .expect(200);

      expect(response.body.topPages).toHaveLength(10);
      expect(response.body.totalAnnotations).toBe(15);
    });
  });

  describe('GET /annotations/stats with date filters', () => {
    it('should filter annotations by date range', async () => {
      const annotations: WingmanAnnotation[] = [
        {
          id: 'old-annotation',
          createdAt: new Date('2025-01-10T10:00:00Z').toISOString(),
          note: 'Old',
          page: {
            url: 'https://example.com',
            title: 'Page',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 }
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test'
            }
          },
          console: [],
          errors: [],
          network: []
        },
        {
          id: 'recent-annotation',
          createdAt: new Date('2025-01-20T10:00:00Z').toISOString(),
          note: 'Recent',
          page: {
            url: 'https://example.com',
            title: 'Page',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'region',
            rect: { x: 0, y: 0, width: 100, height: 100 }
          },
          media: {
            screenshot: {
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,test'
            }
          },
          console: [],
          errors: [],
          network: []
        }
      ];

      for (const annotation of annotations) {
        await request(app)
          .post('/annotations')
          .send(annotation)
          .expect(201);
      }

      // Filter to only recent annotations
      const response = await request(app)
        .get('/annotations/stats')
        .query({
          from: '2025-01-15T00:00:00Z',
          to: '2025-01-25T00:00:00Z'
        })
        .expect(200);

      expect(response.body.totalAnnotations).toBe(1);
      expect(response.body.annotationsByMode.region).toBe(1);
      expect(response.body.annotationsByMode.element).toBe(0);
    });

    it('should validate date format in query parameters', async () => {
      const response = await request(app)
        .get('/annotations/stats')
        .query({
          from: 'invalid-date'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid date format');
    });
  });
});