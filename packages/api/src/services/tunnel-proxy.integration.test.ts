/**
 * Integration test for TunnelProxy functionality
 * Tests the complete end-to-end tunnel flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { Server } from 'http';

describe('TunnelProxy Integration', () => {
  let testTargetServer: Server;
  let testTargetPort: number;
  const API_PORT = 8787; // Use default port
  const API_HOST = 'localhost';

  beforeAll(async () => {
    // Create a test target server
    testTargetServer = http.createServer((req, res) => {
      console.log(`[TEST APP] Received ${req.method} ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Hello from test server',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      }));
    });
    
    // Listen on a specific port
    testTargetPort = 14444;
    await new Promise<void>((resolve, reject) => {
      testTargetServer.listen(testTargetPort, '127.0.0.1', () => {
        console.log(`[TEST] Target server running on port ${testTargetPort}`);
        resolve();
      });
      testTargetServer.on('error', reject);
    });
  });

  afterAll(async () => {
    if (testTargetServer) {
      await new Promise<void>((resolve) => {
        testTargetServer.close(() => resolve());
      });
    }
  });

  it('should successfully tunnel requests through subdomain', async () => {
    console.log('=== Starting Tunnel Integration Test ===');
    
    // Step 1: Create tunnel session
    console.log('1. Creating tunnel session...');
    const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: testTargetPort })
    });
    
    expect(createResponse.status).toBe(200);
    const session = await createResponse.json();
    console.log(`   Created session: ${session.sessionId}`);
    expect(session.success).toBe(true);
    expect(session.sessionId).toBeDefined();
    expect(session.targetPort).toBe(testTargetPort);
    
    const sessionId = session.sessionId;
    
    // Step 2: Access through tunnel subdomain
    console.log('2. Testing tunnel access...');
    const tunnelResponse = await fetch(`http://${API_HOST}:${API_PORT}/test`, {
      headers: { 'Host': `${sessionId}.localhost` }
    });
    
    expect(tunnelResponse.status).toBe(200);
    const body = await tunnelResponse.json();
    console.log('   Response from tunnel:', body);
    
    expect(body.message).toBe('Hello from test server');
    expect(body.path).toBe('/test');
    expect(body.method).toBe('GET');
    
    console.log('=== Tunnel Integration Test Complete ===');
  });

  it('should return 404 for non-existent session', async () => {
    const response = await fetch(`http://${API_HOST}:${API_PORT}/`, {
      headers: { 'Host': 'does-not-exist.localhost' }
    });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('TUNNEL_NOT_FOUND');
  });

  it('should handle target server down gracefully', async () => {
    // Create session pointing to non-existent port
    const createResponse = await fetch(`http://${API_HOST}:${API_PORT}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: 19999 })
    });
    
    const session = await createResponse.json();
    const sessionId = session.sessionId;
    
    // Try to access - should fail quickly
    const startTime = Date.now();
    const tunnelResponse = await fetch(`http://${API_HOST}:${API_PORT}/`, {
      headers: { 'Host': `${sessionId}.localhost` }
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`Response time when target down: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(6000); // Should timeout within 6 seconds
    expect(tunnelResponse.status).toBeGreaterThanOrEqual(500);
  });
});