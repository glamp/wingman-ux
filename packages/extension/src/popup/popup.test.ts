import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock chrome.runtime API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

describe('Popup Tunnel Communication', () => {
  beforeEach(() => {
    global.chrome = mockChrome as any;
    mockChrome.runtime.sendMessage.mockClear();
    mockChrome.storage.local.get.mockClear();
    mockChrome.storage.local.set.mockClear();
  });

  describe('Tunnel Operations', () => {
    it('should send TUNNEL_CREATE message with port', async () => {
      // Simulate startTunnel function
      const startTunnel = async (targetPort: number) => {
        return chrome.runtime.sendMessage({
          type: 'TUNNEL_CREATE',
          targetPort
        });
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        tunnel: {
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com',
          targetPort: 3000,
          status: 'active'
        }
      });

      const result = await startTunnel(3000);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TUNNEL_CREATE',
        targetPort: 3000
      });

      expect(result.success).toBe(true);
      expect(result.tunnel.sessionId).toBe('test-session');
    });

    it('should handle TUNNEL_CREATE errors', async () => {
      const startTunnel = async (targetPort: number) => {
        return chrome.runtime.sendMessage({
          type: 'TUNNEL_CREATE',
          targetPort
        });
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Failed to create tunnel'
      });

      const result = await startTunnel(3000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create tunnel');
    });

    it('should send TUNNEL_STATUS message', async () => {
      const getTunnelStatus = async () => {
        return chrome.runtime.sendMessage({
          type: 'TUNNEL_STATUS'
        });
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        tunnel: {
          sessionId: 'test-session',
          tunnelUrl: 'https://test-session.wingmanux.com',
          targetPort: 3000,
          status: 'active'
        }
      });

      const result = await getTunnelStatus();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TUNNEL_STATUS'
      });

      expect(result.tunnel).toBeDefined();
      expect(result.tunnel.status).toBe('active');
    });

    it('should send TUNNEL_STOP message', async () => {
      const stopTunnel = async () => {
        return chrome.runtime.sendMessage({
          type: 'TUNNEL_STOP'
        });
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true
      });

      const result = await stopTunnel();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TUNNEL_STOP'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Port Detection', () => {
    it('should detect port from localhost URL', () => {
      const getPortFromUrl = (url: string): number => {
        const match = url.match(/:(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
        // Default ports
        if (url.startsWith('https://')) return 443;
        if (url.startsWith('http://')) return 80;
        return 3000; // Default fallback
      };

      expect(getPortFromUrl('http://localhost:3000')).toBe(3000);
      expect(getPortFromUrl('http://localhost:8080/path')).toBe(8080);
      expect(getPortFromUrl('https://localhost:4200')).toBe(4200);
      expect(getPortFromUrl('http://localhost')).toBe(80);
      expect(getPortFromUrl('https://localhost')).toBe(443);
    });

    it('should validate port numbers', () => {
      const isValidPort = (port: number): boolean => {
        return port > 0 && port <= 65535;
      };

      expect(isValidPort(3000)).toBe(true);
      expect(isValidPort(80)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort(70000)).toBe(false);
    });
  });

  describe('UI State Management', () => {
    it('should update UI based on tunnel state', () => {
      const updateTunnelUI = (state: 'inactive' | 'connecting' | 'active' | 'error') => {
        const statusElement = document.createElement('span');
        const actionButton = document.createElement('button');
        
        switch (state) {
          case 'inactive':
            statusElement.textContent = 'Inactive';
            statusElement.style.color = '#ef4444';
            actionButton.textContent = 'Start Live Sharing';
            actionButton.disabled = false;
            break;
          case 'connecting':
            statusElement.textContent = 'Connecting...';
            statusElement.style.color = '#f59e0b';
            actionButton.textContent = 'Connecting...';
            actionButton.disabled = true;
            break;
          case 'active':
            statusElement.textContent = 'Active';
            statusElement.style.color = '#10b981';
            actionButton.textContent = 'Stop Sharing';
            actionButton.disabled = false;
            break;
          case 'error':
            statusElement.textContent = 'Error';
            statusElement.style.color = '#ef4444';
            actionButton.textContent = 'Retry';
            actionButton.disabled = false;
            break;
        }
        
        return { statusElement, actionButton };
      };

      const inactiveUI = updateTunnelUI('inactive');
      expect(inactiveUI.statusElement.textContent).toBe('Inactive');
      expect(inactiveUI.actionButton.textContent).toBe('Start Live Sharing');
      expect(inactiveUI.actionButton.disabled).toBe(false);

      const activeUI = updateTunnelUI('active');
      expect(activeUI.statusElement.textContent).toBe('Active');
      expect(activeUI.actionButton.textContent).toBe('Stop Sharing');
      expect(activeUI.actionButton.disabled).toBe(false);

      const connectingUI = updateTunnelUI('connecting');
      expect(connectingUI.statusElement.textContent).toBe('Connecting...');
      expect(connectingUI.actionButton.textContent).toBe('Connecting...');
      expect(connectingUI.actionButton.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', { timeout: 10000 }, async () => {
      const startTunnelWithRetry = async (targetPort: number, maxRetries = 3): Promise<any> => {
        let retries = 0;
        
        while (retries < maxRetries) {
          try {
            const result = await chrome.runtime.sendMessage({
              type: 'TUNNEL_CREATE',
              targetPort
            });
            
            if (result.success) {
              return result;
            }
            
            throw new Error(result.error);
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw error;
            }
            // Wait before retry with exponential backoff (reduced for testing)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 10));
          }
        }
      };

      // Mock failure then success
      mockChrome.runtime.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          tunnel: { sessionId: 'test-session' }
        });

      const result = await startTunnelWithRetry(3000);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should display user-friendly error messages', () => {
      const getErrorMessage = (error: string): string => {
        const errorMap: Record<string, string> = {
          'Network error': 'Unable to connect to the tunnel server. Please check your internet connection.',
          'Invalid port': 'The port number is invalid. Please enter a number between 1 and 65535.',
          'Port in use': 'This port is already being shared. Please stop the existing tunnel first.',
          'Timeout': 'The connection timed out. Please try again.',
          'Developer not connected': 'Failed to establish developer connection. Please restart the extension.'
        };
        
        for (const [key, message] of Object.entries(errorMap)) {
          if (error.includes(key)) {
            return message;
          }
        }
        
        return 'An unexpected error occurred. Please try again.';
      };

      expect(getErrorMessage('Network error')).toContain('internet connection');
      expect(getErrorMessage('Invalid port: 0')).toContain('between 1 and 65535');
      expect(getErrorMessage('Unknown error')).toContain('unexpected error');
    });
  });
});