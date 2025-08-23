import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

/**
 * Integration tests for production deployment on Fly.io
 * These tests verify the actual deployed server functionality
 */

const PRODUCTION_URL = process.env.TEST_URL || 'https://wingman-tunnel.fly.dev';
const WS_URL = PRODUCTION_URL.replace('https://', 'wss://') + '/ws';

// Helper function to create a session
async function createSession(developerId: string, targetPort: number) {
  const response = await fetch(`${PRODUCTION_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ developerId, targetPort })
  });
  return response.json();
}

// Helper function to get a session
async function getSession(sessionId: string) {
  const response = await fetch(`${PRODUCTION_URL}/api/sessions/${sessionId}`);
  return response;
}

describe('Production Deployment Tests', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${PRODUCTION_URL}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.activeSessions).toBe('number');
    });

    it('should be accessible without authentication', async () => {
      const response = await fetch(`${PRODUCTION_URL}/health`);
      expect(response.status).toBe(200);
    });
  });

  describe('Session Management', () => {
    let testSessionId: string;

    it('should create a new session', async () => {
      const sessionData = await createSession('prod-test-dev', 3000);
      
      expect(sessionData).toHaveProperty('sessionId');
      expect(sessionData).toHaveProperty('session');
      expect(sessionData).toHaveProperty('tunnelUrl');
      expect(sessionData.session.developerId).toBe('prod-test-dev');
      expect(sessionData.session.targetPort).toBe(3000);
      expect(sessionData.session.status).toBe('pending');
      expect(sessionData.tunnelUrl).toMatch(/^https:\/\/.+\.wingmanux\.com$/);
      
      testSessionId = sessionData.sessionId;
    });

    it('should retrieve an existing session', async () => {
      // Create a session first
      const createData = await createSession('retrieve-test', 4000);
      const sessionId = createData.sessionId;
      
      // Now retrieve it
      const response = await getSession(sessionId);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.session.id).toBe(sessionId);
      expect(data.session.developerId).toBe('retrieve-test');
      expect(data.session.targetPort).toBe(4000);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await getSession('non-existent-session');
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Session not found');
      expect(data.code).toBe('SESSION_NOT_FOUND');
    });

    it('should validate port numbers', async () => {
      const response = await fetch(`${PRODUCTION_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developerId: 'test', targetPort: 99999 })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_PORT');
    });

    it('should require all fields', async () => {
      const response = await fetch(`${PRODUCTION_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developerId: 'test' })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_REQUEST');
    });

    it('should generate unique aviation-themed session IDs', async () => {
      const sessions = await Promise.all([
        createSession('unique-test-1', 5001),
        createSession('unique-test-2', 5002),
        createSession('unique-test-3', 5003)
      ]);
      
      const sessionIds = sessions.map(s => s.sessionId);
      const uniqueIds = new Set(sessionIds);
      
      // All IDs should be unique
      expect(uniqueIds.size).toBe(sessionIds.length);
      
      // All IDs should match the aviation pattern
      sessionIds.forEach(id => {
        expect(id).toMatch(/^[a-z]+-[a-z]+$/);
      });
    });
  });

  describe('Session HTML Pages', () => {
    it('should serve session page for valid session', async () => {
      // Create a session first
      const sessionData = await createSession('page-test', 6000);
      const sessionId = sessionData.sessionId;
      
      // Get the session page
      const response = await fetch(`${PRODUCTION_URL}/sessions/${sessionId}`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Wingman Tunnel');
      expect(html).toContain(sessionId);
      expect(html).toContain('localhost:6000');
    });

    it('should return 404 page for non-existent session', async () => {
      const response = await fetch(`${PRODUCTION_URL}/sessions/fake-session`);
      expect(response.status).toBe(404);
      
      const html = await response.text();
      expect(html).toContain('Session Not Found');
      expect(html).toContain('fake-session');
    });
  });

  describe('Static Assets', () => {
    it('should serve CSS file', async () => {
      const response = await fetch(`${PRODUCTION_URL}/static/styles.css`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toMatch(/text\/css/);
      
      const css = await response.text();
      expect(css.length).toBeGreaterThan(0);
      expect(css).toContain('gradient');
    });

    it('should serve JavaScript file', async () => {
      const response = await fetch(`${PRODUCTION_URL}/static/client.js`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toMatch(/javascript/);
      
      const js = await response.text();
      expect(js).toContain('Wingman Tunnel Client');
      expect(js).toContain('WebSocket');
    });
  });

  describe('WebSocket Connectivity', () => {
    it('should establish WebSocket connection', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
      });
    });

    it('should receive connection confirmation', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            expect(message).toHaveProperty('timestamp');
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', reject);
        
        setTimeout(() => {
          ws.close();
          reject(new Error('Did not receive connection confirmation'));
        }, 5000);
      });
    });

    it('should respond to ping with pong', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'ping' }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            expect(message).toHaveProperty('timestamp');
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', reject);
        
        setTimeout(() => {
          ws.close();
          reject(new Error('Did not receive pong response'));
        }, 5000);
      });
    });

    it('should handle session registration', async () => {
      return new Promise<void>((resolve, reject) => {
        // First create a session
        createSession('ws-test', 7000).then((sessionData) => {
          const ws = new WebSocket(WS_URL);
          
          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'register_session',
              sessionId: sessionData.sessionId
            }));
          });
          
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'session_update') {
              expect(message.session.id).toBe(sessionData.sessionId);
              expect(message.session.developerId).toBe('ws-test');
              ws.close();
              resolve();
            } else if (message.type === 'error') {
              ws.close();
              reject(new Error(message.error));
            }
          });
          
          ws.on('error', reject);
          
          setTimeout(() => {
            ws.close();
            reject(new Error('Session registration timeout'));
          }, 5000);
        }).catch(reject);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const response = await fetch(`${PRODUCTION_URL}/api/unknown`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Not found');
      expect(data.code).toBe('NOT_FOUND');
      expect(data.path).toBe('/api/unknown');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${PRODUCTION_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
    });

    it('should handle empty body', async () => {
      const response = await fetch(`${PRODUCTION_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ''
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    it('should respond to health check quickly', async () => {
      const start = Date.now();
      const response = await fetch(`${PRODUCTION_URL}/health`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond in less than 1 second
    });

    it('should create sessions quickly', async () => {
      const start = Date.now();
      const sessionData = await createSession('perf-test', 8000);
      const duration = Date.now() - start;
      
      expect(sessionData.sessionId).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should create in less than 2 seconds
    });
  });

  describe('Session Persistence After Scaling', () => {
    it('should persist sessions across requests', async () => {
      // Create a session
      const sessionData = await createSession('persistence-test', 9000);
      const sessionId = sessionData.sessionId;
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to retrieve it multiple times
      for (let i = 0; i < 3; i++) {
        const response = await getSession(sessionId);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.session.id).toBe(sessionId);
        expect(data.session.developerId).toBe('persistence-test');
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    it('should maintain session state', async () => {
      const sessionData = await createSession('state-test', 9001);
      const sessionId = sessionData.sessionId;
      
      // Initial state should be pending
      const response1 = await getSession(sessionId);
      const data1 = await response1.json();
      expect(data1.session.status).toBe('pending');
      
      // State should remain consistent
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response2 = await getSession(sessionId);
      const data2 = await response2.json();
      expect(data2.session.status).toBe('pending');
      expect(data2.session.createdAt).toBe(data1.session.createdAt);
    });
  });
});

// Run specific production tests
describe('Fly.io Specific Tests', () => {
  it('should have proper HTTPS configuration', async () => {
    const response = await fetch(PRODUCTION_URL.replace('https://', 'http://'), {
      redirect: 'manual'
    });
    
    // Should redirect HTTP to HTTPS
    expect([301, 302, 307, 308]).toContain(response.status);
  });

  it('should handle concurrent session creation', async () => {
    const promises = Array.from({ length: 5 }, (_, i) => 
      createSession(`concurrent-${i}`, 10000 + i)
    );
    
    const results = await Promise.all(promises);
    const sessionIds = results.map(r => r.sessionId);
    const uniqueIds = new Set(sessionIds);
    
    // All sessions should be created successfully with unique IDs
    expect(uniqueIds.size).toBe(5);
    results.forEach(result => {
      expect(result.session.status).toBe('pending');
    });
  });
});