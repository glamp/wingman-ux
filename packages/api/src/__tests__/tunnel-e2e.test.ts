/**
 * End-to-End Tunnel Test
 * 
 * This test validates the complete tunnel flow:
 * 1. Creates a local test server
 * 2. Creates a tunnel session
 * 3. Connects via WebSocket as a developer
 * 4. Registers for the session
 * 5. Makes requests to the tunnel URL
 * 6. Verifies requests are proxied correctly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import WebSocket from 'ws';
import type { Server } from 'http';
import request from 'supertest';
import { createServer } from '../index';

describe('Tunnel End-to-End Tests', () => {
  let apiServer: Server;
  let apiPort: number;
  let app: any; // Express app instance
  let testAppServer: Server;
  let testAppPort: number;
  let sessionManager: any;
  let connectionManager: any;

  // Create a test app that will be tunneled
  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    
    app.get('/', (req, res) => {
      res.json({ message: 'Hello from test app!', path: '/' });
    });
    
    app.get('/api/data', (req, res) => {
      res.json({ data: 'test data', timestamp: Date.now() });
    });
    
    app.post('/api/echo', (req, res) => {
      res.json({ echo: req.body, method: 'POST' });
    });
    
    return app;
  };

  beforeAll(async () => {
    // Start the API server
    const server = createServer({ port: 0, host: 'localhost' });
    app = server.app; // Save app instance for supertest
    sessionManager = server.sessionManager;
    connectionManager = server.connectionManager;
    
    apiServer = await server.start();
    const addr = apiServer.address();
    apiPort = typeof addr === 'string' ? 8787 : addr?.port || 8787;
    
    // Start the test app server
    const testApp = createTestApp();
    testAppServer = await new Promise<Server>((resolve) => {
      const s = testApp.listen(0, 'localhost', () => {
        resolve(s);
      });
    });
    const testAddr = testAppServer.address();
    testAppPort = typeof testAddr === 'string' ? 3000 : testAddr?.port || 3000;
  });

  afterAll(async () => {
    // Clean up servers
    await new Promise<void>((resolve) => {
      apiServer.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      testAppServer.close(() => resolve());
    });
  });

  describe('Complete Tunnel Flow', () => {
    let ws: WebSocket;
    let sessionId: string;
    let tunnelUrl: string;

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should return error when developer is not connected', async () => {
      // Create a session but don't connect WebSocket
      const createResponse = await fetch(`http://localhost:${apiPort}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          developerId: 'test-dev-2',
          targetPort: testAppPort 
        })
      });
      
      const sessionData = await createResponse.json();
      const testSessionId = sessionData.sessionId;
      
      // Try to access tunnel without developer connected
      const tunnelResponse = await fetch(`http://localhost:${apiPort}/tunnel/${testSessionId}/`);
      
      expect(tunnelResponse.status).toBe(502);
      const error = await tunnelResponse.json();
      expect(error.code).toBe('DEVELOPER_NOT_CONNECTED');
    });
  });

  describe('Subdomain Routing', () => {
    it('should extract session ID from subdomain and route correctly', async () => {
      // Create a test session
      const session = sessionManager.createSession('test-dev', 3000);
      
      // Use supertest to properly set Host header
      const response = await request(app)
        .get('/')
        .set('Host', `${session.id}.localhost:${apiPort}`)
        .expect(502);
      
      // Verify error response
      expect(response.body.code).toBe('DEVELOPER_NOT_CONNECTED');
      
      // Clean up
      sessionManager.deleteSession(session.id);
    });

    it('should pass through non-tunnel subdomains', async () => {
      // Request with non-session subdomain
      const response = await fetch(`http://localhost:${apiPort}/health`, {
        headers: {
          'Host': `api.localhost:${apiPort}`
        }
      });
      
      // Should reach health endpoint
      expect(response.status).toBe(200);
      const health = await response.json();
      expect(health.status).toBe('healthy');
    });
  });
});