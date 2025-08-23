import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../index.js';
import type { Express } from 'express';

describe('CORS Configuration', () => {
  let app: Express;

  beforeEach(() => {
    const { app: testApp } = createApp();
    app = testApp;
  });

  describe('Tunnel Server CORS', () => {
    it('should accept requests from wingmanux.com subdomains', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://ghost-whiskey.wingmanux.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should accept requests from root wingmanux.com domain', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://wingmanux.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://wingmanux.com');
    });

    it('should accept requests from localhost in development', async () => {
      // This test only applies when NODE_ENV is 'development'
      if (process.env.NODE_ENV === 'production') {
        return; // Skip in production mode
      }
      
      // Set NODE_ENV for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Re-create app with development env
      const { app: devApp } = createApp();
      
      const response = await request(devApp)
        .options('/api/sessions')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      // Restore original env
      process.env.NODE_ENV = originalEnv;

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://evil.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(500); // CORS middleware rejects with error
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should expose P2P-related headers', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-expose-headers']).toContain('X-P2P-Status');
      expect(response.headers['access-control-expose-headers']).toContain('X-Connection-Mode');
      expect(response.headers['access-control-expose-headers']).toContain('X-Session-Id');
    });

    it('should cache preflight requests', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-max-age']).toBe('86400'); // 24 hours
    });

    it('should allow WebSocket-related headers', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Upgrade,Connection');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-headers']).toContain('Upgrade');
      expect(response.headers['access-control-allow-headers']).toContain('Connection');
    });

    it('should handle actual POST request with CORS', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com')
        .send({ developerId: 'test', targetPort: 3000 });

      expect(response.status).toBe(201);
      expect(response.headers['access-control-allow-origin']).toBe('https://ghost-whiskey.wingmanux.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle wildcard subdomain pattern correctly', async () => {
      const subdomains = [
        'ghost-whiskey.wingmanux.com',
        'maverick-alpha.wingmanux.com',
        'phantom-bravo.wingmanux.com',
        'viper-charlie.wingmanux.com'
      ];

      for (const subdomain of subdomains) {
        const response = await request(app)
          .options('/api/sessions')
          .set('Origin', `https://${subdomain}`)
          .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe(`https://${subdomain}`);
      }
    });

    it('should reject malformed subdomain patterns', async () => {
      const invalidOrigins = [
        'https://ghost.whiskey.wingmanux.com', // Too many subdomain levels
        'https://ghostwhiskey.wingmanux.com',  // No hyphen
        'https://ghost-123.wingmanux.com',     // Numbers instead of letters
        'https://GHOST-WHISKEY.wingmanux.com', // Uppercase
      ];

      for (const origin of invalidOrigins) {
        const response = await request(app)
          .options('/api/sessions')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(500);
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });
  });

  describe('Static Asset CSP Headers', () => {
    it('should include CSP headers on static assets', async () => {
      const response = await request(app)
        .get('/static/p2p-client.js')
        .set('Origin', 'https://ghost-whiskey.wingmanux.com');

      // CSP headers are set
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
      expect(response.headers['content-security-policy']).toContain('https://cdn.jsdelivr.net');
      
      // Additional security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });
});