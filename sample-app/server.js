const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request tracking for feedback loop
const requestLog = [];
const MAX_LOG_SIZE = 1000;

function logRequest(req, res, responseData = null) {
  const logEntry = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      'host': req.get('host'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'referer': req.get('referer'),
    },
    body: req.body,
    ip: req.ip,
    responseStatus: res.statusCode,
    responseData: responseData,
    processingTime: Date.now() - req.startTime
  };
  
  requestLog.unshift(logEntry);
  if (requestLog.length > MAX_LOG_SIZE) {
    requestLog.pop();
  }
  
  console.log(`[${logEntry.timestamp}] ${req.method} ${req.url} -> ${res.statusCode} (${logEntry.processingTime}ms)`);
}

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  // Intercept res.json to log response data
  const originalJson = res.json;
  res.json = function(data) {
    logRequest(req, res, data);
    return originalJson.call(this, data);
  };
  
  // Intercept res.send for non-JSON responses
  const originalSend = res.send;
  res.send = function(data) {
    if (!res.headersSent && res.getHeader('content-type') && !res.getHeader('content-type').includes('json')) {
      logRequest(req, res, { type: 'html/text', size: data ? data.length : 0 });
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Main landing page - comprehensive tunnel test interface
app.get('/', (req, res) => {
  const tunnelHost = req.get('host') || 'localhost:3000';
  const isTunneled = tunnelHost.includes('wingmanux.com');
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🚇 Wingman Tunnel Test Application</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #333;
          line-height: 1.6;
          min-height: 100vh;
        }
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-align: center;
        }
        .status {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin: 10px 0;
        }
        .status.tunneled { background: #4CAF50; color: white; }
        .status.direct { background: #FF9800; color: white; }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .info-card h3 {
          color: #5a67d8;
          margin-bottom: 15px;
          font-size: 18px;
        }
        .test-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .test-btn {
          background: #5a67d8;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .test-btn:hover {
          background: #4c51bf;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(90, 103, 216, 0.4);
        }
        .test-btn:active { transform: translateY(0); }
        .results {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          padding: 25px;
          margin-top: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        #testResults {
          font-family: 'Courier New', monospace;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          max-height: 400px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-size: 12px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .metric {
          background: #f7fafc;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #5a67d8;
        }
        .metric-label {
          font-size: 12px;
          color: #718096;
          margin-top: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚇 Wingman Tunnel Test Application</h1>
          <div class="status ${isTunneled ? 'tunneled' : 'direct'}">
            ${isTunneled ? '✅ TUNNELED via ' + tunnelHost : '⚡ DIRECT ACCESS'}
          </div>
          <p>Comprehensive tunnel testing with real-time feedback</p>
        </div>
        
        <div class="info-grid">
          <div class="info-card">
            <h3>🌐 Connection Info</h3>
            <p><strong>Host:</strong> ${tunnelHost}</p>
            <p><strong>User Agent:</strong> ${req.get('user-agent') || 'Unknown'}</p>
            <p><strong>IP:</strong> ${req.ip}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="info-card">
            <h3>🧪 Available Tests</h3>
            <p>• GET/POST endpoints</p>
            <p>• JSON API responses</p>
            <p>• File uploads</p>
            <p>• Error handling</p>
            <p>• Performance metrics</p>
          </div>
          
          <div class="info-card">
            <h3>📊 Live Metrics</h3>
            <div class="metrics" id="liveMetrics">
              <div class="metric">
                <div class="metric-value" id="requestCount">0</div>
                <div class="metric-label">Requests</div>
              </div>
              <div class="metric">
                <div class="metric-value" id="avgLatency">0ms</div>
                <div class="metric-label">Avg Latency</div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>🧪 Interactive Tests</h3>
          <div class="test-buttons">
            <button class="test-btn" onclick="runTest('health')">Health Check</button>
            <button class="test-btn" onclick="runTest('api')">API Test</button>
            <button class="test-btn" onclick="runTest('post')">POST Test</button>
            <button class="test-btn" onclick="runTest('upload')">File Upload</button>
            <button class="test-btn" onclick="runTest('error')">Error Test</button>
            <button class="test-btn" onclick="runTest('performance')">Performance Test</button>
            <button class="test-btn" onclick="runTest('logs')">View Logs</button>
            <button class="test-btn" onclick="runAllTests()">Run All Tests</button>
          </div>
          
          <div class="results">
            <h4>🔍 Test Results</h4>
            <div id="testResults">Click a test button to see results...</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Wingman Tunnel Test App | Running on Node.js | ${new Date().toISOString()}</p>
      </div>

      <script>
        let testResults = document.getElementById('testResults');
        let requestCount = 0;
        let latencySum = 0;

        function updateMetrics(latency) {
          requestCount++;
          latencySum += latency;
          document.getElementById('requestCount').textContent = requestCount;
          document.getElementById('avgLatency').textContent = Math.round(latencySum / requestCount) + 'ms';
        }

        function logResult(test, result, latency = 0) {
          const timestamp = new Date().toLocaleTimeString();
          const status = result.success ? '✅' : '❌';
          testResults.textContent += \`[\${timestamp}] \${status} \${test}: \${result.message}\\n\`;
          if (latency) updateMetrics(latency);
          testResults.scrollTop = testResults.scrollHeight;
        }

        async function runTest(testType) {
          const startTime = Date.now();
          testResults.textContent += \`\\n🔄 Running \${testType} test...\\n\`;
          
          try {
            switch(testType) {
              case 'health':
                const healthResp = await fetch('/health');
                const healthData = await healthResp.json();
                const latency = Date.now() - startTime;
                logResult('Health Check', {
                  success: healthResp.ok,
                  message: \`Status: \${healthData.status}, Uptime: \${healthData.uptime}s\`
                }, latency);
                break;

              case 'api':
                const apiResp = await fetch('/api/info');
                const apiData = await apiResp.json();
                logResult('API Test', {
                  success: apiResp.ok,
                  message: \`Server: \${apiData.server}, Requests: \${apiData.totalRequests}\`
                }, Date.now() - startTime);
                break;

              case 'post':
                const postResp = await fetch('/api/echo', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ test: 'tunnel-data', timestamp: Date.now() })
                });
                const postData = await postResp.json();
                logResult('POST Test', {
                  success: postResp.ok,
                  message: \`Echo: \${postData.echo.test}\`
                }, Date.now() - startTime);
                break;

              case 'upload':
                const formData = new FormData();
                formData.append('testFile', new Blob(['tunnel test file'], { type: 'text/plain' }), 'test.txt');
                const uploadResp = await fetch('/upload', {
                  method: 'POST',
                  body: formData
                });
                const uploadData = await uploadResp.json();
                logResult('File Upload', {
                  success: uploadResp.ok,
                  message: \`Uploaded: \${uploadData.filename}, Size: \${uploadData.size} bytes\`
                }, Date.now() - startTime);
                break;

              case 'error':
                const errorResp = await fetch('/api/error');
                logResult('Error Test', {
                  success: errorResp.status === 500,
                  message: \`Expected 500 error: \${errorResp.status}\`
                }, Date.now() - startTime);
                break;

              case 'performance':
                const perfPromises = Array.from({length: 10}, (_, i) => 
                  fetch(\`/api/ping?test=\${i}\`).then(r => r.json())
                );
                const perfResults = await Promise.all(perfPromises);
                logResult('Performance Test', {
                  success: perfResults.length === 10,
                  message: \`10 concurrent requests completed in \${Date.now() - startTime}ms\`
                }, Date.now() - startTime);
                break;

              case 'logs':
                const logsResp = await fetch('/api/logs');
                const logsData = await logsResp.json();
                logResult('Logs Test', {
                  success: logsResp.ok,
                  message: \`Retrieved \${logsData.logs.length} recent requests\`
                }, Date.now() - startTime);
                break;
            }
          } catch (error) {
            logResult(testType, {
              success: false,
              message: \`Error: \${error.message}\`
            });
          }
        }

        async function runAllTests() {
          testResults.textContent = '🚀 Running comprehensive test suite...\\n\\n';
          const tests = ['health', 'api', 'post', 'upload', 'performance'];
          for (const test of tests) {
            await runTest(test);
            await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
          }
          testResults.textContent += '\\n✅ All tests completed!\\n';
        }

        // Auto-refresh metrics every 10 seconds
        setInterval(async () => {
          try {
            const resp = await fetch('/api/info');
            const data = await resp.json();
            document.getElementById('requestCount').textContent = data.totalRequests;
          } catch (e) {}
        }, 10000);
      </script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    tunnelHost: req.get('host'),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API endpoints
app.get('/api/info', (req, res) => {
  res.json({
    server: 'wingman-test-app',
    timestamp: new Date().toISOString(),
    totalRequests: requestLog.length,
    recentRequests: requestLog.slice(0, 10),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    tunnelHost: req.get('host'),
    userAgent: req.get('user-agent'),
    ip: req.ip
  });
});

app.get('/api/ping', (req, res) => {
  res.json({
    pong: true,
    timestamp: Date.now(),
    test: req.query.test || 'default'
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    echo: req.body,
    timestamp: new Date().toISOString(),
    method: req.method,
    contentType: req.get('content-type'),
    size: JSON.stringify(req.body).length
  });
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    logs: requestLog.slice(0, limit),
    total: requestLog.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/error', (req, res) => {
  res.status(500).json({
    error: 'Intentional test error',
    timestamp: new Date().toISOString(),
    message: 'This is a deliberate error for testing error handling'
  });
});

// File upload endpoint
app.post('/upload', (req, res) => {
  // Simple upload simulation (in real app would use multer)
  res.json({
    success: true,
    filename: 'test.txt',
    size: req.get('content-length') || 0,
    timestamp: new Date().toISOString(),
    message: 'File upload simulation completed'
  });
});

// Performance test endpoint
app.get('/api/performance/:delay?', (req, res) => {
  const delay = parseInt(req.params.delay) || 0;
  setTimeout(() => {
    res.json({
      delay,
      timestamp: Date.now(),
      message: 'Performance test completed'
    });
  }, delay);
});

// Static test page
app.get('/static', (req, res) => {
  res.send(`
    <html>
      <head><title>Static Test Page</title></head>
      <body>
        <h1>Static Content Test</h1>
        <p>This is a static test page served at: ${new Date().toISOString()}</p>
        <p>Host: ${req.get('host')}</p>
        <img src="https://via.placeholder.com/200x100?text=Test+Image" alt="Test Image">
      </body>
    </html>
  `);
});

// 404 handler
app.use('*', (req, res) => {
  logRequest(req, res, { error: '404 Not Found' });
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/info',
      'GET /api/ping',
      'POST /api/echo',
      'GET /api/logs',
      'GET /api/error',
      'POST /upload',
      'GET /static'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString(),
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚇 Wingman Test App running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});