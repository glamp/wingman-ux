/**
 * Tests for WebSocketManager - TDD approach
 * 
 * This class manages persistent WebSocket connections from Chrome extension
 * to the tunnel server with automatic reconnection and message handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketManager } from '../websocket-manager';
import { TunnelRequest, TunnelResponse, RegisterMessage, TunnelMessage, ProtocolErrorCode } from '@wingman/shared';

// Mock WebSocket
class MockWebSocket extends EventTarget {
  public url: string;
  public readyState: number = 0; // CONNECTING initially
  public CONNECTING = 0;
  public OPEN = 1;
  public CLOSING = 2;
  public CLOSED = 3;
  public static instances: MockWebSocket[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = this.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 1);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = this.CLOSED;
    this.dispatchEvent(new Event('close'));
  });

  static clearInstances() {
    MockWebSocket.instances = [];
  }

  static getLatestInstance(): MockWebSocket | null {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1] || null;
  }
}

// Mock chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  },
  runtime: {
    onMessage: {
      addListener: vi.fn()
    }
  }
};

// @ts-ignore
global.chrome = mockChrome;
// @ts-ignore  
global.WebSocket = MockWebSocket;

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockMessageHandler: vi.MockedFunction<(message: TunnelMessage) => void>;
  let mockErrorHandler: vi.MockedFunction<(error: Error) => void>;

  beforeEach(() => {
    mockMessageHandler = vi.fn();
    mockErrorHandler = vi.fn();
    
    // Clear mock instances
    MockWebSocket.clearInstances();
    vi.clearAllMocks();
    
    wsManager = new WebSocketManager({
      serverUrl: 'ws://localhost:8787/ws',
      onMessage: mockMessageHandler,
      onError: mockErrorHandler,
      reconnectInterval: 100, // Shorter for testing
      maxReconnectAttempts: 3
    });
  });

  afterEach(async () => {
    await wsManager.disconnect();
    MockWebSocket.clearInstances();
  });

  describe('connection management', () => {
    it('should establish WebSocket connection', async () => {
      const connected = await wsManager.connect();
      
      expect(connected).toBe(true);
      expect(wsManager.isConnected()).toBe(true);
    });

    it('should register tunnel session after connecting', async () => {
      await wsManager.connect();

      // Wait for registration message
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockWs = MockWebSocket.getLatestInstance();
      expect(mockWs?.send).toHaveBeenCalled();
      
      // Check registration message
      const sentMessage = JSON.parse((mockWs?.send as any).mock.calls[0][0]);
      expect(sentMessage.type).toBe('register');
      expect(sentMessage.role).toBe('developer');
      expect(sentMessage.sessionId).toBeDefined();
    });

    it('should handle connection failures gracefully', async () => {
      // Mock WebSocket to fail immediately
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          // Fail immediately
          setTimeout(() => {
            this.dispatchEvent(new Event('error'));
            this.readyState = this.CLOSED;
          }, 1);
        }
      } as any;

      const connected = await wsManager.connect();
      
      expect(connected).toBe(false);
      expect(mockErrorHandler).toHaveBeenCalled();

      // Restore original
      global.WebSocket = originalWebSocket;
    });

    it('should disconnect cleanly', async () => {
      await wsManager.connect();
      
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(wsManager.isConnected()).toBe(true);

      await wsManager.disconnect();
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('message handling', () => {
    it('should handle incoming tunnel requests', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for connection
      
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_123',
        sessionId: 'test-session',
        method: 'GET',
        url: '/api/test',
        headers: { 'accept': 'application/json' },
        timestamp: Date.now()
      };

      // Simulate incoming WebSocket message
      const mockWs = MockWebSocket.getLatestInstance();
      mockWs?.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(request)
      }));

      expect(mockMessageHandler).toHaveBeenCalledWith(request);
    });

    it('should handle incoming responses', async () => {
      const response: TunnelResponse = {
        type: 'response',
        id: 'req_123',
        sessionId: 'test-session',
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"success": true}',
        timestamp: Date.now()
      };

      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(response)
      }));

      expect(mockMessageHandler).toHaveBeenCalledWith(response);
    });

    it('should handle malformed messages gracefully', async () => {
      const mockWs = wsManager['websocket'] as MockWebSocket;
      
      // Send invalid JSON
      mockWs.dispatchEvent(new MessageEvent('message', {
        data: '{ invalid json'
      }));

      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it('should send messages through WebSocket', async () => {
      const message: TunnelResponse = {
        type: 'response',
        id: 'req_456',
        sessionId: 'test-session',
        status: 200,
        headers: {},
        body: 'Success',
        timestamp: Date.now()
      };

      wsManager.sendMessage(message);

      expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
        JSON.stringify(message)
      );
    });

    it('should queue messages when not connected', async () => {
      await wsManager.disconnect();

      const message: TunnelResponse = {
        type: 'response',
        id: 'req_789',
        sessionId: 'test-session',
        status: 404,
        headers: {},
        body: 'Not found',
        timestamp: Date.now()
      };

      // Should not throw, should queue instead
      expect(() => wsManager.sendMessage(message)).not.toThrow();

      // Reconnect and verify queued message is sent
      await wsManager.connect();
      
      // Wait for queued messages to be sent
      await new Promise(resolve => setTimeout(resolve, 10));

      const sendCalls = (MockWebSocket.prototype.send as any).mock.calls;
      const messageFound = sendCalls.some((call: any) => {
        const sentMessage = JSON.parse(call[0]);
        return sentMessage.id === 'req_789';
      });
      
      expect(messageFound).toBe(true);
    });
  });

  describe('reconnection handling', () => {
    it('should automatically reconnect on disconnect', async () => {
      await wsManager.connect();
      expect(wsManager.isConnected()).toBe(true);

      // Simulate disconnect
      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.readyState = MockWebSocket.prototype.CLOSED;
      mockWs.dispatchEvent(new Event('close'));

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(wsManager.isConnected()).toBe(true);
    });

    it('should respect max reconnect attempts', async () => {
      // Mock WebSocket to always fail
      vi.spyOn(global, 'WebSocket').mockImplementation(() => {
        const ws = new MockWebSocket('ws://localhost:8787/ws');
        setTimeout(() => {
          ws.dispatchEvent(new Event('error'));
          ws.dispatchEvent(new Event('close'));
        }, 1);
        return ws as any;
      });

      const connected = await wsManager.connect();
      expect(connected).toBe(false);

      // Should have attempted 3 times (initial + 2 retries)
      expect(mockErrorHandler).toHaveBeenCalled();
    });

    it('should stop reconnecting when manually disconnected', async () => {
      await wsManager.connect();
      
      // Manually disconnect
      await wsManager.disconnect();

      // Wait longer than reconnect interval
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should not have reconnected
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('session management', () => {
    it('should generate unique session IDs', async () => {
      await wsManager.connect();
      const sessionId1 = wsManager.getSessionId();

      await wsManager.disconnect();

      // Create new manager instance
      const wsManager2 = new WebSocketManager({
        serverUrl: 'ws://localhost:8787/ws',
        onMessage: vi.fn(),
        onError: vi.fn()
      });

      await wsManager2.connect();
      const sessionId2 = wsManager2.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
      
      await wsManager2.disconnect();
    });

    it('should persist session ID across reconnections', async () => {
      await wsManager.connect();
      const originalSessionId = wsManager.getSessionId();

      // Simulate disconnect and reconnect
      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.readyState = MockWebSocket.prototype.CLOSED;
      mockWs.dispatchEvent(new Event('close'));

      await new Promise(resolve => setTimeout(resolve, 1100));

      const newSessionId = wsManager.getSessionId();
      expect(newSessionId).toBe(originalSessionId);
    });

    it('should store session info in Chrome storage', async () => {
      await wsManager.connect();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sessionId: expect.any(String),
        tunnelUrl: expect.any(String),
        connectedAt: expect.any(Number)
      });
    });
  });

  describe('heartbeat handling', () => {
    it('should respond to heartbeat with pong', async () => {
      await wsManager.connect();

      const heartbeat = {
        type: 'heartbeat',
        sessionId: wsManager.getSessionId(),
        timestamp: Date.now()
      };

      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(heartbeat)
      }));

      // Should send pong response
      expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'pong',
          sessionId: wsManager.getSessionId(),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should send periodic heartbeats', async () => {
      const wsManagerWithHeartbeat = new WebSocketManager({
        serverUrl: 'ws://localhost:8787/ws',
        onMessage: vi.fn(),
        onError: vi.fn(),
        heartbeatInterval: 100 // 100ms for testing
      });

      await wsManagerWithHeartbeat.connect();

      // Wait for heartbeat to be sent
      await new Promise(resolve => setTimeout(resolve, 150));

      const sendCalls = (MockWebSocket.prototype.send as any).mock.calls;
      const heartbeatFound = sendCalls.some((call: any) => {
        const message = JSON.parse(call[0]);
        return message.type === 'heartbeat';
      });

      expect(heartbeatFound).toBe(true);

      await wsManagerWithHeartbeat.disconnect();
    });
  });

  describe('error handling', () => {
    it('should handle protocol errors from server', async () => {
      await wsManager.connect();

      const errorMessage = {
        type: 'error',
        code: ProtocolErrorCode.INVALID_MESSAGE,
        message: 'Invalid message format',
        timestamp: Date.now()
      };

      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(errorMessage)
      }));

      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid message format')
        })
      );
    });

    it('should handle WebSocket errors', async () => {
      await wsManager.connect();

      const mockWs = wsManager['websocket'] as MockWebSocket;
      mockWs.dispatchEvent(new Event('error'));

      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });
});