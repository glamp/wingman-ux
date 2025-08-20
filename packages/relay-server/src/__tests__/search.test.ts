import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';
import type { Express } from 'express';
import type { Server } from 'http';
import fs from 'fs/promises';
import { WingmanAnnotation } from '@wingman/shared';

describe('Annotation Search API (TDD)', () => {
  let app: Express;
  let server: Server;
  let actualPort: number;
  const annotationsDir = './test-search-wingman/annotations';

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

  describe('GET /annotations/search', () => {
    it('should return empty results when no annotations match', async () => {
      const response = await request(app)
        .get('/annotations/search')
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body).toEqual({
        results: [],
        total: 0,
        query: 'nonexistent',
        hasMore: false
      });
    });

    it('should search annotations by note content', async () => {
      // Create test annotations
      const annotations: WingmanAnnotation[] = [
        {
          id: 'test-1',
          createdAt: new Date().toISOString(),
          note: 'Button is not working properly',
          page: {
            url: 'https://example.com/page1',
            title: 'Page 1',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            selector: '.button'
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
          createdAt: new Date().toISOString(),
          note: 'Form validation error',
          page: {
            url: 'https://example.com/page2',
            title: 'Page 2',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            selector: '.form'
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
          id: 'test-3',
          createdAt: new Date().toISOString(),
          note: 'Button color should be blue',
          page: {
            url: 'https://example.com/page3',
            title: 'Page 3',
            ua: 'Mozilla/5.0',
            viewport: { w: 1920, h: 1080, dpr: 1 }
          },
          target: {
            mode: 'element',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            selector: '.button-primary'
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

      // Post all annotations
      for (const annotation of annotations) {
        await request(app)
          .post('/annotations')
          .send(annotation)
          .expect(201);
      }

      // Search for "button"
      const response = await request(app)
        .get('/annotations/search')
        .query({ q: 'button' })
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.query).toBe('button');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].note).toContain('Button');
      expect(response.body.results[1].note).toContain('Button');
    });

    it('should search annotations by URL', async () => {
      const annotations: WingmanAnnotation[] = [
        {
          id: 'url-test-1',
          createdAt: new Date().toISOString(),
          note: 'Test note 1',
          page: {
            url: 'https://app.example.com/dashboard',
            title: 'Dashboard',
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
          id: 'url-test-2',
          createdAt: new Date().toISOString(),
          note: 'Test note 2',
          page: {
            url: 'https://app.example.com/settings',
            title: 'Settings',
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
          id: 'url-test-3',
          createdAt: new Date().toISOString(),
          note: 'Test note 3',
          page: {
            url: 'https://blog.example.com/post',
            title: 'Blog Post',
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
        }
      ];

      for (const annotation of annotations) {
        await request(app)
          .post('/annotations')
          .send(annotation)
          .expect(201);
      }

      // Search for URLs containing "dashboard"
      const response = await request(app)
        .get('/annotations/search')
        .query({ q: 'dashboard' })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.results[0].page.url).toContain('dashboard');
    });

    it('should support pagination', async () => {
      // Create 10 annotations
      const annotations: WingmanAnnotation[] = [];
      for (let i = 1; i <= 10; i++) {
        annotations.push({
          id: `page-test-${i}`,
          createdAt: new Date().toISOString(),
          note: `Test annotation number ${i}`,
          page: {
            url: 'https://example.com',
            title: 'Test Page',
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
        });
      }

      for (const annotation of annotations) {
        await request(app)
          .post('/annotations')
          .send(annotation)
          .expect(201);
      }

      // Get first page
      const page1 = await request(app)
        .get('/annotations/search')
        .query({ q: 'Test', limit: 5, offset: 0 })
        .expect(200);

      expect(page1.body.results).toHaveLength(5);
      expect(page1.body.total).toBe(10);
      expect(page1.body.hasMore).toBe(true);

      // Get second page
      const page2 = await request(app)
        .get('/annotations/search')
        .query({ q: 'Test', limit: 5, offset: 5 })
        .expect(200);

      expect(page2.body.results).toHaveLength(5);
      expect(page2.body.total).toBe(10);
      expect(page2.body.hasMore).toBe(false);
    });

    it('should be case-insensitive', async () => {
      const annotation: WingmanAnnotation = {
        id: 'case-test',
        createdAt: new Date().toISOString(),
        note: 'The BUTTON is BROKEN',
        page: {
          url: 'https://example.com',
          title: 'Test Page',
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

      // Search with lowercase
      const response1 = await request(app)
        .get('/annotations/search')
        .query({ q: 'button' })
        .expect(200);

      expect(response1.body.total).toBe(1);

      // Search with uppercase
      const response2 = await request(app)
        .get('/annotations/search')
        .query({ q: 'BUTTON' })
        .expect(200);

      expect(response2.body.total).toBe(1);

      // Search with mixed case
      const response3 = await request(app)
        .get('/annotations/search')
        .query({ q: 'BuTtOn' })
        .expect(200);

      expect(response3.body.total).toBe(1);
    });

    it('should validate query parameter', async () => {
      // Empty query
      const response1 = await request(app)
        .get('/annotations/search')
        .query({ q: '' })
        .expect(400);

      expect(response1.body.error).toBe('Query parameter is required');

      // Missing query
      const response2 = await request(app)
        .get('/annotations/search')
        .expect(400);

      expect(response2.body.error).toBe('Query parameter is required');
    });

    it('should handle special characters in search', async () => {
      const annotation: WingmanAnnotation = {
        id: 'special-chars',
        createdAt: new Date().toISOString(),
        note: 'The @submit button doesn\'t work with user+test@example.com',
        page: {
          url: 'https://example.com?param=value&other=123',
          title: 'Test Page',
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

      // Search for email
      const response1 = await request(app)
        .get('/annotations/search')
        .query({ q: 'user+test@example.com' })
        .expect(200);

      expect(response1.body.total).toBe(1);

      // Search for @submit
      const response2 = await request(app)
        .get('/annotations/search')
        .query({ q: '@submit' })
        .expect(200);

      expect(response2.body.total).toBe(1);
    });
  });
});