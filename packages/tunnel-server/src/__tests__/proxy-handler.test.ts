import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ProxyHandler } from '../proxy-handler';
import { ConnectionManager } from '../connection-manager';
import { SessionManager } from '../session-manager';
import type { Server } from 'http';

describe('ProxyHandler', () => {
  let app: express.Application;
  let proxyHandler: ProxyHandler;
  let connectionManager: ConnectionManager;
  let sessionManager: SessionManager;
  let server: Server;

  beforeEach(() => {
    app = express();
    connectionManager = new ConnectionManager();
    sessionManager = new SessionManager();
    proxyHandler = new ProxyHandler(connectionManager, sessionManager);
    
    // Add body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Setup the proxy route
    app.use('/:sessionId/*', proxyHandler.handleRequest.bind(proxyHandler));
    
    server = app.listen(0); // Dynamic port
  });

  afterEach(() => {
    server.close();
  });

  describe('handleRequest', () => {
    it('should return 404 if session does not exist', async () => {
      const response = await request(app)
        .get('/invalid-session/api/test')
        .expect(404);
      
      expect(response.body).toEqual({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });

    it('should return 502 if developer not connected', async () => {
      // Create session but don't connect developer
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const response = await request(app)
        .get(`/${sessionId}/api/test`)
        .expect(502);
      
      expect(response.body).toEqual({
        error: 'Developer not connected',
        code: 'DEVELOPER_NOT_CONNECTED'
      });
    });

    it('should forward GET request to developer', async () => {
      // Create session
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      // Mock developer connection
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      // Mock the response
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Hello from developer' })
      });
      
      const response = await request(app)
        .get(`/${sessionId}/api/test`)
        .expect(200);
      
      expect(response.body).toEqual({ message: 'Hello from developer' });
      expect(connectionManager.forwardRequest).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          method: 'GET',
          path: '/api/test'
        })
      );
    });

    it('should forward POST request with body', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: '123', name: 'Test User' })
      });
      
      const response = await request(app)
        .post(`/${sessionId}/api/users`)
        .send({ name: 'Test User' })
        .expect(201);
      
      expect(response.body).toEqual({ id: '123', name: 'Test User' });
      expect(connectionManager.forwardRequest).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          method: 'POST',
          path: '/api/users',
          body: JSON.stringify({ name: 'Test User' })
        })
      );
    });

    it('should forward headers correctly', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: 'OK'
      });
      
      await request(app)
        .get(`/${sessionId}/api/test`)
        .set('Authorization', 'Bearer token123')
        .set('X-Custom-Header', 'custom-value')
        .expect(200);
      
      expect(connectionManager.forwardRequest).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': 'Bearer token123',
            'x-custom-header': 'custom-value'
          })
        })
      );
    });

    it('should handle cookies', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'set-cookie': ['sessionId=abc123; Path=/; HttpOnly']
        },
        body: JSON.stringify({ loggedIn: true })
      });
      
      const response = await request(app)
        .post(`/${sessionId}/auth/login`)
        .send({ username: 'test', password: 'test' })
        .expect(200);
      
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.body).toEqual({ loggedIn: true });
    });

    it('should handle request timeout', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      vi.spyOn(connectionManager, 'forwardRequest').mockRejectedValue(
        new Error('Request timeout')
      );
      
      const response = await request(app)
        .get(`/${sessionId}/api/slow`)
        .expect(504);
      
      expect(response.body).toEqual({
        error: 'Request timeout',
        code: 'GATEWAY_TIMEOUT'
      });
    });

    it('should handle developer disconnection during request', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      vi.spyOn(connectionManager, 'forwardRequest').mockRejectedValue(
        new Error('Developer disconnected')
      );
      
      const response = await request(app)
        .get(`/${sessionId}/api/test`)
        .expect(502);
      
      expect(response.body).toEqual({
        error: 'Developer disconnected',
        code: 'DEVELOPER_DISCONNECTED'
      });
    });

    it('should handle different content types', async () => {
      const sessionId = sessionManager.createSession('dev-123', 3000);
      
      const mockWs = {
        send: vi.fn(),
        readyState: 1,
        on: vi.fn(),
        close: vi.fn()
      };
      connectionManager.registerDeveloper(sessionId, mockWs as any);
      
      // Test HTML response
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<html><body>Hello</body></html>'
      });
      
      const htmlResponse = await request(app)
        .get(`/${sessionId}/`)
        .expect(200);
      
      expect(htmlResponse.text).toBe('<html><body>Hello</body></html>');
      expect(htmlResponse.headers['content-type']).toContain('text/html');
      
      // Test binary response (base64 encoded)
      vi.spyOn(connectionManager, 'forwardRequest').mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'image/png' },
        body: Buffer.from('fake-image-data').toString('base64')
      });
      
      const imageResponse = await request(app)
        .get(`/${sessionId}/image.png`)
        .expect(200);
      
      expect(imageResponse.headers['content-type']).toContain('image/png');
    });
  });
});