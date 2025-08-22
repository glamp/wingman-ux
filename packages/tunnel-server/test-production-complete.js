#!/usr/bin/env node

/**
 * Complete production test for tunnel server
 */

import { TunnelClient } from './dist/tunnel-client.js';
import express from 'express';
import { createServer } from 'http';

const sessionId = process.argv[2];
const port = parseInt(process.argv[3]) || 7777;

const app = express();
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from tunneled server!', 
    timestamp: new Date().toISOString(),
    session: sessionId,
    port: port
  });
});

// Echo endpoint for POST testing
app.post('/api/echo', (req, res) => {
  res.json({
    echo: req.body,
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
});

// Test various HTTP methods
app.get('/api/test', (req, res) => {
  res.json({ method: 'GET', query: req.query });
});

app.put('/api/test', (req, res) => {
  res.json({ method: 'PUT', body: req.body });
});

app.delete('/api/test/:id', (req, res) => {
  res.json({ method: 'DELETE', id: req.params.id });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

const server = createServer(app);
server.listen(port, async () => {
  console.log(`✅ Local server running on port ${port}`);
  console.log(`   Endpoints:`);
  console.log(`   - GET  /`);
  console.log(`   - POST /api/echo`);
  console.log(`   - GET  /api/test`);
  console.log(`   - PUT  /api/test`);
  console.log(`   - DELETE /api/test/:id`);
  console.log(`   - GET  /health`);
  
  const client = new TunnelClient(sessionId, port);
  
  client.on('registered', () => {
    console.log('\n✅ Tunnel established!');
    console.log(`🌐 Public URL: https://wingman-tunnel.fly.dev/tunnel/${sessionId}/`);
    console.log('\nWaiting for requests...');
  });
  
  client.on('request', (req) => {
    console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.path}`);
  });
  
  client.on('error', (error) => {
    console.error('❌ Tunnel error:', error.message);
  });
  
  try {
    console.log('\n🔌 Connecting to tunnel server...');
    await client.connect('wss://wingman-tunnel.fly.dev/ws');
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});