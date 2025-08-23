import { Router, Request, Response } from 'express';
import { SessionManager } from '../session-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createStaticRouter(sessionManager: SessionManager): Router {
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
        
        // Validate it looks like a session ID (format: word-word)
        if (sessionId && sessionId.match(/^[a-z]+-[a-z]+$/)) {
          (req as any).params = { id: sessionId };
          return handleSessionPage(req as any, res);
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