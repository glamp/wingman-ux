import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { SessionManager } from '../session-manager.js';
import { createSessionsRouter } from '../routes/sessions.js';
import { createStaticRouter } from '../routes/static.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Tunnel Server API', () => {
  let app: express.Application;
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a fresh app and session manager for each test
    app = express();
    sessionManager = new SessionManager();

    // Set up middleware
    app.use(cors());
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Set up routes
    app.use('/api', createSessionsRouter(sessionManager));
    app.use('/static', express.static(path.join(__dirname, '../static')));
    app.use('/', createStaticRouter(sessionManager));

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeSessions: sessionManager.getActiveSessions().length
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        code: 'NOT_FOUND',
        path: req.path
      });
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session with valid data', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev',
          targetPort: 3000
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('tunnelUrl');
      expect(response.body.session.developerId).toBe('test-dev');
      expect(response.body.session.targetPort).toBe(3000);
      expect(response.body.session.status).toBe('pending');
      expect(response.body.tunnelUrl).toMatch(/^https:\/\/.+\.wingman\.dev$/);
    });

    it('should reject request with missing developerId', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          targetPort: 3000
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with missing targetPort', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev'
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with invalid port number', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev',
          targetPort: 70000 // Invalid port > 65535
        })
        .expect(400);

      expect(response.body.error).toContain('valid port number');
      expect(response.body.code).toBe('INVALID_PORT');
    });

    it('should reject request with negative port number', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev',
          targetPort: -1
        })
        .expect(400);

      expect(response.body.error).toContain('valid port number');
      expect(response.body.code).toBe('INVALID_PORT');
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session for valid ID', async () => {
      // Create a session first
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev',
          targetPort: 3000
        });

      const sessionId = createResponse.body.sessionId;

      // Get the session
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('tunnelUrl');
      expect(response.body.session.id).toBe(sessionId);
      expect(response.body.session.developerId).toBe('test-dev');
      expect(response.body.session.targetPort).toBe(3000);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/sessions/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Session not found');
      expect(response.body.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('activeSessions');
      expect(response.body.status).toBe('healthy');
      expect(typeof response.body.activeSessions).toBe('number');
    });
  });

  describe('GET /sessions/:id', () => {
    it('should serve session page for valid session', async () => {
      // Create a session first
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({
          developerId: 'test-dev',
          targetPort: 3000
        });

      const sessionId = createResponse.body.sessionId;

      // Get the session page
      const response = await request(app)
        .get(`/sessions/${sessionId}`)
        .expect(200);

      expect(response.text).toContain('Wingman Tunnel');
      expect(response.text).toContain(sessionId);
      expect(response.text).toContain('localhost:3000');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should return 404 page for non-existent session', async () => {
      const response = await request(app)
        .get('/sessions/nonexistent')
        .expect(404);

      expect(response.text).toContain('Session Not Found');
      expect(response.text).toContain('nonexistent');
    });
  });

  describe('GET /static/*', () => {
    it('should serve static CSS file', async () => {
      const response = await request(app)
        .get('/static/styles.css')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/css/);
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should serve static JS file', async () => {
      const response = await request(app)
        .get('/static/client.js')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/javascript/);
      expect(response.text).toContain('Wingman Tunnel Client');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body.error).toBe('Not found');
      expect(response.body.code).toBe('NOT_FOUND');
      expect(response.body.path).toBe('/unknown-route');
    });
  });
});