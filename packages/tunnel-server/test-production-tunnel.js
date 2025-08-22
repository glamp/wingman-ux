#!/usr/bin/env node

/**
 * Test script to verify the production tunnel server works end-to-end
 */

import { TunnelClient } from './dist/tunnel-client.js';
import express from 'express';
import { createServer } from 'http';

// Create a simple local server to tunnel
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from local server!', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    endpoint: '/api/test',
    headers: req.headers,
    query: req.query
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    echo: req.body,
    method: req.method
  });
});

// Start local server
const server = createServer(app);
const PORT = 3457 + Math.floor(Math.random() * 1000); // Random port to avoid conflicts

server.listen(PORT, async () => {
  console.log(`🚀 Local test server running on port ${PORT}`);
  
  // Create a session
  console.log('\n📡 Creating tunnel session...');
  const response = await fetch('https://wingman-tunnel.fly.dev/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      developerId: 'test-production',
      targetPort: PORT
    })
  });
  
  const data = await response.json();
  console.log(`✅ Session created: ${data.sessionId}`);
  console.log(`🌐 Tunnel URL: https://wingman-tunnel.fly.dev/tunnel/${data.sessionId}/`);
  
  // Connect tunnel client
  console.log('\n🔌 Connecting tunnel client...');
  const client = new TunnelClient(data.sessionId, PORT);
  
  client.on('connected', () => {
    console.log('✅ Tunnel client connected!');
    console.log('\n🎯 Test the tunnel with these commands:');
    console.log(`  curl https://wingman-tunnel.fly.dev/tunnel/${data.sessionId}/`);
    console.log(`  curl https://wingman-tunnel.fly.dev/tunnel/${data.sessionId}/api/test`);
    console.log(`  curl -X POST https://wingman-tunnel.fly.dev/tunnel/${data.sessionId}/api/echo -H "Content-Type: application/json" -d '{"test": "data"}'`);
    console.log('\nPress Ctrl+C to stop');
  });
  
  client.on('request', (req) => {
    console.log(`📥 Incoming request: ${req.method} ${req.path}`);
  });
  
  client.on('error', (error) => {
    console.error('❌ Tunnel error:', error);
  });
  
  // Connect to production WebSocket
  await client.connect('wss://wingman-tunnel.fly.dev/ws');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});