import { Router, Request, Response } from 'express';
import { SessionManager } from '../session-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createStaticRouter(sessionManager: SessionManager): Router {
  const router = Router();

  /**
   * GET / - Serve landing page
   */
  router.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'index.html'));
  });

  /**
   * GET /sessions/:id - Serve PM access page
   */
  router.get('/sessions/:id', (req: Request, res: Response) => {
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
          <script src="/static/client.js"></script>
        </body>
        </html>
      `;

      res.send(sessionPageHtml);
    } catch (error) {
      console.error('Error serving session page:', error);
      res.status(500).send('Internal server error');
    }
  });

  return router;
}