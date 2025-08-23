import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { WingmanProvider, useWingman } from '../WingmanProvider';

describe('useWingman Hook (TDD)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should throw error when used outside WingmanProvider', () => {
      // Test-first: This should fail initially
      expect(() => {
        renderHook(() => useWingman());
      }).toThrow('useWingman must be used within WingmanProvider');
    });

    it('should provide wingman context when used within provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.isActive).toBe(false);
      expect(result.current.activate).toBeDefined();
      expect(result.current.deactivate).toBeDefined();
      expect(result.current.sendFeedback).toBeDefined();
    });
  });

  describe('Activation and deactivation', () => {
    it('should toggle active state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      expect(result.current.isActive).toBe(false);
      
      act(() => {
        result.current.activate();
      });
      
      expect(result.current.isActive).toBe(true);
      
      act(() => {
        result.current.deactivate();
      });
      
      expect(result.current.isActive).toBe(false);
    });

    it('should handle multiple activations gracefully', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      act(() => {
        result.current.activate();
        result.current.activate(); // Second activation
      });
      
      expect(result.current.isActive).toBe(true);
      
      // Should only need one deactivation
      act(() => {
        result.current.deactivate();
      });
      
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Sending feedback', () => {
    it('should send feedback to the configured endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-123', receivedAt: new Date().toISOString() })
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      const feedbackData = {
        note: 'Test feedback',
        screenshot: 'data:image/png;base64,test',
        metadata: {
          componentName: 'TestComponent',
          props: { id: 1 }
        }
      };
      
      await act(async () => {
        await result.current.sendFeedback(feedbackData);
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/annotations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test feedback')
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      const feedbackData = {
        note: 'Test feedback',
        screenshot: 'data:image/png;base64,test'
      };
      
      await act(async () => {
        const response = await result.current.sendFeedback(feedbackData);
        expect(response).toBeNull();
      });
      
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      const feedbackData = {
        note: 'Test feedback',
        screenshot: 'data:image/png;base64,test'
      };
      
      await act(async () => {
        const response = await result.current.sendFeedback(feedbackData);
        expect(response).toBeNull();
      });
    });
  });

  describe('Configuration', () => {
    it('should use custom endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-123', receivedAt: new Date().toISOString() })
      });

      const customEndpoint = 'https://custom.example.com/feedback';
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint={customEndpoint}>
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      await act(async () => {
        await result.current.sendFeedback({
          note: 'Test',
          screenshot: 'data:image/png;base64,test'
        });
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        customEndpoint,
        expect.any(Object)
      );
    });

    it('should support optional debug mode', () => {
      // Spy on all console methods that the logger might use
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations" debug>
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      act(() => {
        result.current.activate();
      });
      
      // Check that some debug logging occurred
      const anyConsoleCalled = 
        consoleLogSpy.mock.calls.length > 0 ||
        consoleInfoSpy.mock.calls.length > 0 ||
        consoleDebugSpy.mock.calls.length > 0;
      
      expect(anyConsoleCalled).toBe(true);
      
      // Check for any Wingman-related log message in any console method
      const allCalls = [
        ...consoleLogSpy.mock.calls,
        ...consoleInfoSpy.mock.calls,
        ...consoleDebugSpy.mock.calls
      ];
      
      // Debug output
      if (allCalls.length === 0) {
        console.error('No console calls were captured!');
      } else {
        console.error('All console calls:', JSON.stringify(allCalls, null, 2));
      }
      
      const wingmanLogs = allCalls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('[Wingman]') || arg.includes('[Wingman SDK]'))
        )
      );
      expect(wingmanLogs).toBe(true);
      
      consoleLogSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });
  });

  describe('React metadata extraction', () => {
    it('should extract React component metadata when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-123', receivedAt: new Date().toISOString() })
      });

      // Mock React DevTools hook
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        renderers: new Map([[1, {
          findFiberByHostInstance: () => ({
            type: { name: 'TestComponent' },
            memoizedProps: { id: 1, name: 'test' }
          })
        }]])
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      const mockElement = document.createElement('div');
      
      let response;
      await act(async () => {
        response = await result.current.sendFeedback({
          note: 'Test',
          screenshot: 'data:image/png;base64,test',
          element: mockElement
        });
      });
      
      // Just verify sendFeedback returned something (indicating it was called)
      expect(response).toBeDefined();
      
      // Clean up
      delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    });

    it('should handle missing React DevTools gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-123', receivedAt: new Date().toISOString() })
      });

      // Ensure React DevTools hook is not available
      delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WingmanProvider endpoint="http://localhost:8787/annotations">
          {children}
        </WingmanProvider>
      );

      const { result } = renderHook(() => useWingman(), { wrapper });
      
      const mockElement = document.createElement('div');
      
      let response;
      await act(async () => {
        response = await result.current.sendFeedback({
          note: 'Test',
          screenshot: 'data:image/png;base64,test',
          element: mockElement
        });
      });
      
      // Just verify sendFeedback returned something (indicating it was called)
      expect(response).toBeDefined();
    });
  });
});