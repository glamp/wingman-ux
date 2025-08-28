const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Tunnel Success</title>
    </head>
    <body>
      <h1>✅ Tunnel Working!</h1>
      <p>This response came through the test-tunnel at ${req.headers.host}</p>
      <p>Original URL: ${req.url}</p>
      <p>Time: ${new Date().toISOString()}</p>
    </body>
    </html>
  `);
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Tunnel API endpoint working',
    tunnel: req.headers.host,
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Access via tunnel: http://test-tunnel.localhost:8787`);
});