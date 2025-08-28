/**
 * Tests for TunnelMessageHandler - TDD approach
 * 
 * This class handles WebSocket message routing and processing
 * for the tunnel protocol between server and Chrome extension
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TunnelMessageHandler } from '../tunnel-message-handler';
import { TunnelRequest, TunnelResponse, RegisterMessage, TunnelMessage, ProtocolUtils, ProtocolErrorCode } from '@wingman/shared';
import WebSocket from 'ws';

describe('TunnelMessageHandler', () => {
  let handler: TunnelMessageHandler;
  let mockRequestHandler: vi.MockedFunction<(request: TunnelRequest) => Promise<TunnelResponse>>;
  let mockErrorHandler: vi.MockedFunction<(error: Error, sessionId?: string) => void>;
  let mockWebSocket: any;

  beforeEach(() => {
    // Create fresh mock WebSocket for each test
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    mockRequestHandler = vi.fn();
    mockErrorHandler = vi.fn();
    
    handler = new TunnelMessageHandler({
      onRequest: mockRequestHandler,
      onError: mockErrorHandler,
      requestTimeoutMs: 5000
    });
  });

  afterEach(async () => {
    await handler.cleanup();
  });

  describe('session management', () => {
    it('should register new tunnel session', () => {
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        targetPort: 3000,
        timestamp: Date.now()
      };

      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      expect(handler.hasActiveSession('test-session')).toBe(true);
      expect(handler.getSessionCount()).toBe(1);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      // Verify the sent message structure
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage).toMatchObject({
        type: 'registered',
        sessionId: 'test-session',
        role: 'developer',
        tunnelUrl: expect.any(String),
        timestamp: expect.any(Number)
      });
    });

    it('should handle duplicate session registration', () => {
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'duplicate-session',
        role: 'developer',
        timestamp: Date.now()
      };

      // Register first time
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));
      
      // Register second time with same ID - use different websocket
      const mockWebSocket2 = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      
      handler.handleMessage(mockWebSocket2, JSON.stringify(registerMessage));

      expect(handler.getSessionCount()).toBe(1);
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'duplicate-session'
      );
    });

    it('should remove session on disconnect', () => {
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };

      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));
      expect(handler.hasActiveSession('test-session')).toBe(true);

      handler.handleDisconnect(mockWebSocket);
      expect(handler.hasActiveSession('test-session')).toBe(false);
    });
  });

  describe('request handling', () => {
    it('should process tunnel requests', async () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const request: TunnelRequest = {
        type: 'request',
        id: 'req_123',
        sessionId: 'test-session',
        method: 'GET',
        url: '/api/test',
        headers: { 'accept': 'application/json' },
        timestamp: Date.now()
      };

      const mockResponse: TunnelResponse = {
        type: 'response',
        id: 'req_123',
        sessionId: 'test-session',
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"success": true}',
        timestamp: Date.now()
      };

      mockRequestHandler.mockResolvedValue(mockResponse);

      handler.handleMessage(mockWebSocket, JSON.stringify(request));

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 1));

      expect(mockRequestHandler).toHaveBeenCalledWith(request);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2); // registration + response
    });

    it('should handle request processing errors', async () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const request: TunnelRequest = {
        type: 'request',
        id: 'req_error',
        sessionId: 'test-session',
        method: 'GET',
        url: '/api/error',
        headers: {},
        timestamp: Date.now()
      };

      const error = new Error('Request processing failed');
      mockRequestHandler.mockRejectedValue(error);

      handler.handleMessage(mockWebSocket, JSON.stringify(request));

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 1));

      expect(mockRequestHandler).toHaveBeenCalledWith(request);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2); // registration + error response
      
      // Check that second call contains error response
      const errorResponse = JSON.parse(mockWebSocket.send.mock.calls[1][0]);
      expect(errorResponse.type).toBe('response');
      expect(errorResponse.error).toBe('Request processing failed');
    });

    it('should reject requests for unknown sessions', () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_unknown',
        sessionId: 'unknown-session',
        method: 'GET',
        url: '/test',
        headers: {},
        timestamp: Date.now()
      };

      handler.handleMessage(mockWebSocket, JSON.stringify(request));

      expect(mockRequestHandler).not.toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      // Check error message
      const errorMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.code).toBe(ProtocolErrorCode.UNKNOWN_SESSION);
    });
  });

  describe('response handling', () => {
    it('should forward responses to pending requests', async () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'pm', // Product manager role
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const response: TunnelResponse = {
        type: 'response',
        id: 'req_123',
        sessionId: 'test-session',
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<html><body>Success</body></html>',
        timestamp: Date.now()
      };

      // Create a mock pending request
      const mockRequest: TunnelRequest = {
        type: 'request',
        id: 'req_123',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      // Simulate pending request
      const promise = handler.addPendingRequest(mockRequest);
      
      // Send response
      handler.handleMessage(mockWebSocket, JSON.stringify(response));

      const result = await promise;
      expect(result).toEqual(response);
    });

    it('should ignore responses for unknown requests', () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'pm',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const response: TunnelResponse = {
        type: 'response',
        id: 'req_unknown',
        sessionId: 'test-session',
        status: 200,
        headers: {},
        body: 'Test',
        timestamp: Date.now()
      };

      expect(() => handler.handleMessage(mockWebSocket, JSON.stringify(response))).not.toThrow();
    });
  });

  describe('message validation', () => {
    it('should reject invalid JSON', () => {
      const invalidJson = '{ invalid json';
      
      handler.handleMessage(mockWebSocket, invalidJson);

      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      const errorMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.code).toBe(ProtocolErrorCode.INVALID_MESSAGE);
    });

    it('should reject messages with invalid structure', () => {
      const invalidMessage = { invalid: 'structure' };
      
      handler.handleMessage(mockWebSocket, JSON.stringify(invalidMessage));

      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      const errorMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.code).toBe(ProtocolErrorCode.INVALID_MESSAGE);
    });
  });

  describe('heartbeat handling', () => {
    it('should respond to heartbeat with pong', () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const heartbeat = {
        type: 'heartbeat',
        sessionId: 'test-session',
        timestamp: Date.now()
      };

      handler.handleMessage(mockWebSocket, JSON.stringify(heartbeat));

      expect(mockWebSocket.send).toHaveBeenCalledTimes(2); // registration + pong
      
      const pongMessage = JSON.parse(mockWebSocket.send.mock.calls[1][0]);
      expect(pongMessage.type).toBe('pong');
      expect(pongMessage.sessionId).toBe('test-session');
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      // Register a session first
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      const requests = Array.from({ length: 3 }, (_, i) => ({
        type: 'request' as const,
        id: `req_${i}`,
        sessionId: 'test-session',
        method: 'GET',
        url: `/test/${i}`,
        headers: {},
        timestamp: Date.now()
      }));

      // Mock responses for each request
      requests.forEach((req, i) => {
        const mockResponse: TunnelResponse = {
          type: 'response',
          id: req.id,
          sessionId: 'test-session',
          status: 200,
          headers: {},
          body: `Response ${i}`,
          timestamp: Date.now()
        };
        mockRequestHandler.mockResolvedValueOnce(mockResponse);
      });

      // Send all requests
      requests.forEach(req => {
        handler.handleMessage(mockWebSocket, JSON.stringify(req));
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRequestHandler).toHaveBeenCalledTimes(3);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(4); // 3 responses + 1 registration confirmation
    });
  });

  describe('cleanup', () => {
    it('should clean up all active sessions', async () => {
      // Register a session
      const registerMessage: RegisterMessage = {
        type: 'register',
        sessionId: 'test-session',
        role: 'developer',
        timestamp: Date.now()
      };
      handler.handleMessage(mockWebSocket, JSON.stringify(registerMessage));

      expect(handler.getSessionCount()).toBe(1);

      await handler.cleanup();

      expect(handler.getSessionCount()).toBe(0);
    });
  });
});