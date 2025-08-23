#!/usr/bin/env node
const http = require('http');

const server = http.createServer((req, res) => {
  // Accept any host - no host header validation
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Server - Tunnel Working!</title>
  <style>
    body { font-family: Arial; margin: 40px; background: #f0f8ff; }
    .success { color: #006400; font-size: 24px; font-weight: bold; }
    .info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="success">🎉 TUNNEL IS WORKING! 🎉</div>
  <div class="info">
    <h3>Request Details</h3>
    <p><strong>Method:</strong> ${req.method}</p>
    <p><strong>URL:</strong> ${req.url}</p>
    <p><strong>Host:</strong> ${req.headers.host}</p>
    <p><strong>User-Agent:</strong> ${req.headers['user-agent']}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  </div>
  <div class="info">
    <h3>Test Links</h3>
    <p><a href="/api/test">API Test</a></p>
    <p><a href="/assets/style.css">CSS File Test</a></p>
    <p><a href="/about">About Page</a></p>
  </div>
</body>
</html>`;

  if (req.url === '/api/test') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true, 
      message: 'API endpoint working through tunnel!',
      timestamp: new Date().toISOString(),
      host: req.headers.host
    }));
  } else if (req.url === '/assets/style.css') {
    res.setHeader('Content-Type', 'text/css');
    res.end('body { background: #e6ffe6; } .tunnel-test { color: #008000; }');
  } else {
    res.end(html);
  }
});

const PORT = 3005;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('✅ Accepts connections from any host (perfect for tunnel testing)');
});