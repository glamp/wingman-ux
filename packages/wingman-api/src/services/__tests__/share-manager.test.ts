import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShareManager } from '../share-manager';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';

vi.mock('@wingman/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

describe('ShareManager', () => {
  let shareManager: ShareManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(tmpdir(), `share-manager-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    shareManager = new ShareManager(tempDir);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createShareToken', () => {
    it('should create a share token with unique 32-character hex token', () => {
      const sessionId = 'test-session-123';
      const share = shareManager.createShareToken(sessionId);

      expect(share).toBeDefined();
      expect(share.token).toMatch(/^[a-f0-9]{32}$/);
      expect(share.sessionId).toBe(sessionId);
      expect(share.createdAt).toBeInstanceOf(Date);
      expect(share.lastAccessed).toBeInstanceOf(Date);
      expect(share.accessCount).toBe(0);
    });

    it('should create share token with metadata', () => {
      const sessionId = 'test-session-456';
      const metadata = {
        label: 'Test Share',
        expiresAt: new Date(Date.now() + 3600000),
        maxAccesses: 10
      };
      
      const share = shareManager.createShareToken(sessionId, metadata);

      expect(share.metadata).toEqual(metadata);
    });

    it('should ensure unique tokens', () => {
      const sessionId = 'test-session-789';
      const shares = Array.from({ length: 10 }, () => 
        shareManager.createShareToken(sessionId)
      );

      const tokens = shares.map(s => s.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should persist share to disk', async () => {
      const sessionId = 'test-persist';
      const share = shareManager.createShareToken(sessionId);

      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 50));

      const filePath = path.join(tempDir, `${share.token}.json`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('getShare', () => {
    it('should retrieve an existing share and increment access count', () => {
      const sessionId = 'test-get';
      const created = shareManager.createShareToken(sessionId);

      const retrieved = shareManager.getShare(created.token);

      expect(retrieved).toBeDefined();
      expect(retrieved?.token).toBe(created.token);
      expect(retrieved?.accessCount).toBe(1);
    });

    it('should return undefined for non-existent token', () => {
      const share = shareManager.getShare('non-existent-token');
      expect(share).toBeUndefined();
    });

    it('should respect expiration dates', () => {
      const sessionId = 'test-expired';
      const expiredShare = shareManager.createShareToken(sessionId, {
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      const retrieved = shareManager.getShare(expiredShare.token);
      expect(retrieved).toBeUndefined();
    });

    it('should respect max access limits', () => {
      const sessionId = 'test-max-access';
      const share = shareManager.createShareToken(sessionId, {
        maxAccesses: 2
      });

      // First two accesses should work
      expect(shareManager.getShare(share.token)).toBeDefined();
      expect(shareManager.getShare(share.token)).toBeDefined();
      
      // Third access should fail
      expect(shareManager.getShare(share.token)).toBeUndefined();
    });

    it('should update last accessed timestamp', async () => {
      const sessionId = 'test-timestamp';
      const share = shareManager.createShareToken(sessionId);
      const originalTime = share.lastAccessed;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = shareManager.getShare(share.token);
      expect(retrieved?.lastAccessed.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });

  describe('deleteShare', () => {
    it('should delete an existing share', () => {
      const sessionId = 'test-delete';
      const share = shareManager.createShareToken(sessionId);

      const deleted = shareManager.deleteShare(share.token);
      expect(deleted).toBe(true);

      // Should not be retrievable after deletion
      expect(shareManager.getShare(share.token)).toBeUndefined();
    });

    it('should return false for non-existent share', () => {
      const deleted = shareManager.deleteShare('non-existent');
      expect(deleted).toBe(false);
    });

    it('should remove share from session mapping', () => {
      const sessionId = 'test-session-mapping';
      const share = shareManager.createShareToken(sessionId);

      expect(shareManager.getSessionTokens(sessionId)).toHaveLength(1);
      
      shareManager.deleteShare(share.token);
      
      expect(shareManager.getSessionTokens(sessionId)).toHaveLength(0);
    });

    it('should delete share file from disk', async () => {
      const sessionId = 'test-disk-delete';
      const share = shareManager.createShareToken(sessionId);
      
      // Wait for save
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const filePath = path.join(tempDir, `${share.token}.json`);
      
      // File should exist initially
      await expect(fs.access(filePath)).resolves.toBeUndefined();
      
      shareManager.deleteShare(share.token);
      
      // Wait for async delete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // File should be deleted
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('getSessionTokens', () => {
    it('should return all tokens for a session', () => {
      const sessionId = 'test-multi-tokens';
      
      const shares = [
        shareManager.createShareToken(sessionId),
        shareManager.createShareToken(sessionId),
        shareManager.createShareToken(sessionId)
      ];

      const retrieved = shareManager.getSessionTokens(sessionId);
      
      expect(retrieved).toHaveLength(3);
      expect(retrieved.map(s => s.token).sort()).toEqual(shares.map(s => s.token).sort());
    });

    it('should return empty array for session with no tokens', () => {
      const tokens = shareManager.getSessionTokens('no-tokens-session');
      expect(tokens).toEqual([]);
    });

    it('should not return tokens from other sessions', () => {
      shareManager.createShareToken('session-1');
      shareManager.createShareToken('session-1');
      shareManager.createShareToken('session-2');

      const session1Tokens = shareManager.getSessionTokens('session-1');
      const session2Tokens = shareManager.getSessionTokens('session-2');

      expect(session1Tokens).toHaveLength(2);
      expect(session2Tokens).toHaveLength(1);
    });
  });

  describe('deleteSessionTokens', () => {
    it('should delete all tokens for a session', () => {
      const sessionId = 'test-delete-all';
      
      shareManager.createShareToken(sessionId);
      shareManager.createShareToken(sessionId);
      shareManager.createShareToken(sessionId);

      const count = shareManager.deleteSessionTokens(sessionId);
      
      expect(count).toBe(3);
      expect(shareManager.getSessionTokens(sessionId)).toHaveLength(0);
    });

    it('should return 0 for session with no tokens', () => {
      const count = shareManager.deleteSessionTokens('no-tokens');
      expect(count).toBe(0);
    });

    it('should not affect other sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      shareManager.createShareToken(session1);
      shareManager.createShareToken(session1);
      shareManager.createShareToken(session2);

      shareManager.deleteSessionTokens(session1);

      expect(shareManager.getSessionTokens(session1)).toHaveLength(0);
      expect(shareManager.getSessionTokens(session2)).toHaveLength(1);
    });
  });

  describe('cleanupExpiredShares', () => {
    it('should remove expired shares', () => {
      const expired = shareManager.createShareToken('expired', {
        expiresAt: new Date(Date.now() - 1000)
      });
      
      const valid = shareManager.createShareToken('valid', {
        expiresAt: new Date(Date.now() + 3600000)
      });

      shareManager.cleanupExpiredShares();

      expect(shareManager.getShare(expired.token)).toBeUndefined();
      expect(shareManager.getShare(valid.token)).toBeDefined();
    });

    it('should remove old shares without explicit expiry after 30 days', () => {
      const oldShare = shareManager.createShareToken('old');
      const newShare = shareManager.createShareToken('new');

      // Manually set createdAt to 31 days ago
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      oldShare.createdAt = oldDate;
      
      // Force update in internal map
      (shareManager as any).shares.set(oldShare.token, oldShare);

      shareManager.cleanupExpiredShares();

      expect(shareManager.getShare(oldShare.token)).toBeUndefined();
      expect(shareManager.getShare(newShare.token)).toBeDefined();
    });
  });

  describe('generateShareUrl', () => {
    it('should generate correct share URL with default base', () => {
      const token = 'abc123def456';
      const url = shareManager.generateShareUrl(token);
      
      expect(url).toBe('https://wingmanux.com/s/abc123def456');
    });

    it('should use custom base URL when provided', () => {
      const token = 'xyz789';
      const url = shareManager.generateShareUrl(token, 'http://localhost:3000');
      
      expect(url).toBe('http://localhost:3000/s/xyz789');
    });

    it('should use environment variable when set', () => {
      const originalEnv = process.env.SHARE_BASE_URL;
      process.env.SHARE_BASE_URL = 'https://custom.example.com';
      
      const newManager = new ShareManager(tempDir);
      const token = 'test123';
      const url = newManager.generateShareUrl(token);
      
      expect(url).toBe('https://custom.example.com/s/test123');
      
      // Restore original env
      if (originalEnv) {
        process.env.SHARE_BASE_URL = originalEnv;
      } else {
        delete process.env.SHARE_BASE_URL;
      }
    });
  });

  describe('validatePassword', () => {
    it('should return true for shares without password', () => {
      const share = shareManager.createShareToken('no-pass');
      const valid = shareManager.validatePassword(share.token, '');
      
      expect(valid).toBe(true);
    });

    it('should validate password correctly', () => {
      const share = shareManager.createShareToken('with-pass', {
        password: 'secret123'
      });

      expect(shareManager.validatePassword(share.token, 'secret123')).toBe(true);
      expect(shareManager.validatePassword(share.token, 'wrong')).toBe(false);
    });

    it('should return true for non-existent share', () => {
      const valid = shareManager.validatePassword('non-existent', 'any');
      expect(valid).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should load shares from disk on initialization', async () => {
      const sessionId = 'persistent-session';
      
      // Create shares with first manager
      const manager1 = new ShareManager(tempDir);
      const share1 = manager1.createShareToken(sessionId);
      const share2 = manager1.createShareToken(sessionId);
      
      // Wait for saves
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create new manager with same directory
      const manager2 = new ShareManager(tempDir);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be able to retrieve shares created by first manager
      expect(manager2.getShare(share1.token)).toBeDefined();
      expect(manager2.getShare(share2.token)).toBeDefined();
      expect(manager2.getSessionTokens(sessionId)).toHaveLength(2);
    });

    it('should handle corrupted share files gracefully', async () => {
      // Write corrupted JSON file
      const corruptedFile = path.join(tempDir, 'corrupted.json');
      await fs.writeFile(corruptedFile, 'not valid json');
      
      // Should not throw when initializing
      expect(() => new ShareManager(tempDir)).not.toThrow();
    });
  });
});