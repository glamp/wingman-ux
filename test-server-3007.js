#!/usr/bin/env node
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.end(JSON.stringify({ 
    port: 3007,
    message: 'Test server on port 3007 - THIRD SERVER!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  }));
});

server.listen(3007, '0.0.0.0', () => {
  console.log(`🚀 Test server running on http://localhost:3007`);
});