import { TunnelClient } from './dist/tunnel-client.js';
import express from 'express';
import { createServer } from 'http';

const sessionId = process.argv[2];
const port = parseInt(process.argv[3]);

const app = express();
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from tunneled server!', 
    timestamp: new Date().toISOString(),
    headers: req.headers 
  });
});

const server = createServer(app);
server.listen(port, async () => {
  console.log(`✅ Local server running on port ${port}`);
  
  const client = new TunnelClient(sessionId, port);
  
  client.on('registered', () => {
    console.log('✅ Registered with tunnel server');
    console.log(`🌐 Test URL: https://wingman-tunnel.fly.dev/tunnel/${sessionId}/`);
  });
  
  client.on('request', (req) => {
    console.log(`📥 Request: ${req.method} ${req.path}`);
  });
  
  try {
    await client.connect('wss://wingman-tunnel.fly.dev/ws');
    console.log('✅ Tunnel connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});
