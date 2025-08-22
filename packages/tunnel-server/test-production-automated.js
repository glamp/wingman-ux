#!/usr/bin/env node

/**
 * Automated production test suite for tunnel server
 * 
 * Usage: node test-production-automated.js [--verbose]
 */

import { TunnelClient } from './dist/tunnel-client.js';
import express from 'express';
import { createServer } from 'http';
import fetch from 'node-fetch';

const VERBOSE = process.argv.includes('--verbose');
const TUNNEL_SERVER = process.env.TUNNEL_SERVER || 'https://wingman-tunnel.fly.dev';
const WS_URL = TUNNEL_SERVER.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function log(...args) {
  if (VERBOSE) console.log(...args);
}

async function test(name, fn) {
  try {
    log(`\n🧪 Testing: ${name}`);
    await fn();
    testsPassed++;
    results.push({ name, status: 'PASS' });
    log(`✅ PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (VERBOSE) console.error(error.stack);
  }
}

async function createSession(port) {
  const response = await fetch(`${TUNNEL_SERVER}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      developerId: `test-automated-${Date.now()}`,
      targetPort: port
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }
  
  const data = await response.json();
  return data.sessionId;
}

async function setupTunnel(sessionId, port) {
  // Create local test server
  const app = express();
  app.use(express.json());
  app.use(express.text());
  app.use(express.urlencoded({ extended: true }));
  
  // Test endpoints
  app.get('/', (req, res) => {
    res.json({ message: 'Root endpoint', method: 'GET' });
  });
  
  app.post('/echo', (req, res) => {
    res.json({ 
      received: req.body,
      contentType: req.headers['content-type'],
      method: 'POST'
    });
  });
  
  app.put('/update/:id', (req, res) => {
    res.json({
      id: req.params.id,
      body: req.body,
      method: 'PUT'
    });
  });
  
  app.delete('/remove/:id', (req, res) => {
    res.json({
      id: req.params.id,
      method: 'DELETE'
    });
  });
  
  app.get('/headers', (req, res) => {
    res.json({ headers: req.headers });
  });
  
  app.get('/query', (req, res) => {
    res.json({ query: req.query });
  });
  
  // Start server
  const server = createServer(app);
  await new Promise(resolve => {
    server.listen(port, () => {
      log(`Local server on port ${port}`);
      resolve();
    });
  });
  
  // Connect tunnel
  const client = new TunnelClient(sessionId, port);
  
  // Set up event handlers
  const connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tunnel connection timeout'));
    }, 10000);
    
    client.on('registered', () => {
      clearTimeout(timeout);
      log('Tunnel registered');
      resolve();
    });
    
    client.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  
  if (VERBOSE) {
    client.on('request', (req) => {
      log(`📥 Request: ${req.method} ${req.path}`);
    });
  }
  
  await client.connect(WS_URL);
  await connectionPromise;
  
  return { server, client };
}

async function makeRequest(sessionId, path, options = {}) {
  const url = `${TUNNEL_SERVER}/tunnel/${sessionId}${path}`;
  log(`Request: ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  
  return { status: response.status, body, headers: response.headers };
}

async function runTests() {
  console.log('🚀 Starting Automated Production Tests');
  console.log(`📡 Server: ${TUNNEL_SERVER}`);
  console.log(`🔌 WebSocket: ${WS_URL}\n`);
  
  const port = 10000 + Math.floor(Math.random() * 10000);
  let sessionId;
  let tunnel;
  
  try {
    // Test 1: Session Creation
    await test('Session Creation', async () => {
      sessionId = await createSession(port);
      if (!sessionId) throw new Error('No session ID returned');
      if (!sessionId.includes('-')) throw new Error('Invalid session ID format');
      log(`Session ID: ${sessionId}`);
    });
    
    // Test 2: Tunnel Connection
    await test('Tunnel Connection', async () => {
      tunnel = await setupTunnel(sessionId, port);
      if (!tunnel.client.isConnected()) {
        throw new Error('Tunnel not connected');
      }
    });
    
    // Test 3: GET Request
    await test('GET Request', async () => {
      const response = await makeRequest(sessionId, '/');
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.message !== 'Root endpoint') throw new Error('Unexpected response');
      if (response.body.method !== 'GET') throw new Error('Wrong method in response');
    });
    
    // Test 4: POST Request with JSON
    await test('POST Request with JSON', async () => {
      const payload = { test: 'data', timestamp: Date.now() };
      const response = await makeRequest(sessionId, '/echo', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (!response.body.received) throw new Error('No received data in response');
      if (response.body.received.test !== 'data') throw new Error('Payload not received correctly');
      if (response.body.method !== 'POST') throw new Error('Wrong method in response');
    });
    
    // Test 5: PUT Request
    await test('PUT Request', async () => {
      const response = await makeRequest(sessionId, '/update/123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' })
      });
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.id !== '123') throw new Error('ID not received');
      if (response.body.method !== 'PUT') throw new Error('Wrong method');
    });
    
    // Test 6: DELETE Request
    await test('DELETE Request', async () => {
      const response = await makeRequest(sessionId, '/remove/456', {
        method: 'DELETE'
      });
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.id !== '456') throw new Error('ID not received');
      if (response.body.method !== 'DELETE') throw new Error('Wrong method');
    });
    
    // Test 7: Query Parameters
    await test('Query Parameters', async () => {
      const response = await makeRequest(sessionId, '/query?foo=bar&test=123&array=1&array=2');
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.query.foo !== 'bar') throw new Error('Query param foo missing');
      if (response.body.query.test !== '123') throw new Error('Query param test missing');
    });
    
    // Test 8: Custom Headers
    await test('Custom Headers', async () => {
      const response = await makeRequest(sessionId, '/headers', {
        headers: {
          'X-Custom-Header': 'test-value',
          'X-Request-ID': '12345'
        }
      });
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.headers['x-custom-header'] !== 'test-value') {
        throw new Error('Custom header not forwarded');
      }
    });
    
    // Test 9: Large Payload
    await test('Large Payload', async () => {
      const largeData = 'x'.repeat(10000);
      const response = await makeRequest(sessionId, '/echo', {
        method: 'POST',
        body: JSON.stringify({ data: largeData })
      });
      
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (response.body.received.data.length !== 10000) {
        throw new Error('Large payload not handled correctly');
      }
    });
    
    // Test 10: 404 Response
    await test('404 Response', async () => {
      const response = await makeRequest(sessionId, '/nonexistent');
      if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
    });
    
  } finally {
    // Cleanup
    if (tunnel) {
      await tunnel.client.disconnect();
      tunnel.server.close();
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    if (r.error && VERBOSE) {
      console.log(`   └─ ${r.error}`);
    }
  });
  
  console.log('='.repeat(50));
  console.log(`Total: ${testsPassed + testsFailed} tests`);
  console.log(`Passed: ${testsPassed} ✅`);
  console.log(`Failed: ${testsFailed} ❌`);
  console.log('='.repeat(50));
  
  if (testsFailed > 0) {
    console.error('\n⚠️  Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});