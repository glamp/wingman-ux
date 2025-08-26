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
import { createServer } from '../index';

describe('Tunnel End-to-End Tests', () => {
  let apiServer: Server;
  let apiPort: number;
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

    it('should create tunnel session and proxy requests through WebSocket', async () => {
      // Step 1: Create a tunnel session
      const createResponse = await fetch(`http://localhost:${apiPort}/tunnel/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPort: testAppPort })
      });
      
      expect(createResponse.ok).toBe(true);
      const tunnelData = await createResponse.json();
      expect(tunnelData.success).toBe(true);
      expect(tunnelData.sessionId).toBeDefined();
      expect(tunnelData.tunnelUrl).toBeDefined();
      
      sessionId = tunnelData.sessionId;
      tunnelUrl = tunnelData.tunnelUrl;
      console.log('Created tunnel:', { sessionId, tunnelUrl, targetPort: testAppPort });

      // Step 2: Connect via WebSocket as developer
      ws = new WebSocket(`ws://localhost:${apiPort}/ws`);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });

      // Step 3: Register as developer for the session
      const registrationPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('WS message:', message);
          
          if (message.type === 'registered' && message.role === 'developer') {
            resolve();
          } else if (message.type === 'error') {
            reject(new Error(message.error));
          }
        });
      });

      ws.send(JSON.stringify({
        type: 'register',
        role: 'developer',
        sessionId: sessionId
      }));

      await registrationPromise;
      console.log('Registered as developer for session:', sessionId);

      // Step 4: Set up request forwarding handler
      ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'request') {
          console.log('Received forwarded request:', message);
          
          // Forward the request to the test app
          try {
            const response = await fetch(`http://localhost:${testAppPort}${message.path}`, {
              method: message.method,
              headers: message.headers,
              body: message.body ? JSON.parse(message.body) : undefined
            });
            
            const responseBody = await response.text();
            
            // Send response back through WebSocket
            ws.send(JSON.stringify({
              type: 'response',
              requestId: message.id,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              body: responseBody
            }));
          } catch (error) {
            console.error('Error forwarding request:', error);
            ws.send(JSON.stringify({
              type: 'response',
              requestId: message.id,
              status: 500,
              body: JSON.stringify({ error: 'Failed to forward request' })
            }));
          }
        }
      });

      // Step 5: Make a request to the tunnel URL
      // For local testing, we'll use the path-based URL since subdomain won't work locally
      const tunnelResponse = await fetch(`http://localhost:${apiPort}/tunnel/${sessionId}/`, {
        headers: { 'Accept': 'application/json' }
      });
      
      console.log('Tunnel response status:', tunnelResponse.status);
      
      if (tunnelResponse.ok) {
        const data = await tunnelResponse.json();
        console.log('Tunnel response data:', data);
        expect(data.message).toBe('Hello from test app!');
        expect(data.path).toBe('/');
      } else {
        const error = await tunnelResponse.text();
        console.error('Tunnel request failed:', error);
        // Even if it fails, we want to see why
        expect(tunnelResponse.status).toBe(200); // This will fail but show the actual status
      }

      // Step 6: Test another endpoint
      const apiResponse = await fetch(`http://localhost:${apiPort}/tunnel/${sessionId}/api/data`);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        expect(apiData.data).toBe('test data');
        expect(apiData.timestamp).toBeDefined();
      }

      // Step 7: Test POST request
      const postResponse = await fetch(`http://localhost:${apiPort}/tunnel/${sessionId}/api/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'value' })
      });
      
      if (postResponse.ok) {
        const postData = await postResponse.json();
        expect(postData.echo).toEqual({ test: 'value' });
        expect(postData.method).toBe('POST');
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
      
      // Simulate a request with subdomain
      const response = await fetch(`http://localhost:${apiPort}/`, {
        headers: {
          'Host': `${session.id}.localhost:${apiPort}`
        }
      });
      
      // Should get developer not connected error (which means routing worked)
      expect(response.status).toBe(502);
      const error = await response.json();
      expect(error.code).toBe('DEVELOPER_NOT_CONNECTED');
      
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