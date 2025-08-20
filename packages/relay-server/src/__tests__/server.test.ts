import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';
import type { Express } from 'express';
import type { Server } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { WingmanAnnotation } from '@wingman/shared';

describe('Relay Server', () => {
  let app: Express;
  let server: Server;
  let actualPort: number;
  const annotationsDir = './test-wingman/annotations';

  beforeEach(async () => {
    // Clean up any existing annotations
    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }

    const serverInstance = createServer({ port: 0, host: 'localhost', storagePath: annotationsDir }); // Use port 0 for dynamic allocation
    app = serverInstance.app;
    server = await serverInstance.start();
    
    // Get the actual port that was assigned
    const address = server.address();
    actualPort = typeof address === 'string' ? parseInt(address) : address!.port;
  });

  afterEach(async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Clean up test annotations
    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchSnapshot({
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('POST /annotations', () => {
    it('should accept valid annotation', async () => {
      const annotation: WingmanAnnotation = {
        id: 'test-annotation-123',
        createdAt: new Date().toISOString(),
        note: 'Test comment',
        page: {
          url: 'https://example.com',
          title: 'Test Page',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 },
          selector: '.test-class'
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const response = await request(app)
        .post('/annotations')
        .send(annotation)
        .expect(201);

      expect(response.body).toMatchSnapshot({
        id: expect.any(String),
        receivedAt: expect.any(String)
      });
      
      // Verify file was created
      const files = await fs.readdir(annotationsDir);
      expect(files).toHaveLength(1);
    });

    it('should return 422 for invalid annotation', async () => {
      const invalidAnnotation = {
        // Missing required fields
        createdAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/annotations')
        .send(invalidAnnotation)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large screenshots', async () => {
      // Create a large base64 string (simulate large screenshot)
      const largeData = 'A'.repeat(1024 * 1024); // 1MB of 'A's
      const annotation: WingmanAnnotation = {
        id: 'large-test',
        createdAt: new Date().toISOString(),
        note: 'Test large screenshot',
        page: {
          url: 'https://example.com',
          title: 'Test Page',
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
            dataUrl: `data:image/png;base64,${largeData}`
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const response = await request(app)
        .post('/annotations')
        .send(annotation);
        
      if (response.status !== 201) {
        console.log('Error response:', response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('receivedAt');
    });
  });

  describe('GET /annotations/last', () => {
    it('should return the last annotation', async () => {
      // Create two annotations
      const annotation1: WingmanAnnotation = {
        id: 'first-annotation',
        createdAt: new Date(Date.now() - 1000).toISOString(),
        note: 'First comment',
        page: {
          url: 'https://example.com/1',
          title: 'First Page',
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
            dataUrl: 'data:image/png;base64,test1'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const annotation2: WingmanAnnotation = {
        id: 'second-annotation',
        createdAt: new Date().toISOString(),
        note: 'Second comment',
        page: {
          url: 'https://example.com/2',
          title: 'Second Page',
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
            dataUrl: 'data:image/png;base64,test2'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      await request(app).post('/annotations').send(annotation1).expect(201);
      await request(app).post('/annotations').send(annotation2).expect(201);

      const response = await request(app)
        .get('/annotations/last')
        .expect(200);

      expect(response.body.annotation.id).toBe('second-annotation');
      expect(response.body.annotation.note).toBe('Second comment');
    });

    it('should return 404 when no annotations exist', async () => {
      const response = await request(app)
        .get('/annotations/last')
        .expect(404);

      expect(response.body).toMatchSnapshot();
      expect(response.body.error).toBe('No annotations found');
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on /annotations', async () => {
      const annotation: WingmanAnnotation = {
        id: 'rate-limit-test',
        createdAt: new Date().toISOString(),
        note: 'Test',
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

      // Make 100 requests (the limit)
      const promises = Array(100).fill(null).map(() => 
        request(app).post('/annotations').send(annotation)
      );
      
      await Promise.all(promises);

      // The 101st request should be rate limited
      const response = await request(app)
        .post('/annotations')
        .send(annotation)
        .expect(429);

      expect(response.text).toContain('Too many requests');
    });
  });

  describe('CORS', () => {
    it('should allow CORS requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});