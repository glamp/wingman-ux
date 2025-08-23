import { Router, Request, Response } from 'express';
import { SessionManager } from '../session-manager.js';
import { ConnectionManager } from '../connection-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createStaticRouter(sessionManager: SessionManager, connectionManager: ConnectionManager): Router {
  const router = Router();

  /**
   * GET /sessions/:id - Legacy path for session pages
   */
  router.get('/sessions/:id', handleSessionPage);
  
  /**
   * GET / - Smart routing based on subdomain
   * - No subdomain (wingmanux.com) → Landing page
   * - Session subdomain (ghost-whiskey.wingmanux.com) → Session page
   * - Localhost or IP → Landing page
   */
  router.get('/', (req: Request, res: Response) => {
    const host = req.get('host');
    
    if (host) {
      // Check for subdomain
      const parts = host.split('.');
      
      // Subdomain present: at least 3 parts (subdomain.domain.tld)
      // Also handle localhost:port and IP addresses gracefully
      const hasSubdomain = parts.length >= 3 && 
                          !host.startsWith('www.') && 
                          !host.match(/^\d+\.\d+\.\d+\.\d+/); // Not an IP
      
      if (hasSubdomain) {
        const sessionId = parts[0];
        
        // Always treat subdomains as potential session IDs - validate format first
        if (sessionId && sessionId.match(/^[a-z]+-[a-z]+$/)) {
          // Valid format, check if session exists
          const session = sessionManager.getSession(sessionId);
          if (session && connectionManager.isConnected(sessionId)) {
            // Session exists and developer is connected - proxy to localhost
            return handleProxyRequest(req, res, sessionId);
          } else {
            // Session pending or not connected - show session page
            (req as any).params = { id: sessionId };
            return handleSessionPage(req as any, res);
          }
        } else if (sessionId) {
          // Invalid session ID format - return 404
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Invalid Session - Wingman</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <link rel="stylesheet" href="/static/styles.css">
            </head>
            <body>
              <div class="container">
                <h1>Invalid Session ID</h1>
                <p>The session ID "${sessionId}" is not valid. Session IDs should be in the format: word-word (e.g., ghost-whiskey).</p>
                <p><a href="https://wingman-tunnel.fly.dev">Return to Wingman Tunnel</a></p>
              </div>
            </body>
            </html>
          `);
        }
      }
    }
    
    // Default: serve landing page for:
    // - No subdomain (wingmanux.com)
    // - www subdomain (www.wingmanux.com)
    // - localhost
    // - IP addresses
    // - Invalid session IDs
    return res.sendFile(path.join(__dirname, '..', 'static', 'index.html'));
  });

  /**
   * GET /* - Catch all routes for session subdomains ONLY
   * This handles any path on a session subdomain (e.g., ghost-whiskey.wingmanux.com/api/data)
   * Only applies to requests that come from session subdomains
   */
  router.get('/*', (req: Request, res: Response, next: Function) => {
    const host = req.get('host');
    
    if (host) {
      // Check for subdomain
      const parts = host.split('.');
      
      // Subdomain present: at least 3 parts (subdomain.domain.tld)
      const hasSubdomain = parts.length >= 3 && 
                          !host.startsWith('www.') && 
                          !host.match(/^\d+\.\d+\.\d+\.\d+/); // Not an IP
      
      if (hasSubdomain) {
        const sessionId = parts[0];
        
        // Check if it's a valid session format
        if (sessionId && sessionId.match(/^[a-z]+-[a-z]+$/)) {
          const session = sessionManager.getSession(sessionId);
          if (session && connectionManager.isConnected(sessionId)) {
            // Session exists and developer is connected - proxy to localhost
            return handleProxyRequest(req, res, sessionId);
          }
          // For session pages or invalid sessions, fall through to next middleware
        }
      }
    }
    
    // Not a session subdomain, continue to next middleware
    next();
  });
  
  async function handleProxyRequest(req: Request, res: Response, sessionId: string) {
    try {
      // Build the proxied request
      const proxiedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        method: req.method,
        path: req.path + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''),
        headers: req.headers as Record<string, string | string[]>,
        body: null as string | null
      };

      // Add body if present (but not for GET/HEAD/DELETE typically)
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (typeof req.body === 'object') {
          proxiedRequest.body = JSON.stringify(req.body);
        } else {
          proxiedRequest.body = req.body;
        }
      }

      // Forward the request to the developer
      const response = await connectionManager.forwardRequest(sessionId, proxiedRequest);
      
      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Send the response
      res.status(response.status);
      
      // Handle different content types
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        try {
          res.json(JSON.parse(response.body));
        } catch {
          res.send(response.body);
        }
      } else if (contentType && contentType.includes('image/')) {
        // Binary data is base64 encoded
        const buffer = Buffer.from(response.body, 'base64');
        res.send(buffer);
      } else {
        res.send(response.body);
      }
    } catch (error: any) {
      console.error('Proxy request error:', error);
      // Fall back to session page on proxy error
      (req as any).params = { id: sessionId };
      return handleSessionPage(req, res);
    }
  }
  
  function handleSessionPage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).send('Session ID is required');
      }
      const session = sessionManager.getSession(id);

      if (!session) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Session Not Found - Wingman</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="/static/styles.css">
          </head>
          <body>
            <div class="container">
              <h1>Session Not Found</h1>
              <p>The tunnel session "${id}" could not be found or has expired.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Serve the session page with session data embedded
      const sessionPageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Wingman Tunnel - Session ${id}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="/static/styles.css">
        </head>
        <body>
          <div class="container">
            <header>
              <h1>🪂 Wingman Tunnel</h1>
              <div class="session-info">
                <span class="session-id">Session: ${id}</span>
                <span class="status status-${session.status}">${session.status.toUpperCase()}</span>
              </div>
            </header>
            
            <main>
              <div class="connection-status">
                <h2>Connection Status</h2>
                <div class="status-indicator">
                  <div class="status-dot status-${session.status}"></div>
                  <span>${session.status === 'pending' ? 'Waiting for connection...' : 
                          session.status === 'active' ? 'Connected' : 'Session expired'}</span>
                </div>
              </div>
              
              <div class="app-preview">
                <h2>Application Preview</h2>
                <div class="iframe-placeholder">
                  <p>🚧 Application tunnel will appear here once connected</p>
                  <p class="target-info">Target: localhost:${session.targetPort}</p>
                </div>
              </div>
            </main>
          </div>
          
          <script>
            window.SESSION_DATA = ${JSON.stringify(session)};
          </script>
          <script src="/static/p2p-client.js"></script>
          <script src="/static/iframe-proxy.js"></script>
          <script src="/static/connection-monitor.js"></script>
          <script src="/static/client.js"></script>
        </body>
        </html>
      `;

      res.send(sessionPageHtml);
    } catch (error) {
      console.error('Error serving session page:', error);
      res.status(500).send('Internal server error');
    }
  }

  return router;
}