import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';

/**
 * Test application server with various endpoints for testing proxy functionality
 */
export function createTestApp() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser() as any);

  // File upload setup
  const upload = multer({ dest: '/tmp/uploads/' });

  // Track sessions for auth testing
  const sessions = new Map<string, any>();

  // === Basic HTTP endpoints ===

  // GET - Returns JSON
  app.get('/api/data', (req, res) => {
    res.json({ 
      data: 'test',
      timestamp: Date.now(),
      headers: req.headers
    });
  });

  // POST - Creates resource
  app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    res.status(201).json({
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      created: new Date().toISOString()
    });
  });

  // PUT - Updates resource
  app.put('/api/users/:id', (req, res) => {
    res.json({
      id: req.params.id,
      ...req.body,
      updated: new Date().toISOString()
    });
  });

  // DELETE - Deletes resource
  app.delete('/api/users/:id', (req, res) => {
    res.status(204).send();
  });

  // === Authentication endpoints ===

  // Login - Sets cookie
  app.post('/auth/login', (req, res) => {
    const sessionId = Math.random().toString(36).substr(2, 9);
    sessions.set(sessionId, { 
      user: req.body.username || 'testuser',
      loginTime: Date.now()
    });
    
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ 
      success: true, 
      sessionId,
      user: req.body.username || 'testuser'
    });
  });

  // Protected endpoint - Requires cookie
  app.get('/api/protected', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({ 
      message: 'Access granted',
      session: sessions.get(sessionId)
    });
  });

  // Logout - Clears cookie
  app.post('/auth/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ success: true });
  });

  // === OAuth simulation ===

  // OAuth redirect
  app.get('/auth/oauth', (req, res) => {
    const redirectUri = req.query.redirect_uri || 'http://localhost:3000/auth/callback';
    const state = req.query.state || 'random-state';
    
    // Simulate OAuth provider redirect
    res.redirect(`${redirectUri}?code=mock-auth-code&state=${state}`);
  });

  // OAuth callback
  app.get('/auth/callback', (req, res) => {
    const { code, state } = req.query;
    
    if (code === 'mock-auth-code') {
      const sessionId = Math.random().toString(36).substr(2, 9);
      sessions.set(sessionId, { 
        user: 'oauth-user',
        provider: 'mock',
        loginTime: Date.now()
      });
      
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 3600000
      });
      
      res.redirect('/dashboard');
    } else {
      res.status(400).json({ error: 'Invalid auth code' });
    }
  });

  // === File handling ===

  // File upload
  app.post('/upload', upload.single('file') as any, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });

  // File download
  app.get('/download/:filename', (req, res) => {
    const content = `Test file content for ${req.params.filename}\n`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.send(content);
  });

  // === Redirect testing ===

  app.get('/redirect', (req, res) => {
    res.redirect('/redirected');
  });

  app.get('/redirected', (req, res) => {
    res.json({ message: 'You were redirected here' });
  });

  // === Headers testing ===

  app.get('/headers', (req, res) => {
    res.json({
      headers: req.headers,
      cookies: req.cookies
    });
  });

  app.post('/headers', (req, res) => {
    // Echo back custom headers
    Object.keys(req.headers).forEach(header => {
      if (header.startsWith('x-')) {
        res.setHeader(header, req.headers[header] as string);
      }
    });
    
    res.json({
      received: req.headers,
      body: req.body
    });
  });

  // === Streaming ===

  app.get('/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let counter = 0;
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ counter: counter++ })}\n\n`);
      
      if (counter > 5) {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // === Error scenarios ===

  app.get('/error/500', (req, res) => {
    res.status(500).json({ error: 'Internal server error' });
  });

  app.get('/error/timeout', async (req, res) => {
    // Simulate slow endpoint
    await new Promise(resolve => setTimeout(resolve, 10000));
    res.json({ message: 'This took a while' });
  });

  // === WebSocket handling ===

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established in test app');

    ws.on('message', (message) => {
      const data = message.toString();
      console.log('Test app received:', data);
      
      // Echo back the message
      ws.send(data);
      
      // Handle special commands
      if (data === 'ping') {
        ws.send('pong');
      } else if (data === 'close') {
        ws.close();
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed in test app');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error in test app:', error);
    });

    // Send initial message
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  // === Default route ===

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test App</title>
      </head>
      <body>
        <h1>Test Application</h1>
        <p>This is a test application for proxy testing.</p>
        <div id="ws-status">WebSocket: Not connected</div>
        <script>
          const ws = new WebSocket('ws://' + window.location.host + '/ws');
          ws.onopen = () => {
            document.getElementById('ws-status').textContent = 'WebSocket: Connected';
          };
          ws.onmessage = (event) => {
            console.log('Received:', event.data);
          };
        </script>
      </body>
      </html>
    `);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ 
      error: 'Not found',
      path: req.path
    });
  });

  return { app, server, wss };
}

/**
 * Start test app on specified port
 */
export async function startTestApp(port: number): Promise<Server> {
  const { server } = createTestApp();
  
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`Test app running on port ${port}`);
      resolve(server);
    }).on('error', reject);
  });
}

/**
 * Stop test app
 */
export async function stopTestApp(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Test app stopped');
      resolve();
    });
  });
}