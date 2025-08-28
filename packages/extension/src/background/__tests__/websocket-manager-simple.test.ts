/**
 * Simplified tests for WebSocketManager - TDD approach
 * 
 * Focus on core functionality with simpler mocking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketManager } from '../websocket-manager';
import { TunnelMessage } from '@wingman/shared';

// Simple mock WebSocket
let mockWebSocketInstance: any = null;

class MockWebSocket {
  url: string;
  readyState = 0; // CONNECTING initially
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = this.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  });

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    mockWebSocketInstance = this;
    
    // Simulate successful connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 1);
  }

  // Helper method to simulate incoming message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper method to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

// @ts-ignore
global.chrome = mockChrome;
// @ts-ignore  
global.WebSocket = MockWebSocket;
// Add static constants to global WebSocket
(global.WebSocket as any).CONNECTING = 0;
(global.WebSocket as any).OPEN = 1;
(global.WebSocket as any).CLOSING = 2;
(global.WebSocket as any).CLOSED = 3;

describe('WebSocketManager (Simplified)', () => {
  let wsManager: WebSocketManager;
  let mockMessageHandler: vi.MockedFunction<(message: TunnelMessage) => void>;
  let mockErrorHandler: vi.MockedFunction<(error: Error) => void>;

  beforeEach(() => {
    mockMessageHandler = vi.fn();
    mockErrorHandler = vi.fn();
    mockWebSocketInstance = null;
    
    wsManager = new WebSocketManager({
      serverUrl: 'ws://localhost:8787/ws',
      onMessage: mockMessageHandler,
      onError: mockErrorHandler,
      reconnectInterval: 100,
      maxReconnectAttempts: 3
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await wsManager.disconnect();
  });

  describe('basic functionality', () => {
    it('should create WebSocketManager instance', () => {
      expect(wsManager).toBeDefined();
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should establish connection', async () => {
      const connected = await wsManager.connect();
      
      expect(connected).toBe(true);
      expect(wsManager.isConnected()).toBe(true);
      expect(mockWebSocketInstance).toBeDefined();
    });

    it('should send registration message after connecting', async () => {
      await wsManager.connect();
      
      // Wait for async registration
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebSocketInstance.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWebSocketInstance.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('register');
      expect(sentMessage.role).toBe('developer');
    });

    it('should disconnect cleanly', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(wsManager.isConnected()).toBe(true);

      await wsManager.disconnect();
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should generate unique session ID', () => {
      const sessionId = wsManager.getSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.startsWith('ext_')).toBe(true);
    });
  });

  describe('message handling', () => {
    it('should handle incoming messages', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const testMessage = {
        type: 'request',
        id: 'req_123',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      mockWebSocketInstance.simulateMessage(JSON.stringify(testMessage));

      expect(mockMessageHandler).toHaveBeenCalledWith(testMessage);
    });

    it('should handle malformed JSON gracefully', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      mockWebSocketInstance.simulateMessage('{ invalid json');

      expect(mockErrorHandler).toHaveBeenCalled();
    });

    it('should send messages when connected', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const message = {
        type: 'response',
        id: 'resp_123',
        sessionId: 'test-session',
        status: 200,
        headers: {},
        body: 'test'
      };

      wsManager.sendMessage(message);

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        JSON.stringify(message)
      );
    });

    it('should queue messages when not connected', () => {
      const message = {
        type: 'response',
        id: 'resp_456',
        sessionId: 'test-session',
        status: 404,
        headers: {},
        body: 'not found'
      };

      // Should not throw when not connected
      expect(() => wsManager.sendMessage(message)).not.toThrow();
    });
  });

  describe('heartbeat handling', () => {
    it('should respond to heartbeat with pong', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const sessionId = wsManager.getSessionId();
      const heartbeat = {
        type: 'heartbeat',
        sessionId: sessionId,
        timestamp: Date.now()
      };

      mockWebSocketInstance.simulateMessage(JSON.stringify(heartbeat));

      // Should have sent pong response
      const pongCall = mockWebSocketInstance.send.mock.calls.find((call: any) => {
        const message = JSON.parse(call[0]);
        return message.type === 'pong';
      });

      expect(pongCall).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle WebSocket errors', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      mockWebSocketInstance.simulateError();

      expect(mockErrorHandler).toHaveBeenCalled();
    });

    it('should handle server error messages', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const errorMessage = {
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Test error',
        timestamp: Date.now()
      };

      mockWebSocketInstance.simulateMessage(JSON.stringify(errorMessage));

      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should handle registration response', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const registeredMessage = {
        type: 'registered',
        sessionId: wsManager.getSessionId(),
        role: 'developer',
        tunnelUrl: 'http://test.localhost',
        timestamp: Date.now()
      };

      mockWebSocketInstance.simulateMessage(JSON.stringify(registeredMessage));

      expect(wsManager.getTunnelUrl()).toBe('http://test.localhost');
    });

    it('should store session info in Chrome storage', async () => {
      await wsManager.connect();
      await new Promise(resolve => setTimeout(resolve, 10));

      const registeredMessage = {
        type: 'registered',
        sessionId: wsManager.getSessionId(),
        role: 'developer',
        tunnelUrl: 'http://test.localhost',
        timestamp: Date.now()
      };

      mockWebSocketInstance.simulateMessage(JSON.stringify(registeredMessage));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
          tunnelUrl: 'http://test.localhost',
          connectedAt: expect.any(Number)
        })
      );
    });
  });
});