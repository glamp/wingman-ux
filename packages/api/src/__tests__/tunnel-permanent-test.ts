/**
 * Test for permanent test-tunnel subdomain
 * This ensures the test-tunnel is always available for validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index';
import type { Server } from 'http';
import request from 'supertest';

describe('Permanent Test Tunnel', () => {
  let server: Server;
  let app: any;
  let sessionManager: any;
  
  beforeAll(async () => {
    const result = createServer({ port: 0 });
    app = result.app;
    sessionManager = result.sessionManager;
    server = await result.start();
  });
  
  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
  
  describe('test-tunnel session', () => {
    it('should exist as a permanent session', () => {
      const testSession = sessionManager.getSession('test-tunnel');
      
      expect(testSession).toBeDefined();
      expect(testSession.id).toBe('test-tunnel');
      expect(testSession.developerId).toBe('e2e-test');
      expect(testSession.status).toBe('active');
      expect(testSession.metadata?.permanent).toBe(true);
      expect(testSession.metadata?.purpose).toBe('E2E testing and validation');
    });
    
    it('should have correct tunnel URL based on environment', () => {
      const testSession = sessionManager.getSession('test-tunnel');
      
      if (process.env.NODE_ENV === 'production') {
        expect(testSession.tunnelUrl).toBe('https://test-tunnel.wingmanux.com');
      } else {
        expect(testSession.tunnelUrl).toBe('http://test-tunnel.localhost:8787');
      }
    });
    
    it('should not be deleted during cleanup', () => {
      const testSession = sessionManager.getSession('test-tunnel');
      
      // Mark session as very old
      testSession.lastActivity = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      
      // Run cleanup
      sessionManager.cleanupExpiredSessions();
      
      // Should still exist because it's permanent
      const sessionAfterCleanup = sessionManager.getSession('test-tunnel');
      expect(sessionAfterCleanup).toBeDefined();
      expect(sessionAfterCleanup.id).toBe('test-tunnel');
    });
    
    it('should be accessible via API', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .expect(200);
      
      const testSession = response.body.sessions.find((s: any) => s.id === 'test-tunnel');
      
      expect(testSession).toBeDefined();
      expect(testSession.metadata.permanent).toBe(true);
    });
    
    it('should return appropriate error when no developer connected', async () => {
      // Mock request to test-tunnel subdomain without developer connection
      const response = await request(app)
        .get('/')
        .set('Host', 'test-tunnel.localhost')
        .expect(502);
      
      expect(response.body.error).toBe('Tunnel not connected');
      expect(response.body.code).toBe('DEVELOPER_NOT_CONNECTED');
    });
  });
  
  describe('Production URL validation', () => {
    it.skipIf(process.env.NODE_ENV !== 'production')(
      'should be accessible at test-tunnel.wingmanux.com in production',
      async () => {
        // This test only runs in production
        const response = await fetch('https://test-tunnel.wingmanux.com/health');
        
        // Should return 502 (no developer connected) or 200 (if test server is running)
        expect([200, 502]).toContain(response.status);
        
        if (response.status === 502) {
          const body = await response.json() as any;
          expect(body.code).toBe('DEVELOPER_NOT_CONNECTED');
        }
      }
    );
  });
});