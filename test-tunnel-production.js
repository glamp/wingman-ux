#!/usr/bin/env node

/**
 * Production Tunnel Test Script
 * 
 * Tests the complete tunnel flow against the production API:
 * 1. Creates a local test server
 * 2. Creates a tunnel session on production
 * 3. Connects via WebSocket as a developer
 * 4. Handles forwarded requests
 * 5. Tests the tunnel URL from external access
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const PRODUCTION_API = 'https://api.wingmanux.com';
const PRODUCTION_WS = 'wss://api.wingmanux.com/ws';
let LOCAL_TEST_PORT; // Will be set to available port

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create a test Express app
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  app.get('/', (req, res) => {
    log('📥 Received request: GET /', 'cyan');
    res.json({ 
      message: '🎉 Tunnel is working!',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });
  
  app.get('/api/test', (req, res) => {
    log('📥 Received request: GET /api/test', 'cyan');
    res.json({ 
      status: 'success',
      data: 'This is tunneled from your local machine!',
      query: req.query
    });
  });
  
  app.post('/api/echo', (req, res) => {
    log(`📥 Received request: POST /api/echo - Body: ${JSON.stringify(req.body)}`, 'cyan');
    res.json({ 
      echo: req.body,
      headers: req.headers,
      method: req.method
    });
  });
  
  return app;
}

// Main test function
async function testTunnel() {
  let testServer;
  let ws;
  let sessionId;
  let tunnelUrl;
  
  try {
    // Step 1: Start local test server on available port
    log('🚀 Starting local test server...', 'blue');
    const app = createTestApp();
    
    await new Promise((resolve, reject) => {
      testServer = app.listen(0, (err) => {
        if (err) return reject(err);
        LOCAL_TEST_PORT = testServer.address().port;
        log(`✅ Test server running on http://localhost:${LOCAL_TEST_PORT}`, 'green');
        resolve();
      });
    });
    
    // Step 2: Create tunnel session
    log('\n📡 Creating tunnel session...', 'blue');
    const createResponse = await fetch(`${PRODUCTION_API}/tunnel/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPort: LOCAL_TEST_PORT })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create tunnel: ${await createResponse.text()}`);
    }
    
    const tunnelData = await createResponse.json();
    sessionId = tunnelData.sessionId;
    tunnelUrl = tunnelData.tunnelUrl;
    
    log(`✅ Tunnel created!`, 'green');
    log(`   Session ID: ${sessionId}`, 'yellow');
    log(`   Tunnel URL: ${tunnelUrl}`, 'yellow');
    
    // Step 3: Connect via WebSocket
    log('\n🔌 Connecting to WebSocket...', 'blue');
    ws = new WebSocket(PRODUCTION_WS);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        log('✅ WebSocket connected', 'green');
        resolve();
      });
      ws.on('error', (err) => {
        log(`❌ WebSocket error: ${err.message}`, 'red');
        reject(err);
      });
    });
    
    // Step 4: Register as developer
    log('\n👨‍💻 Registering as developer...', 'blue');
    
    const registered = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Registration timeout'));
      }, 5000);
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        log(`   📨 WS message: ${message.type}`, 'cyan');
        
        if (message.type === 'registered' && message.role === 'developer') {
          clearTimeout(timeout);
          log('✅ Registered as developer!', 'green');
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(message.error));
        }
      });
    });
    
    ws.send(JSON.stringify({
      type: 'register',
      role: 'developer',
      sessionId: sessionId
    }));
    
    await registered;
    
    // Step 5: Set up request forwarding
    log('\n🔄 Setting up request forwarding...', 'blue');
    
    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'request') {
        const request = message.request;
        log(`\n📬 Forwarding request: ${request.method} ${request.path}`, 'yellow');
        
        try {
          // Make request to local test server
          const options = {
            hostname: 'localhost',
            port: LOCAL_TEST_PORT,
            path: request.path,
            method: request.method,
            headers: {
              ...request.headers,
              host: `localhost:${LOCAL_TEST_PORT}`
            }
          };
          
          const localReq = http.request(options, (localRes) => {
            let responseBody = '';
            
            localRes.on('data', (chunk) => {
              responseBody += chunk;
            });
            
            localRes.on('end', () => {
              log(`   ✅ Response: ${localRes.statusCode}`, 'green');
              
              // Send response back through WebSocket
              ws.send(JSON.stringify({
                type: 'response',
                requestId: message.requestId,
                response: {
                  status: localRes.statusCode,
                  headers: localRes.headers,
                  body: responseBody
                }
              }));
            });
          });
          
          localReq.on('error', (err) => {
            log(`   ❌ Local request error: ${err.message}`, 'red');
            ws.send(JSON.stringify({
              type: 'response',
              requestId: message.requestId,
              response: {
                status: 502,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ error: err.message })
              }
            }));
          });
          
          if (request.body) {
            localReq.write(request.body);
          }
          localReq.end();
        } catch (error) {
          log(`   ❌ Error handling request: ${error.message}`, 'red');
        }
      }
    });
    
    log('✅ Request forwarding ready!', 'green');
    
    // Step 6: Test the tunnel
    log('\n🧪 Testing tunnel access...', 'blue');
    log(`\n${colors.yellow}═══════════════════════════════════════════${colors.reset}`);
    log(`${colors.yellow}You can now test your tunnel from anywhere!${colors.reset}`);
    log(`${colors.yellow}═══════════════════════════════════════════${colors.reset}\n`);
    
    log('Try these commands in another terminal:', 'cyan');
    log(`  curl ${tunnelUrl}/`, 'yellow');
    log(`  curl ${tunnelUrl}/api/test`, 'yellow');
    log(`  curl -X POST ${tunnelUrl}/api/echo -H "Content-Type: application/json" -d '{"test":"data"}'`, 'yellow');
    
    log('\n📊 Or open in your browser:', 'cyan');
    log(`  ${tunnelUrl}/`, 'yellow');
    
    log('\nPress Ctrl+C to stop the tunnel...', 'cyan');
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      log('\n\n🛑 Shutting down...', 'yellow');
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      
      if (testServer) {
        testServer.close();
      }
      
      // Clean up tunnel session
      if (sessionId) {
        try {
          await fetch(`${PRODUCTION_API}/tunnel/stop`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          log('✅ Tunnel session cleaned up', 'green');
        } catch (err) {
          log('⚠️  Failed to clean up tunnel session', 'yellow');
        }
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    
    // Cleanup on error
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    if (testServer) {
      testServer.close();
    }
    
    process.exit(1);
  }
}

// Run the test
log('🔥 Wingman Tunnel Production Test', 'blue');
log('===================================\n', 'blue');

testTunnel().catch((err) => {
  log(`❌ Fatal error: ${err.message}`, 'red');
  process.exit(1);
});