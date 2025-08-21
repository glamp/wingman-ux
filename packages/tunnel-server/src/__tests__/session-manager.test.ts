import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../session-manager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a new session with valid parameters', () => {
      const developerId = 'dev123';
      const targetPort = 3000;

      const sessionId = sessionManager.createSession(developerId, targetPort);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^[a-z]+-[a-z]+$/); // callsign-phonetic
    });

    it('should create sessions with unique IDs', () => {
      const sessionId1 = sessionManager.createSession('dev1', 3000);
      const sessionId2 = sessionManager.createSession('dev2', 4000);

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should create session with correct initial status', () => {
      const sessionId = sessionManager.createSession('dev123', 3000);
      const session = sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.status).toBe('pending');
      expect(session!.developerId).toBe('dev123');
      expect(session!.targetPort).toBe(3000);
    });
  });

  describe('getSession', () => {
    it('should return session for valid ID', () => {
      const sessionId = sessionManager.createSession('dev123', 3000);
      const session = sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.id).toBe(sessionId);
      expect(session!.developerId).toBe('dev123');
      expect(session!.targetPort).toBe(3000);
    });

    it('should return null for non-existent session', () => {
      const session = sessionManager.getSession('nonexistent');
      expect(session).toBeNull();
    });

    it('should mark expired sessions as expired', () => {
      // Create a session in the past by modifying the session directly
      const sessionId = sessionManager.createSession('dev123', 3000);
      const session = sessionManager.getSession(sessionId);
      
      // Manually set expiry date to the past
      if (session) {
        session.expiresAt = new Date('2024-01-01T00:00:00Z');
      }

      // Now check if it's marked as expired
      const expiredSession = sessionManager.getSession(sessionId);
      expect(expiredSession!.status).toBe('expired');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', () => {
      const sessionId = sessionManager.createSession('dev123', 3000);
      
      sessionManager.updateSessionStatus(sessionId, 'active');
      const session = sessionManager.getSession(sessionId);

      expect(session!.status).toBe('active');
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => {
        sessionManager.updateSessionStatus('nonexistent', 'active');
      }).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', () => {
      // Create a session and manually expire it
      const sessionId = sessionManager.createSession('dev123', 3000);
      const session = sessionManager.getSession(sessionId);
      
      // Manually set expiry date to the past
      if (session) {
        session.expiresAt = new Date('2024-01-01T00:00:00Z');
      }

      // Session should exist before cleanup
      expect(sessionManager.getSession(sessionId)).toBeDefined();

      // Run cleanup
      sessionManager.cleanupExpiredSessions();

      // Session should be removed after cleanup
      expect(sessionManager.getSession(sessionId)).toBeNull();
    });

    it('should not remove active sessions', () => {
      const sessionId = sessionManager.createSession('dev123', 3000);
      
      sessionManager.cleanupExpiredSessions();
      
      expect(sessionManager.getSession(sessionId)).toBeDefined();
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', () => {
      const sessionId1 = sessionManager.createSession('dev1', 3000);
      const sessionId2 = sessionManager.createSession('dev2', 4000);
      
      sessionManager.updateSessionStatus(sessionId1, 'active');
      // sessionId2 remains 'pending'

      const activeSessions = sessionManager.getActiveSessions();
      
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]!.id).toBe(sessionId1);
      expect(activeSessions[0]!.status).toBe('active');
    });

    it('should return empty array when no active sessions', () => {
      const activeSessions = sessionManager.getActiveSessions();
      expect(activeSessions).toHaveLength(0);
    });
  });
});