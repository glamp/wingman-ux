import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TunnelClient } from '../tunnel-client';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { EventEmitter } from 'events';

// Create a mock WebSocket class
class MockWebSocket extends EventEmitter {
  url: string;
  readyState: number;
  send = vi.fn();
  close = vi.fn();
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    super();
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Auto-open after construction
    process.nextTick(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.emit('open');
      }
    });
  }

  // Override EventEmitter methods to match WebSocket interface
  on(event: string, listener: Function): this {
    super.on(event, listener as any);
    return this;
  }

  removeAllListeners(): this {
    super.removeAllListeners();
    return this;
  }
}

// Store created instances for test access
let mockInstances: MockWebSocket[] = [];

// Mock the ws module
vi.mock('ws', () => ({
  WebSocket: vi.fn((url: string) => {
    const instance = new MockWebSocket(url);
    mockInstances.push(instance);
    return instance;
  })
}));

describe('TunnelClient', () => {
  let client: TunnelClient | undefined;
  let mockLocalServer: Server;
  let localPort: number;

  beforeEach(async () => {
    // Reset mock instances
    mockInstances = [];
    client = undefined;
    
    // Create a mock local server to proxy to
    mockLocalServer = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Local server response',
        path: req.url,
        method: req.method,
        headers: req.headers
      }));
    });
    
    await new Promise<void>((resolve) => {
      mockLocalServer.listen(0, () => {
        localPort = (mockLocalServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    if (mockLocalServer) {
      await new Promise<void>((resolve) => {
        mockLocalServer.close(() => resolve());
      });
    }
    
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should establish WebSocket connection to tunnel server', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      expect(mockInstances).toHaveLength(1);
      expect(mockInstances[0]?.url).toBe(tunnelUrl);
      expect(client.isConnected()).toBe(true);
    });

    it('should send registration message on connect', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      expect(mockWs?.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'register',
          sessionId,
          role: 'developer'
        })
      );
    });

    it('should reject connection on error', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://invalid-url-that-will-fail';
      
      // Create a client
      client = new TunnelClient(sessionId, localPort);
      
      // Import the mocked WebSocket
      const { WebSocket: WebSocketMock } = await import('ws');
      const originalImpl = (WebSocketMock as any).getMockImplementation();
      
      // Create a custom mock that throws immediately
      (WebSocketMock as any).mockImplementationOnce((url: string) => {
        throw new Error('Connection failed');
      });
      
      // Now attempt to connect and expect it to fail
      await expect(client.connect(tunnelUrl)).rejects.toThrow('Connection failed');
      
      // Restore the original implementation
      (WebSocketMock as any).mockImplementation(originalImpl);
    });

    it('should handle reconnection attempts', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort, {
        reconnect: true,
        reconnectDelay: 50,
        maxReconnectAttempts: 3
      });
      
      await client.connect(tunnelUrl);
      expect(mockInstances).toHaveLength(1);
      
      // Simulate disconnect
      const firstWs = mockInstances[0];
      firstWs!.readyState = MockWebSocket.CLOSED;
      firstWs!.emit('close');
      
      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have created a new WebSocket
      expect(mockInstances.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('handleRequest', () => {
    it('should forward HTTP request to local server', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Simulate incoming request from tunnel server
      const request = {
        type: 'request',
        requestId: '123',
        request: {
          method: 'GET',
          path: '/api/test',
          headers: { 'content-type': 'application/json' },
          body: null
        }
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(request)));
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should send response back to tunnel server
      expect(mockWs!.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"response"')
      );
      expect(mockWs!.send).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"')
      );
      
      // Check response contains data from local server
      const sentCall = mockWs!.send.mock.calls.find((call: any) => 
        call[0].includes('"requestId":"123"')
      );
      expect(sentCall).toBeDefined();
      const response = JSON.parse(sentCall[0]);
      expect(response.response.status).toBe(200);
    });

    it('should handle POST requests with body', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      const request = {
        type: 'request',
        requestId: '124',
        request: {
          method: 'POST',
          path: '/api/users',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Test User' })
        }
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(request)));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const sentCall = mockWs!.send.mock.calls.find((call: any) => 
        call[0].includes('"requestId":"124"')
      );
      expect(sentCall).toBeDefined();
      const response = JSON.parse(sentCall[0]);
      expect(response.type).toBe('response');
      expect(response.response.status).toBe(200);
    });

    it('should handle request timeouts', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      // Create client with short timeout
      client = new TunnelClient(sessionId, localPort, {
        requestTimeout: 100
      });
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Stop the local server to cause timeout
      await new Promise<void>((resolve) => {
        mockLocalServer.close(() => resolve());
      });
      
      const request = {
        type: 'request',
        requestId: '125',
        request: {
          method: 'GET',
          path: '/api/test',
          headers: {},
          body: null
        }
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(request)));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should send error response
      const sentCall = mockWs!.send.mock.calls.find((call: any) => 
        call[0].includes('"requestId":"125"')
      );
      expect(sentCall).toBeDefined();
      const response = JSON.parse(sentCall[0]);
      expect(response.response.error).toBeDefined();
    });

    it('should forward headers correctly', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      const request = {
        type: 'request',
        requestId: '126',
        request: {
          method: 'GET',
          path: '/api/test',
          headers: {
            'authorization': 'Bearer token123',
            'x-custom-header': 'custom-value',
            'cookie': 'session=abc123'
          },
          body: null
        }
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(request)));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const sentCall = mockWs!.send.mock.calls.find((call: any) => 
        call[0].includes('"requestId":"126"')
      );
      expect(sentCall).toBeDefined();
      const response = JSON.parse(sentCall[0]);
      expect(response.response.status).toBe(200);
      
      // Verify the local server received the headers
      const responseBody = JSON.parse(response.response.body);
      expect(responseBody.headers).toMatchObject({
        'authorization': 'Bearer token123',
        'x-custom-header': 'custom-value',
        'cookie': 'session=abc123'
      });
    });
  });

  describe('handleWebSocket', () => {
    it('should mark WebSocket connections as established', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Simulate WebSocket connection request
      const wsConnect = {
        type: 'websocket-connect',
        sessionId: 'ws-client-123'
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(wsConnect)));
      
      // Should acknowledge WebSocket connection
      expect(client.hasWebSocketConnection('ws-client-123')).toBe(true);
    });

    it('should handle WebSocket disconnection', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Establish connection
      const wsConnect = {
        type: 'websocket-connect',
        sessionId: 'ws-client-123'
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(wsConnect)));
      expect(client.hasWebSocketConnection('ws-client-123')).toBe(true);
      
      // Disconnect
      const wsClose = {
        type: 'websocket-close',
        sessionId: 'ws-client-123'
      };
      
      mockWs!.emit('message', Buffer.from(JSON.stringify(wsClose)));
      expect(client.hasWebSocketConnection('ws-client-123')).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      await client.disconnect();
      
      expect(mockWs?.close).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });

    it('should stop reconnection attempts on disconnect', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort, {
        reconnect: true,
        reconnectDelay: 50
      });
      
      await client.connect(tunnelUrl);
      
      // Trigger close to start reconnection
      const mockWs = mockInstances[0];
      mockWs!.readyState = MockWebSocket.CLOSED;
      mockWs!.emit('close');
      
      // Immediately disconnect
      await client.disconnect();
      
      // Wait to ensure no reconnection happens
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should only have one WebSocket created
      expect(mockInstances).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should emit error events', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Trigger an error
      mockWs!.emit('error', new Error('Test error'));
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle malformed messages gracefully', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      
      // Send malformed JSON
      mockWs!.emit('message', Buffer.from('not valid json{'));
      
      expect(errorHandler).toHaveBeenCalled();
      expect(client.isConnected()).toBe(true); // Should stay connected
    });

    it('should handle unknown message types', async () => {
      const sessionId = 'test-session';
      const tunnelUrl = 'ws://localhost:9876';
      
      client = new TunnelClient(sessionId, localPort);
      await client.connect(tunnelUrl);
      
      const mockWs = mockInstances[0];
      
      // Send unknown message type
      mockWs!.emit('message', Buffer.from(JSON.stringify({
        type: 'unknown-type',
        data: 'test'
      })));
      
      // Should not crash
      expect(client.isConnected()).toBe(true);
    });
  });
});