/**
 * RequestResponseManager - Manages pending HTTP requests with timeout handling
 * 
 * This class manages pending HTTP requests with timeout handling,
 * correlation by ID, and concurrent request support for the tunnel protocol
 */

import { TunnelRequest, TunnelResponse } from '@wingman/shared';
import { createLogger } from '@wingman/shared';

const logger = createLogger('RequestResponseManager');

export interface RequestResponseManagerConfig {
  requestTimeoutMs: number;
  onTimeout: (requestId: string, error: Error) => void;
}

interface PendingRequest {
  request: TunnelRequest;
  promise: Promise<TunnelResponse>;
  resolve: (response: TunnelResponse) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

export class RequestResponseManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private config: RequestResponseManagerConfig;

  constructor(config: RequestResponseManagerConfig) {
    this.config = config;
  }

  /**
   * Add a pending request and return a promise that resolves when response is received
   */
  addPendingRequest(request: TunnelRequest): Promise<TunnelResponse> {
    // Check for duplicate request IDs
    if (this.pendingRequests.has(request.id)) {
      throw new Error(`Request with ID ${request.id} already pending`);
    }

    let resolve: (response: TunnelResponse) => void;
    let reject: (error: Error) => void;

    // Create promise that will be resolved/rejected externally
    const promise = new Promise<TunnelResponse>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      const error = new Error(`Request ${request.id} timed out after ${this.config.requestTimeoutMs}ms`);
      this.pendingRequests.delete(request.id);
      reject(error);
      this.config.onTimeout(request.id, error);
    }, this.config.requestTimeoutMs);

    // Store pending request
    const pendingRequest: PendingRequest = {
      request,
      promise,
      resolve: resolve!,
      reject: reject!,
      timeoutId
    };

    this.pendingRequests.set(request.id, pendingRequest);
    
    return promise;
  }

  /**
   * Resolve a pending request with a response
   */
  resolveRequest(requestId: string, response: TunnelResponse): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      // Silently ignore responses for unknown request IDs
      logger.debug(`Received response for unknown request ID: ${requestId}`);
      return;
    }

    // Clear timeout and remove from pending
    clearTimeout(pendingRequest.timeoutId);
    this.pendingRequests.delete(requestId);
    
    // Resolve the promise
    pendingRequest.resolve(response);
  }

  /**
   * Reject a pending request with an error
   */
  rejectRequest(requestId: string, error: Error): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      logger.debug(`Attempted to reject unknown request ID: ${requestId}`);
      return;
    }

    // Clear timeout and remove from pending
    clearTimeout(pendingRequest.timeoutId);
    this.pendingRequests.delete(requestId);
    
    // Reject the promise
    pendingRequest.reject(error);
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestId: string): boolean {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      return false;
    }

    // Clear timeout and remove from pending
    clearTimeout(pendingRequest.timeoutId);
    this.pendingRequests.delete(requestId);
    
    // Reject with cancellation error
    const error = new Error(`Request ${requestId} was cancelled`);
    pendingRequest.reject(error);
    
    return true;
  }

  /**
   * Cancel all requests for a specific session
   */
  cancelRequestsForSession(sessionId: string): number {
    let cancelledCount = 0;
    
    for (const [requestId, pendingRequest] of this.pendingRequests) {
      if (pendingRequest.request.sessionId === sessionId) {
        this.cancelRequest(requestId);
        cancelledCount++;
      }
    }
    
    return cancelledCount;
  }

  /**
   * Check if a request is pending
   */
  hasPendingRequest(requestId: string): boolean {
    return this.pendingRequests.has(requestId);
  }

  /**
   * Get count of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clean up all pending requests (reject them)
   */
  cleanup(): void {
    for (const [requestId, pendingRequest] of this.pendingRequests) {
      clearTimeout(pendingRequest.timeoutId);
      const error = new Error(`Request ${requestId} cancelled during cleanup`);
      pendingRequest.reject(error);
    }
    
    this.pendingRequests.clear();
  }
}