import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../index.js';
import type { Express } from 'express';

describe('Relay Server CORS Configuration', () => {
  let app: Express;

  beforeEach(() => {
    const server = createServer({ port: 0 }); // Use dynamic port for testing
    app = server.app;
  });

  describe('Chrome Extension CORS', () => {
    it('should accept requests from Chrome extensions', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should accept requests from Firefox extensions', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'moz-extension://12345678-1234-1234-1234-123456789012')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('moz-extension://12345678-1234-1234-1234-123456789012');
    });

    it('should accept requests from localhost in development', async () => {
      // Set NODE_ENV for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Re-create app with development env
      const server = createServer({ port: 0 });
      
      const response = await request(server.app)
        .options('/annotations')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      // Restore original env
      process.env.NODE_ENV = originalEnv;

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'https://evil.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(500); // CORS middleware rejects with error
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow extension-specific headers', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,X-Extension-Id,X-Extension-Version');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-headers']).toContain('X-Extension-Id');
      expect(response.headers['access-control-allow-headers']).toContain('X-Extension-Version');
    });

    it('should expose custom response headers', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-expose-headers']).toContain('X-Request-Id');
      expect(response.headers['access-control-expose-headers']).toContain('X-Preview-Url');
    });

    it('should cache preflight requests', async () => {
      const response = await request(app)
        .options('/annotations')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-max-age']).toBe('86400'); // 24 hours
    });

    it('should handle actual POST request with CORS from Chrome extension', async () => {
      const annotation = {
        id: 'test-' + Date.now(),
        url: 'http://example.com',
        type: 'click',
        element: {
          selector: 'button.test',
          text: 'Test Button'
        },
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        timestamp: new Date().toISOString(),
        comment: 'Test annotation'
      };

      const response = await request(app)
        .post('/annotations')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz')
        .set('Content-Type', 'application/json')
        .send(annotation);

      expect(response.status).toBe(201);
      expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz');
      // Check that the annotation was saved
      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
    });

    it('should handle GET request with CORS', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz');
      expect(response.body.status).toBe('healthy');
    });

    it('should accept various Chrome extension ID formats', async () => {
      const extensionIds = [
        'chrome-extension://abcdefghijklmnopqrstuvwxyz',
        'chrome-extension://ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'chrome-extension://aBcDeFgHiJkLmNoPqRsTuVwXyZ',
        'chrome-extension://a'.padEnd(38, 'a'), // Max length extension ID
      ];

      for (const origin of extensionIds) {
        const response = await request(app)
          .options('/annotations')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('should accept various Firefox extension ID formats', async () => {
      const extensionIds = [
        'moz-extension://12345678-1234-1234-1234-123456789012',
        'moz-extension://abcdef01-2345-6789-abcd-ef0123456789',
        'moz-extension://ABCDEF01-2345-6789-ABCD-EF0123456789',
      ];

      for (const origin of extensionIds) {
        const response = await request(app)
          .options('/annotations')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('should handle requests with no origin header', async () => {
      const response = await request(app)
        .get('/health'); // No Origin header

      expect(response.status).toBe(200);
      // With no origin, cors middleware allows it but doesn't set headers
      // This is expected behavior for same-origin requests
      expect(response.body.status).toBe('healthy');
    });

    it('should respect NODE_ENV for localhost access', async () => {
      // Set NODE_ENV for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Re-create app with development env
      const server = createServer({ port: 0 });
      
      const localhostOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
      ];

      for (const origin of localhostOrigins) {
        const response = await request(server.app)
          .options('/annotations')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });
});