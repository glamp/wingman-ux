/**
 * End-to-End test for tunnel functionality using permanent test subdomain.
 * This test validates the complete tunnel flow with real browser interaction.
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:TunnelE2E');

// Test configuration
const TEST_SESSION_ID = 'test-tunnel';
const API_SERVER_URL = process.env.API_URL || 'http://localhost:8787';
const WS_URL = process.env.WS_URL || 'ws://localhost:8787/ws';
const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'localhost:8787';

// Helper to create a test application server
function createTestApp(): Promise<{ server: Server; port: number; app: express.Application }> {
  return new Promise((resolve) => {
    const app = express();
    
    // Add test routes
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test App</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1 id="main-title">Test Application</h1>
          <p id="test-content">This is the test application running on local port</p>
          <button id="test-button" onclick="handleClick()">Click Me</button>
          <div id="click-result"></div>
          <script>
            function handleClick() {
              fetch('/api/test')
                .then(r => r.json())
                .then(data => {
                  document.getElementById('click-result').textContent = data.message;
                });
            }
          </script>
        </body>
        </html>
      `);
    });
    
    app.get('/api/test', (req, res) => {
      res.json({ 
        message: 'API Response Success',
        timestamp: Date.now(),
        headers: req.headers
      });
    });
    
    app.post('/api/echo', express.json(), (req, res) => {
      res.json({
        echo: req.body,
        method: req.method,
        url: req.url
      });
    });
    
    const server = app.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      logger.info(`Test app running on port ${port}`);
      resolve({ server, port, app });
    });
  });
}

// Helper to establish WebSocket tunnel connection
function establishTunnelConnection(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      logger.info('WebSocket connected, registering as developer...');
      
      // Register as developer for test session
      ws.send(JSON.stringify({
        type: 'register',
        role: 'developer',
        sessionId: TEST_SESSION_ID,
        targetPort: port
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      logger.debug('Received message:', message.type);
      
      if (message.type === 'registered') {
        logger.info(`Registered successfully for session ${TEST_SESSION_ID}`);
        resolve(ws);
      } else if (message.type === 'error') {
        reject(new Error(message.error));
      } else if (message.type === 'request') {
        // Handle incoming tunnel requests
        handleTunnelRequest(ws, message, port);
      }
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });
  });
}

// Helper to handle tunnel requests
async function handleTunnelRequest(ws: WebSocket, request: any, port: number) {
  logger.info(`Handling tunnel request: ${request.method} ${request.url}`);
  
  try {
    // Forward request to local app
    const localUrl = `http://localhost:${port}${request.url}`;
    const response = await fetch(localUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body ? Buffer.from(request.body, request.isBase64 ? 'base64' : 'utf-8') : undefined
    });
    
    // Get response body
    const buffer = await response.arrayBuffer();
    const body = Buffer.from(buffer);
    
    // Check if response is binary
    const contentType = response.headers.get('content-type') || '';
    const isBinary = contentType.includes('image') || 
                     contentType.includes('octet-stream') ||
                     contentType.includes('pdf');
    
    // Convert headers to plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Send response back through tunnel
    ws.send(JSON.stringify({
      type: 'response',
      id: request.id,
      sessionId: request.sessionId,
      status: response.status,
      headers,
      body: isBinary ? body.toString('base64') : body.toString('utf-8'),
      isBase64: isBinary
    }));
    
    logger.info(`Sent response for request ${request.id}: ${response.status}`);
  } catch (error) {
    logger.error('Error handling tunnel request:', error);
    
    // Send error response
    ws.send(JSON.stringify({
      type: 'response',
      id: request.id,
      sessionId: request.sessionId,
      status: 502,
      headers: { 'content-type': 'text/plain' },
      body: 'Bad Gateway: Failed to forward request to local application'
    }));
  }
}

test.describe('Tunnel E2E Tests with Permanent Subdomain', () => {
  let testApp: { server: Server; port: number; app: express.Application };
  let tunnelWs: WebSocket;
  let browser: Browser;
  let page: Page;
  
  test.beforeAll(async () => {
    // Start test application
    testApp = await createTestApp();
    logger.info(`Test application started on port ${testApp.port}`);
    
    // Establish tunnel connection
    tunnelWs = await establishTunnelConnection(testApp.port);
    logger.info('Tunnel connection established');
    
    // Launch browser
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false'
    });
    
    // Wait for tunnel to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  
  test.afterAll(async () => {
    // Cleanup
    if (page) await page.close();
    if (browser) await browser.close();
    if (tunnelWs) tunnelWs.close();
    if (testApp?.server) {
      await new Promise<void>((resolve) => {
        testApp.server.close(() => resolve());
      });
    }
  });
  
  test('permanent test subdomain should be accessible', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    logger.info(`Testing tunnel URL: ${tunnelUrl}`);
    
    page = await browser.newPage();
    
    // Navigate to tunnel URL
    const response = await page.goto(tunnelUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Verify response
    expect(response).toBeTruthy();
    expect(response!.status()).toBe(200);
    
    // Verify page content
    const title = await page.textContent('#main-title');
    expect(title).toBe('Test Application');
    
    const content = await page.textContent('#test-content');
    expect(content).toContain('test application running');
  });
  
  test('should handle API requests through tunnel', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    
    if (!page) {
      page = await browser.newPage();
      await page.goto(tunnelUrl);
    }
    
    // Click the test button to trigger API call
    await page.click('#test-button');
    
    // Wait for result to appear
    await page.waitForSelector('#click-result:not(:empty)', {
      timeout: 5000
    });
    
    // Verify API response
    const result = await page.textContent('#click-result');
    expect(result).toBe('API Response Success');
  });
  
  test('should handle POST requests with JSON body', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    
    if (!page) {
      page = await browser.newPage();
    }
    
    // Make POST request through tunnel
    const response = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: 'data',
          nested: { value: 123 }
        })
      });
      return res.json();
    }, tunnelUrl);
    
    // Verify echoed response
    expect(response).toEqual({
      echo: {
        test: 'data',
        nested: { value: 123 }
      },
      method: 'POST',
      url: '/api/echo'
    });
  });
  
  test('should handle multiple concurrent requests', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    
    if (!page) {
      page = await browser.newPage();
    }
    
    // Make multiple concurrent requests
    const promises = Array.from({ length: 5 }, async (_, i) => {
      return page.evaluate(async (url, index) => {
        const res = await fetch(`${url}/api/test?index=${index}`);
        return res.json();
      }, tunnelUrl, i);
    });
    
    const results = await Promise.all(promises);
    
    // Verify all requests succeeded
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.message).toBe('API Response Success');
      expect(result.timestamp).toBeDefined();
    });
  });
  
  test('should preserve request headers through tunnel', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    
    if (!page) {
      page = await browser.newPage();
    }
    
    // Make request with custom headers
    const response = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/test`, {
        headers: {
          'X-Custom-Header': 'test-value',
          'Authorization': 'Bearer test-token'
        }
      });
      return res.json();
    }, tunnelUrl);
    
    // Verify headers were preserved (they're echoed back in the test app)
    expect(response.headers).toBeDefined();
    expect(response.headers['x-custom-header']).toBe('test-value');
    expect(response.headers['authorization']).toBe('Bearer test-token');
  });
  
  test('should handle connection errors gracefully', async () => {
    const tunnelUrl = `http://${TEST_SESSION_ID}.${TUNNEL_BASE_URL}`;
    
    if (!page) {
      page = await browser.newPage();
    }
    
    // Close the WebSocket to simulate connection loss
    tunnelWs.close();
    
    // Try to access tunnel after connection loss
    const response = await page.goto(`${tunnelUrl}/test-after-disconnect`, {
      waitUntil: 'networkidle',
      timeout: 10000
    }).catch(e => e);
    
    // Should get an error or gateway timeout
    if (response && typeof response.status === 'function') {
      const status = response.status();
      expect([502, 503, 504]).toContain(status);
    }
  });
});

// Production subdomain test (only runs in production)
test.describe('Production Tunnel Tests', () => {
  test.skip(process.env.NODE_ENV !== 'production', 'Only runs in production');
  
  test('should access production test subdomain', async ({ page }) => {
    const productionUrl = 'https://test-tunnel.wingmanux.com';
    
    // This will only work if the server is deployed and test-tunnel session exists
    const response = await page.goto(productionUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(e => null);
    
    if (response) {
      // If we can connect, verify it's working
      expect(response.status()).toBeLessThan(500);
    }
  });
});