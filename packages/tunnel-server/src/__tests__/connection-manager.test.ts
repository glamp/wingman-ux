import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { ConnectionManager } from '../connection-manager';
import type { IncomingMessage } from 'http';

// Mock WebSocket
vi.mock('ws');

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let mockWs: any;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      readyState: WebSocket.OPEN,
      removeAllListeners: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDeveloper', () => {
    it('should register a new developer connection', () => {
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      
      expect(connectionManager.isConnected(sessionId)).toBe(true);
      expect(connectionManager.getConnection(sessionId)).toBe(mockWs);
    });

    it('should replace existing connection for same session', () => {
      const sessionId = 'test-session';
      const oldWs = { ...mockWs, id: 'old' };
      const newWs = { ...mockWs, id: 'new' };
      
      connectionManager.registerDeveloper(sessionId, oldWs);
      connectionManager.registerDeveloper(sessionId, newWs);
      
      expect(connectionManager.getConnection(sessionId)).toBe(newWs);
      expect(oldWs.close).toHaveBeenCalled();
    });

    it('should handle multiple different sessions', () => {
      connectionManager.registerDeveloper('session-1', mockWs);
      connectionManager.registerDeveloper('session-2', { ...mockWs });
      
      expect(connectionManager.isConnected('session-1')).toBe(true);
      expect(connectionManager.isConnected('session-2')).toBe(true);
      expect(connectionManager.getActiveSessions().length).toBe(2);
    });
  });

  describe('unregisterDeveloper', () => {
    it('should remove developer connection', () => {
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      connectionManager.unregisterDeveloper(sessionId);
      
      expect(connectionManager.isConnected(sessionId)).toBe(false);
      expect(connectionManager.getConnection(sessionId)).toBeNull();
    });

    it('should clean up event listeners', () => {
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      connectionManager.unregisterDeveloper(sessionId);
      
      expect(mockWs.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('forwardRequest', () => {
    it('should forward request to connected developer', async () => {
      const sessionId = 'test-session';
      const request = {
        id: '123',
        method: 'GET',
        path: '/api/test',
        headers: { 'content-type': 'application/json' },
        body: null
      };
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      
      // Setup mock response
      const responsePromise = connectionManager.forwardRequest(sessionId, request);
      
      // Simulate response from developer
      const sendCall = mockWs.send.mock.calls[0];
      const sentData = JSON.parse(sendCall[0]);
      expect(sentData.type).toBe('request');
      expect(sentData.request.path).toBe('/api/test');
      
      // Simulate receiving response
      connectionManager.handleResponse(sessionId, {
        type: 'response',
        requestId: sentData.requestId,
        response: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ success: true })
        }
      });
      
      const response = await responsePromise;
      expect(response.status).toBe(200);
      expect(response.body).toContain('success');
    });

    it('should timeout if no response received', async () => {
      const sessionId = 'test-session';
      const request = {
        id: '123',
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: null
      };
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      
      // Set short timeout for testing
      connectionManager.setRequestTimeout(100);
      
      await expect(
        connectionManager.forwardRequest(sessionId, request)
      ).rejects.toThrow('Request timeout');
    });

    it('should reject if developer not connected', async () => {
      const request = {
        id: '123',
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: null
      };
      
      await expect(
        connectionManager.forwardRequest('non-existent', request)
      ).rejects.toThrow('Developer not connected');
    });

    it('should queue requests when multiple requests sent', async () => {
      const sessionId = 'test-session';
      connectionManager.registerDeveloper(sessionId, mockWs);
      
      const requests = [
        connectionManager.forwardRequest(sessionId, {
          id: '1',
          method: 'GET',
          path: '/api/1',
          headers: {},
          body: null
        }),
        connectionManager.forwardRequest(sessionId, {
          id: '2',
          method: 'GET',
          path: '/api/2',
          headers: {},
          body: null
        })
      ];
      
      expect(mockWs.send).toHaveBeenCalledTimes(2);
      
      // Simulate responses
      const calls = mockWs.send.mock.calls;
      calls.forEach((call: any[], index: number) => {
        const data = JSON.parse(call[0]);
        connectionManager.handleResponse(sessionId, {
          type: 'response',
          requestId: data.requestId,
          response: {
            status: 200,
            headers: {},
            body: `response-${index + 1}`
          }
        });
      });
      
      const responses = await Promise.all(requests);
      expect(responses[0]?.body).toBe('response-1');
      expect(responses[1]?.body).toBe('response-2');
    });
  });

  describe('handleDisconnection', () => {
    it('should clean up connection on disconnect', () => {
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, mockWs);
      connectionManager.handleDisconnection(sessionId);
      
      expect(connectionManager.isConnected(sessionId)).toBe(false);
    });

    it('should reject pending requests on disconnect', async () => {
      const sessionId = 'test-session';
      connectionManager.registerDeveloper(sessionId, mockWs);
      
      const requestPromise = connectionManager.forwardRequest(sessionId, {
        id: '123',
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: null
      });
      
      connectionManager.handleDisconnection(sessionId);
      
      await expect(requestPromise).rejects.toThrow('Developer disconnected');
    });
  });

  describe('getActiveSessions', () => {
    it('should return list of active session IDs', () => {
      connectionManager.registerDeveloper('session-1', mockWs);
      connectionManager.registerDeveloper('session-2', { ...mockWs });
      connectionManager.registerDeveloper('session-3', { ...mockWs });
      
      const sessions = connectionManager.getActiveSessions();
      
      expect(sessions).toHaveLength(3);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).toContain('session-3');
    });

    it('should not include disconnected sessions', () => {
      connectionManager.registerDeveloper('session-1', mockWs);
      connectionManager.registerDeveloper('session-2', { ...mockWs });
      connectionManager.unregisterDeveloper('session-1');
      
      const sessions = connectionManager.getActiveSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions).toContain('session-2');
    });
  });

  describe('broadcast', () => {
    it('should send message to all connected developers', () => {
      const ws1 = { ...mockWs, id: '1' };
      const ws2 = { ...mockWs, id: '2' };
      const ws3 = { ...mockWs, id: '3' };
      
      connectionManager.registerDeveloper('session-1', ws1);
      connectionManager.registerDeveloper('session-2', ws2);
      connectionManager.registerDeveloper('session-3', ws3);
      
      const message = { type: 'broadcast', data: 'test' };
      connectionManager.broadcast(message);
      
      expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(ws3.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should skip closed connections', () => {
      const ws1 = { ...mockWs, send: vi.fn(), readyState: WebSocket.OPEN };
      const ws2 = { ...mockWs, send: vi.fn(), readyState: WebSocket.CLOSED };
      
      connectionManager.registerDeveloper('session-1', ws1);
      connectionManager.registerDeveloper('session-2', ws2);
      
      const message = { type: 'broadcast', data: 'test' };
      connectionManager.broadcast(message);
      
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStats', () => {
    it('should return connection statistics', () => {
      connectionManager.registerDeveloper('session-1', mockWs);
      connectionManager.registerDeveloper('session-2', { ...mockWs });
      
      const stats = connectionManager.getConnectionStats();
      
      expect(stats.totalConnections).toBe(2);
      expect(stats.activeSessions).toHaveLength(2);
      expect(stats.pendingRequests).toBe(0);
    });
  });
});