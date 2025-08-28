/**
 * Tests for RequestResponseManager - TDD approach
 * 
 * This class manages pending HTTP requests with timeout handling,
 * correlation by ID, and concurrent request support
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RequestResponseManager } from '../request-response-manager';
import { TunnelRequest, TunnelResponse, ProtocolErrorCode } from '@wingman/shared';

describe('RequestResponseManager', () => {
  let manager: RequestResponseManager;
  let mockTimeoutCallback: vi.MockedFunction<(requestId: string, error: Error) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockTimeoutCallback = vi.fn();
    manager = new RequestResponseManager({
      requestTimeoutMs: 5000,
      onTimeout: mockTimeoutCallback
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    
    // Handle any pending promises to avoid unhandled rejections
    const pendingCount = manager.getPendingRequestCount();
    const promises: Promise<any>[] = [];
    
    // Collect promises that will be rejected during cleanup
    for (let i = 0; i < pendingCount; i++) {
      // Create a promise that catches cleanup rejections
      promises.push(new Promise(resolve => setTimeout(resolve, 1)));
    }
    
    manager.cleanup();
    
    // Wait a tick for any cleanup rejections to propagate
    await new Promise(resolve => setTimeout(resolve, 1));
  });

  describe('addPendingRequest', () => {
    it('should track pending requests by ID', () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_123',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const promise = manager.addPendingRequest(request);
      
      expect(promise).toBeInstanceOf(Promise);
      expect(manager.hasPendingRequest('req_123')).toBe(true);
      expect(manager.getPendingRequestCount()).toBe(1);
      
      // Catch rejection to prevent unhandled promise rejection
      promise.catch(() => {});
    });

    it('should reject duplicate request IDs', () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_duplicate',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const promise = manager.addPendingRequest(request);
      
      expect(() => manager.addPendingRequest(request)).toThrow('Request with ID req_duplicate already pending');
      
      // Catch rejection to prevent unhandled promise rejection
      promise.catch(() => {});
    });

    it('should timeout requests after configured time', async () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_timeout',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const promise = manager.addPendingRequest(request);
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(6000);
      
      await expect(promise).rejects.toThrow('Request req_timeout timed out after 5000ms');
      expect(mockTimeoutCallback).toHaveBeenCalledWith('req_timeout', expect.any(Error));
      expect(manager.hasPendingRequest('req_timeout')).toBe(false);
    });

    it('should handle multiple simultaneous requests', () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        type: 'request' as const,
        id: `req_${i}`,
        sessionId: 'test-session',
        method: 'GET',
        url: `/test/${i}`,
        headers: {}
      }));

      const promises = requests.map(req => manager.addPendingRequest(req));
      
      expect(promises).toHaveLength(10);
      expect(manager.getPendingRequestCount()).toBe(10);
      
      requests.forEach(req => {
        expect(manager.hasPendingRequest(req.id)).toBe(true);
      });

      // Catch rejections to prevent unhandled promise rejections
      promises.forEach(p => p.catch(() => {}));
    });
  });

  describe('resolveRequest', () => {
    it('should resolve pending request with response', async () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_resolve',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const response: TunnelResponse = {
        type: 'response',
        id: 'req_resolve',
        sessionId: 'test-session',
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: 'Success'
      };

      const promise = manager.addPendingRequest(request);
      manager.resolveRequest('req_resolve', response);
      
      const result = await promise;
      expect(result).toEqual(response);
      expect(manager.hasPendingRequest('req_resolve')).toBe(false);
    });

    it('should ignore responses for unknown request IDs', () => {
      const response: TunnelResponse = {
        type: 'response',
        id: 'req_unknown',
        sessionId: 'test-session',
        status: 200,
        headers: {},
        body: 'Test'
      };

      expect(() => manager.resolveRequest('req_unknown', response)).not.toThrow();
    });
  });

  describe('rejectRequest', () => {
    it('should reject pending request with error', async () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_reject',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const promise = manager.addPendingRequest(request);
      manager.rejectRequest('req_reject', new Error('Connection failed'));
      
      await expect(promise).rejects.toThrow('Connection failed');
      expect(manager.hasPendingRequest('req_reject')).toBe(false);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel pending request', async () => {
      const request: TunnelRequest = {
        type: 'request',
        id: 'req_cancel',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const promise = manager.addPendingRequest(request);
      const cancelled = manager.cancelRequest('req_cancel');
      
      expect(cancelled).toBe(true);
      expect(manager.hasPendingRequest('req_cancel')).toBe(false);
      await expect(promise).rejects.toThrow('Request req_cancel was cancelled');
    });

    it('should return false for unknown request IDs', () => {
      const cancelled = manager.cancelRequest('req_unknown');
      expect(cancelled).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up completed requests', () => {
      const request1: TunnelRequest = {
        type: 'request',
        id: 'req_1',
        sessionId: 'test-session',
        method: 'GET',
        url: '/test1',
        headers: {}
      };

      const request2: TunnelRequest = {
        type: 'request',
        id: 'req_2', 
        sessionId: 'test-session',
        method: 'GET',
        url: '/test2',
        headers: {}
      };

      const promise1 = manager.addPendingRequest(request1);
      const promise2 = manager.addPendingRequest(request2);
      
      expect(manager.getPendingRequestCount()).toBe(2);
      
      manager.cleanup();
      
      expect(manager.getPendingRequestCount()).toBe(0);
      
      // Catch rejections to prevent unhandled promise rejections
      promise1.catch(() => {});
      promise2.catch(() => {});
    });
  });

  describe('session filtering', () => {
    it('should cancel all requests for a session', async () => {
      const requests = [
        {
          type: 'request' as const,
          id: 'req_1',
          sessionId: 'session-1',
          method: 'GET',
          url: '/test1',
          headers: {}
        },
        {
          type: 'request' as const,
          id: 'req_2',
          sessionId: 'session-1',
          method: 'GET',
          url: '/test2',
          headers: {}
        },
        {
          type: 'request' as const,
          id: 'req_3',
          sessionId: 'session-2',
          method: 'GET',
          url: '/test3',
          headers: {}
        }
      ];

      const promises = requests.map(req => manager.addPendingRequest(req));
      
      const cancelledCount = manager.cancelRequestsForSession('session-1');
      
      expect(cancelledCount).toBe(2);
      expect(manager.hasPendingRequest('req_1')).toBe(false);
      expect(manager.hasPendingRequest('req_2')).toBe(false);
      expect(manager.hasPendingRequest('req_3')).toBe(true);
      
      await expect(promises[0]).rejects.toThrow('cancelled');
      await expect(promises[1]).rejects.toThrow('cancelled');
      
      // Catch the remaining promise rejection to prevent unhandled rejection
      promises[2].catch(() => {});
    });
  });

  describe('memory management', () => {
    it('should not leak memory with many requests', async () => {
      const numRequests = 1000;
      
      // Add many requests
      for (let i = 0; i < numRequests; i++) {
        const request: TunnelRequest = {
          type: 'request',
          id: `req_${i}`,
          sessionId: 'test-session',
          method: 'GET',
          url: `/test/${i}`,
          headers: {}
        };
        
        const promise = manager.addPendingRequest(request);
        
        // Immediately resolve to clean up
        const response: TunnelResponse = {
          type: 'response',
          id: `req_${i}`,
          sessionId: 'test-session',
          status: 200,
          headers: {},
          body: 'OK'
        };
        
        manager.resolveRequest(`req_${i}`, response);
        await promise;
      }
      
      expect(manager.getPendingRequestCount()).toBe(0);
    });
  });
});