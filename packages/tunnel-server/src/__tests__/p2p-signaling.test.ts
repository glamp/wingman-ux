import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager, type P2PSignalingMessage } from '../connection-manager.js';
import { SessionManager } from '../session-manager.js';

// Mock WebSocket
class MockWebSocket {
  readyState: number;
  sentMessages: any[] = [];
  listeners: Map<string, Function[]> = new Map();
  
  constructor() {
    this.readyState = 1; // OPEN
  }
  
  send(data: string) {
    this.sentMessages.push(JSON.parse(data));
  }
  
  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }
  
  removeAllListeners() {
    this.listeners.clear();
  }
  
  close() {
    this.readyState = 3; // CLOSED
  }
  
  emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }
}

describe('P2P Signaling', () => {
  let connectionManager: ConnectionManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    sessionManager = new SessionManager();
  });

  describe('ConnectionManager P2P Methods', () => {
    it('should register PM connection', () => {
      const ws = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerPM(sessionId, ws);
      
      // PM should be registered
      expect(connectionManager['pmConnections'].has(sessionId)).toBe(true);
    });

    it('should register developer connection', () => {
      const ws = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, ws);
      
      expect(connectionManager.isConnected(sessionId)).toBe(true);
    });

    it('should check P2P availability', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      // Register both connections
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      expect(connectionManager.isP2PAvailable(sessionId)).toBe(true);
    });

    it('should relay P2P signaling from developer to PM', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      // Register both connections
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      // Send signaling message
      const message: P2PSignalingMessage = {
        type: 'p2p:offer',
        sessionId: sessionId,
        from: 'developer',
        data: { sdp: 'test-sdp', type: 'offer' }
      };
      
      connectionManager.handleP2PSignaling(message);
      
      // PM should receive the message
      expect(pmWs.sentMessages).toHaveLength(1);
      expect(pmWs.sentMessages[0]).toEqual(message);
    });

    it('should relay P2P signaling from PM to developer', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      // Register both connections
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      // Send signaling message
      const message: P2PSignalingMessage = {
        type: 'p2p:answer',
        sessionId: sessionId,
        from: 'pm',
        data: { sdp: 'test-answer-sdp', type: 'answer' }
      };
      
      connectionManager.handleP2PSignaling(message);
      
      // Developer should receive the message
      expect(devWs.sentMessages).toHaveLength(1);
      expect(devWs.sentMessages[0]).toEqual(message);
    });

    it('should not relay if recipient not connected', () => {
      const devWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      // Only register developer
      connectionManager.registerDeveloper(sessionId, devWs);
      
      // Try to send to PM (not connected)
      const message: P2PSignalingMessage = {
        type: 'p2p:offer',
        sessionId: sessionId,
        from: 'developer',
        data: { sdp: 'test-sdp', type: 'offer' }
      };
      
      // Should not throw
      expect(() => connectionManager.handleP2PSignaling(message)).not.toThrow();
    });

    it('should initiate P2P when both parties connected', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      // Register both connections
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      // Initiate P2P
      connectionManager.initiateP2P(sessionId);
      
      // Both should receive initiation messages
      expect(devWs.sentMessages).toHaveLength(1);
      expect(devWs.sentMessages[0].type).toBe('p2p:initiate');
      expect(devWs.sentMessages[0].role).toBe('developer');
      
      expect(pmWs.sentMessages).toHaveLength(1);
      expect(pmWs.sentMessages[0].type).toBe('p2p:initiate');
      expect(pmWs.sentMessages[0].role).toBe('pm');
    });

    it('should handle ICE candidate relay', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      const iceCandidate = {
        candidate: 'candidate:123',
        sdpMLineIndex: 0,
        sdpMid: 'video'
      };
      
      const message: P2PSignalingMessage = {
        type: 'p2p:ice-candidate',
        sessionId: sessionId,
        from: 'developer',
        data: iceCandidate
      };
      
      connectionManager.handleP2PSignaling(message);
      
      expect(pmWs.sentMessages).toHaveLength(1);
      expect(pmWs.sentMessages[0].data).toEqual(iceCandidate);
    });

    it('should clean up PM connection on unregister', () => {
      const ws = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerPM(sessionId, ws);
      expect(connectionManager['pmConnections'].has(sessionId)).toBe(true);
      
      connectionManager.unregisterPM(sessionId);
      expect(connectionManager['pmConnections'].has(sessionId)).toBe(false);
    });

    it('should handle P2P ready/failed status', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      // Send ready status
      const readyMessage: P2PSignalingMessage = {
        type: 'p2p:ready',
        sessionId: sessionId,
        from: 'developer',
        data: undefined
      };
      
      connectionManager.handleP2PSignaling(readyMessage);
      expect(pmWs.sentMessages).toHaveLength(1);
      expect(pmWs.sentMessages[0].type).toBe('p2p:ready');
      
      // Send failed status
      const failedMessage: P2PSignalingMessage = {
        type: 'p2p:failed',
        sessionId: sessionId,
        from: 'pm',
        data: { reason: 'Connection timeout' }
      };
      
      connectionManager.handleP2PSignaling(failedMessage);
      expect(devWs.sentMessages).toHaveLength(1);
      expect(devWs.sentMessages[0].type).toBe('p2p:failed');
    });
  });

  describe('SessionManager Integration', () => {
    it('should create session with correct format', () => {
      const sessionId = sessionManager.createSession('test-dev', 3000);
      
      // Session ID should be defined and match pattern
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^[a-z]+-[a-z]+$/);
      
      // Get the actual session object
      const session = sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.developerId).toBe('test-dev');
      expect(session!.targetPort).toBe(3000);
      expect(session!.status).toBe('pending');
    });

    it('should support P2P with valid session', () => {
      const sessionId = sessionManager.createSession('test-dev', 3000);
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      
      // Session should be created with ID
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      
      // Simulate registration with valid session
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      expect(connectionManager.isP2PAvailable(sessionId)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket in closed state', () => {
      const devWs = new MockWebSocket() as any;
      const pmWs = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerDeveloper(sessionId, devWs);
      connectionManager.registerPM(sessionId, pmWs);
      
      // Close PM WebSocket
      pmWs.readyState = 3; // CLOSED
      
      // P2P should not be available
      expect(connectionManager.isP2PAvailable(sessionId)).toBe(false);
    });

    it('should handle missing session gracefully', () => {
      const message: P2PSignalingMessage = {
        type: 'p2p:offer',
        sessionId: 'non-existent',
        from: 'developer',
        data: {}
      };
      
      // Should not throw
      expect(() => connectionManager.handleP2PSignaling(message)).not.toThrow();
    });

    it('should replace existing connections', () => {
      const ws1 = new MockWebSocket() as any;
      const ws2 = new MockWebSocket() as any;
      const sessionId = 'test-session';
      
      connectionManager.registerPM(sessionId, ws1);
      connectionManager.registerPM(sessionId, ws2);
      
      // Should close first connection and use second
      expect(ws1.readyState).toBe(3); // CLOSED
      expect(connectionManager['pmConnections'].get(sessionId)).toBe(ws2);
    });
  });
});