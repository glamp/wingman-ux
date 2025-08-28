import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from '../index';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { Express } from 'express';

describe('TunnelProxy', () => {
  let apiServer: Server;
  let apiApp: { app: Express; start: () => Promise<Server> };
  let testTargetServer: Server;
  let testTargetPort: number;
  const API_PORT = 18787; // Use different port to avoid conflicts

  beforeAll(async () => {
    // Start the API server
    apiApp = createServer({ port: API_PORT, host: '127.0.0.1' });
    apiServer = await apiApp.start();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Clean up
    if (apiServer) {
      await new Promise<void>((resolve) => {
        apiServer.close(() => resolve());
      });
    }
  });

  beforeEach(async () => {
    // Create a test target server for each test
    testTargetServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Hello from target server',
        path: req.url,
        method: req.method
      }));
    });
    
    // Listen on a random port
    await new Promise<void>((resolve) => {
      testTargetServer.listen(0, '127.0.0.1', () => {
        const addr = testTargetServer.address();
        testTargetPort = typeof addr === 'object' ? addr!.port : 0;
        console.log(`Test target server started on port ${testTargetPort}`);
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Clean up test target server
    if (testTargetServer) {
      await new Promise<void>((resolve) => {
        testTargetServer.close(() => resolve());
      });
    }
  });

  it('should return 404 for non-existent tunnel session', async () => {
    // Use localhost subdomain format
    const response = await fetch(`http://127.0.0.1:${API_PORT}/`, {
      headers: { 'Host': `nonexistent-session.localhost` }
    });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('TUNNEL_NOT_FOUND');
    expect(body.error).toBe('Tunnel not found');
  });

  it('should create tunnel session and proxy requests successfully', async () => {
    // Create a tunnel session
    const createResponse = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: testTargetPort })
    });
    
    expect(createResponse.status).toBe(200);
    const session = await createResponse.json();
    expect(session.success).toBe(true);
    expect(session.sessionId).toBeDefined();
    expect(session.targetPort).toBe(testTargetPort);
    
    const sessionId = session.sessionId;
    console.log(`Created tunnel session: ${sessionId} for port ${testTargetPort}`);
    
    // Now test accessing through the tunnel subdomain
    const tunnelResponse = await fetch(`http://127.0.0.1:${API_PORT}/test-path`, {
      headers: { 'Host': `${sessionId}.localhost` }
    });
    
    expect(tunnelResponse.status).toBe(200);
    const tunnelBody = await tunnelResponse.json();
    expect(tunnelBody.message).toBe('Hello from target server');
    expect(tunnelBody.path).toBe('/test-path');
    expect(tunnelBody.method).toBe('GET');
  });

  it('should return fast error when target server is not running', async () => {
    // Create a tunnel session pointing to a non-existent port
    const createResponse = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: 19999 }) // Port that's not running
    });
    
    const session = await createResponse.json();
    const sessionId = session.sessionId;
    
    // Try to access through tunnel - should get error quickly
    const startTime = Date.now();
    const tunnelResponse = await fetch(`http://127.0.0.1:${API_PORT}/`, {
      headers: { 'Host': `${sessionId}.localhost` }
    });
    const responseTime = Date.now() - startTime;
    
    // Should respond within 6 seconds (5 second timeout + overhead)
    expect(responseTime).toBeLessThan(6000);
    expect(tunnelResponse.status).toBe(504); // Gateway Timeout
  });

  it('should handle multiple concurrent requests through tunnel', async () => {
    // Create tunnel session
    const createResponse = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: testTargetPort })
    });
    
    const session = await createResponse.json();
    const sessionId = session.sessionId;
    
    // Send multiple concurrent requests
    const requests = Array.from({ length: 5 }, (_, i) => 
      fetch(`http://127.0.0.1:${API_PORT}/request-${i}`, {
        headers: { 'Host': `${sessionId}.localhost` }
      })
    );
    
    const responses = await Promise.all(requests);
    const bodies = await Promise.all(responses.map(r => r.json()));
    
    // All should succeed
    responses.forEach(r => expect(r.status).toBe(200));
    bodies.forEach((body, i) => {
      expect(body.message).toBe('Hello from target server');
      expect(body.path).toBe(`/request-${i}`);
    });
  });

  it('should handle WebSocket upgrade for tunnels', async () => {
    // Create a WebSocket echo server as target
    const wsServer = new WebSocketServer({ port: 0 });
    const wsPort = (wsServer.address() as any).port;
    
    wsServer.on('connection', (ws) => {
      ws.on('message', (data) => {
        ws.send(`Echo: ${data}`);
      });
    });
    
    // Create tunnel session for WebSocket server
    const createResponse = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: wsPort })
    });
    
    const session = await createResponse.json();
    const sessionId = session.sessionId;
    
    // Connect WebSocket through tunnel
    const ws = new WebSocket(`ws://127.0.0.1:${API_PORT}/`, {
      headers: { 'Host': `${sessionId}.localhost` }
    });
    
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send('Hello tunnel!');
      });
      
      ws.on('message', (data) => {
        expect(data.toString()).toBe('Echo: Hello tunnel!');
        ws.close();
        resolve();
      });
      
      ws.on('error', reject);
    });
    
    wsServer.close();
  });

  it('should properly route based on subdomain extraction', async () => {
    // Create two different tunnel sessions
    const session1 = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: testTargetPort })
    }).then(r => r.json());
    
    // Create a second target server
    const secondServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Second server');
    });
    
    const secondPort = await new Promise<number>((resolve) => {
      secondServer.listen(0, '127.0.0.1', () => {
        const addr = secondServer.address();
        resolve(typeof addr === 'object' ? addr!.port : 0);
      });
    });
    
    const session2 = await fetch(`http://127.0.0.1:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: secondPort })
    }).then(r => r.json());
    
    // Test both tunnels work independently
    const response1 = await fetch(`http://127.0.0.1:${API_PORT}/`, {
      headers: { 'Host': `${session1.sessionId}.localhost` }
    });
    const body1 = await response1.json();
    expect(body1.message).toBe('Hello from target server');
    
    const response2 = await fetch(`http://127.0.0.1:${API_PORT}/`, {
      headers: { 'Host': `${session2.sessionId}.localhost` }
    });
    const body2 = await response2.text();
    expect(body2).toBe('Second server');
    
    secondServer.close();
  });
});