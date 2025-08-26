import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TunnelManager } from './tunnel-manager';

// Mock WebSocket
class MockWebSocket {
  readyState: number = 0;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 10);
  }
  
  send(data: string) {
    const parsed = JSON.parse(data);
    if (parsed.type === 'register') {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            type: 'registered',
            role: 'developer'
          })
        });
      }, 10);
    }
  }
  
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

// Mock fetch
const mockFetch = vi.fn();

// Mock chrome.action API
const mockChrome = {
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  }
};

describe('TunnelManager', () => {
  let tunnelManager: TunnelManager;
  
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any;
    global.fetch = mockFetch;
    global.chrome = mockChrome as any;
    tunnelManager = new TunnelManager();
    mockFetch.mockClear();
    mockChrome.action.setBadgeText.mockClear();
    mockChrome.action.setBadgeBackgroundColor.mockClear();
  });
  
  afterEach(() => {
    tunnelManager.stopTunnel();
  });
  
  describe('createTunnel', () => {
    it('should create a tunnel successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      const tunnel = await tunnelManager.createTunnel(3000);
      
      expect(tunnel).toEqual({
        sessionId: 'test-session',
        tunnelUrl: 'https://test-session.wingmanux.com',
        targetPort: 3000,
        status: 'active'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.wingmanux.com/tunnel/create',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPort: 3000, enableP2P: false })
        })
      );
    });
    
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Server error'
      });
      
      await expect(tunnelManager.createTunnel(3000)).rejects.toThrow(
        'Failed to create tunnel: Server error'
      );
      
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444'
      });
    });
    
    it('should stop existing tunnel before creating new one', async () => {
      // Create first tunnel
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'session-1',
          tunnelUrl: 'https://session-1.wingmanux.com'
        })
      });
      
      await tunnelManager.createTunnel(3000);
      const firstTunnel = tunnelManager.getCurrentTunnel();
      expect(firstTunnel?.sessionId).toBe('session-1');
      
      // Create second tunnel
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'session-2',
          tunnelUrl: 'https://session-2.wingmanux.com'
        })
      });
      
      await tunnelManager.createTunnel(3001);
      const secondTunnel = tunnelManager.getCurrentTunnel();
      expect(secondTunnel?.sessionId).toBe('session-2');
      expect(secondTunnel?.targetPort).toBe(3001);
    });
  });
  
  describe('WebSocket connection', () => {
    it('should register as developer after connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      await tunnelManager.createTunnel(3000);
      
      // Wait for WebSocket connection and registration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const tunnel = tunnelManager.getCurrentTunnel();
      expect(tunnel?.status).toBe('active');
    });
    
    it('should handle WebSocket errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      // Override WebSocket to simulate error
      const OriginalWS = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.onerror?.(new Error('Connection failed'));
          }, 5);
        }
      } as any;
      
      await expect(tunnelManager.createTunnel(3000)).rejects.toThrow();
      
      global.WebSocket = OriginalWS;
    });
  });
  
  describe('reconnection logic', () => {
    it('should attempt reconnection on disconnect', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      let wsInstance: MockWebSocket | null = null;
      
      // Track WebSocket instances
      const OriginalWS = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          wsInstance = this;
        }
      } as any;
      
      await tunnelManager.createTunnel(3000);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Simulate disconnect
      wsInstance?.onclose?.();
      
      // Should schedule reconnection
      expect(tunnelManager['reconnectAttempts']).toBeGreaterThan(0);
      
      global.WebSocket = OriginalWS;
    });
    
    it('should stop reconnecting after max attempts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      await tunnelManager.createTunnel(3000);
      
      // Force max reconnection attempts
      tunnelManager['reconnectAttempts'] = 5;
      tunnelManager['scheduleReconnect']();
      
      const tunnel = tunnelManager.getCurrentTunnel();
      expect(tunnel?.status).toBe('error');
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444'
      });
    });
  });
  
  describe('status updates', () => {
    it('should update badge for different states', async () => {
      // Connecting state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      const promise = tunnelManager.createTunnel(3000);
      
      // Should show connecting state
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#F59E0B'
      });
      
      await promise;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should show active state
      expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '●' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenLastCalledWith({
        color: '#10B981'
      });
    });
  });
  
  describe('stopTunnel', () => {
    it('should clean up resources properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com'
        })
      });
      
      await tunnelManager.createTunnel(3000);
      expect(tunnelManager.getCurrentTunnel()).toBeTruthy();
      
      tunnelManager.stopTunnel();
      
      expect(tunnelManager.getCurrentTunnel()).toBeNull();
      expect(tunnelManager['ws']).toBeNull();
      expect(tunnelManager['reconnectAttempts']).toBe(0);
      
      // Should show inactive state
      expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenLastCalledWith({
        color: '#8B5CF6'
      });
    });
  });
  
  describe('edge cases', () => {
    it('should handle invalid port numbers', async () => {
      await expect(tunnelManager.createTunnel(0)).rejects.toThrow();
      await expect(tunnelManager.createTunnel(70000)).rejects.toThrow();
      await expect(tunnelManager.createTunnel(-1)).rejects.toThrow();
    });
    
    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: false,
          text: async () => 'Timeout'
        }), 100))
      );
      
      await expect(tunnelManager.createTunnel(3000)).rejects.toThrow();
    });
  });
});