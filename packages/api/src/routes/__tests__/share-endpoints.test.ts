import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { tunnelRouter } from '../tunnel';
import { SessionManager } from '../../services/session-manager';
import { ShareManager } from '../../services/share-manager';
import { ConnectionManager } from '../../services/connection-manager';
import path from 'path';
import { tmpdir } from 'os';
import fs from 'fs/promises';

vi.mock('@wingman/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

describe('Share API Endpoints', () => {
  let app: express.Express;
  let sessionManager: SessionManager;
  let shareManager: ShareManager;
  let connectionManager: ConnectionManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directories
    tempDir = path.join(tmpdir(), `share-api-test-${Date.now()}`);
    const sessionsDir = path.join(tempDir, 'sessions');
    const sharesDir = path.join(tempDir, 'shares');
    
    await fs.mkdir(sessionsDir, { recursive: true });
    await fs.mkdir(sharesDir, { recursive: true });
    
    // Initialize services
    sessionManager = new SessionManager(sessionsDir);
    shareManager = new ShareManager(sharesDir);
    connectionManager = new ConnectionManager();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/tunnel', tunnelRouter(sessionManager, connectionManager, shareManager));
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /tunnel/share', () => {
    it('should create a shareable link for an existing session', async () => {
      // Create a session first
      const session = sessionManager.createSession('test-dev', 3000);
      
      const response = await request(app)
        .post('/tunnel/share')
        .send({
          sessionId: session.id,
          label: 'Test Share',
          expiresIn: 24,
          maxAccesses: 10
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        sessionId: session.id,
        shareToken: expect.stringMatching(/^[a-f0-9]{32}$/),
        shareUrl: expect.stringContaining('/s/')
      });
      
      expect(response.body.shareUrl).toContain(response.body.shareToken);
    });

    it('should return 400 if sessionId is missing', async () => {
      const response = await request(app)
        .post('/tunnel/share')
        .send({ label: 'Test' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    });

    it('should return 404 if session does not exist', async () => {
      const response = await request(app)
        .post('/tunnel/share')
        .send({ sessionId: 'non-existent' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });

    it('should create share with default values when optional fields are omitted', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      const response = await request(app)
        .post('/tunnel/share')
        .send({ sessionId: session.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiresAt).toBeUndefined();
      expect(response.body.maxAccesses).toBeUndefined();
    });

    it('should handle expiration time correctly', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      const response = await request(app)
        .post('/tunnel/share')
        .send({
          sessionId: session.id,
          expiresIn: 2 // 2 hours
        })
        .expect(200);

      expect(response.body.expiresAt).toBeDefined();
      const expiresAt = new Date(response.body.expiresAt);
      const now = new Date();
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      expect(hoursDiff).toBeGreaterThan(1.9);
      expect(hoursDiff).toBeLessThan(2.1);
    });
  });

  describe('GET /tunnel/share/:token', () => {
    it('should retrieve session info via share token', async () => {
      // Create session and share token
      const session = sessionManager.createSession('test-dev', 3000);
      const share = shareManager.createShareToken(session.id, { label: 'Test' });
      
      const response = await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: session.id,
        targetPort: 3000,
        status: 'pending',
        shareInfo: {
          accessCount: 1,
          label: 'Test'
        }
      });
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .get('/tunnel/share/nonexistenttoken123')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Share link not found or expired',
        code: 'SHARE_NOT_FOUND'
      });
    });

    it('should return 404 if associated session is deleted', async () => {
      // Create session and share
      const session = sessionManager.createSession('test-dev', 3000);
      const share = shareManager.createShareToken(session.id);
      
      // Delete the session
      sessionManager.deleteSession(session.id);
      
      const response = await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Associated session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });

    it('should increment access count on each retrieval', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      const share = shareManager.createShareToken(session.id);
      
      // First access
      const response1 = await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(200);
      
      expect(response1.body.shareInfo.accessCount).toBe(1);
      
      // Second access
      const response2 = await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(200);
      
      expect(response2.body.shareInfo.accessCount).toBe(2);
    });

    it('should respect max access limits', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      const share = shareManager.createShareToken(session.id, { maxAccesses: 2 });
      
      // First two accesses should work
      await request(app).get(`/tunnel/share/${share.token}`).expect(200);
      await request(app).get(`/tunnel/share/${share.token}`).expect(200);
      
      // Third access should fail
      await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(404);
    });
  });

  describe('DELETE /tunnel/share/:token', () => {
    it('should revoke a share link', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      const share = shareManager.createShareToken(session.id);
      
      const response = await request(app)
        .delete(`/tunnel/share/${share.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Share link revoked'
      });
      
      // Should not be accessible after deletion
      await request(app)
        .get(`/tunnel/share/${share.token}`)
        .expect(404);
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .delete('/tunnel/share/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Share link not found',
        code: 'SHARE_NOT_FOUND'
      });
    });
  });

  describe('GET /tunnel/shares/:sessionId', () => {
    it('should list all share links for a session', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      // Create multiple shares
      const share1 = shareManager.createShareToken(session.id, { label: 'Share 1' });
      const share2 = shareManager.createShareToken(session.id, { label: 'Share 2' });
      const share3 = shareManager.createShareToken(session.id, { label: 'Share 3' });
      
      const response = await request(app)
        .get(`/tunnel/shares/${session.id}`)
        .expect(200);

      expect(response.body.sessionId).toBe(session.id);
      expect(response.body.shares).toHaveLength(3);
      
      const tokens = response.body.shares.map((s: any) => s.token);
      expect(tokens).toContain(share1.token);
      expect(tokens).toContain(share2.token);
      expect(tokens).toContain(share3.token);
      
      // Each share should have correct structure
      response.body.shares.forEach((share: any) => {
        expect(share).toMatchObject({
          token: expect.stringMatching(/^[a-f0-9]{32}$/),
          shareUrl: expect.stringContaining('/s/'),
          createdAt: expect.any(String),
          accessCount: expect.any(Number),
          lastAccessed: expect.any(String)
        });
      });
    });

    it('should return empty array for session with no shares', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      const response = await request(app)
        .get(`/tunnel/shares/${session.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: session.id,
        shares: []
      });
    });

    it('should work with non-existent session', async () => {
      const response = await request(app)
        .get('/tunnel/shares/non-existent')
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: 'non-existent',
        shares: []
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full lifecycle: create, access, list, revoke', async () => {
      // 1. Create session
      const session = sessionManager.createSession('test-dev', 3000);
      
      // 2. Create share link
      const createResponse = await request(app)
        .post('/tunnel/share')
        .send({
          sessionId: session.id,
          label: 'Integration Test'
        })
        .expect(200);
      
      const shareToken = createResponse.body.shareToken;
      
      // 3. Access share link
      const accessResponse = await request(app)
        .get(`/tunnel/share/${shareToken}`)
        .expect(200);
      
      expect(accessResponse.body.sessionId).toBe(session.id);
      
      // 4. List shares for session
      const listResponse = await request(app)
        .get(`/tunnel/shares/${session.id}`)
        .expect(200);
      
      expect(listResponse.body.shares).toHaveLength(1);
      expect(listResponse.body.shares[0].token).toBe(shareToken);
      
      // 5. Revoke share
      await request(app)
        .delete(`/tunnel/share/${shareToken}`)
        .expect(200);
      
      // 6. Verify it's gone
      await request(app)
        .get(`/tunnel/share/${shareToken}`)
        .expect(404);
      
      const finalListResponse = await request(app)
        .get(`/tunnel/shares/${session.id}`)
        .expect(200);
      
      expect(finalListResponse.body.shares).toHaveLength(0);
    });

    it('should handle multiple shares per session', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      // Create multiple shares
      const shares = await Promise.all([
        request(app).post('/tunnel/share').send({ sessionId: session.id, label: 'Dev' }),
        request(app).post('/tunnel/share').send({ sessionId: session.id, label: 'QA' }),
        request(app).post('/tunnel/share').send({ sessionId: session.id, label: 'PM' })
      ]);
      
      expect(shares).toHaveLength(3);
      shares.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // List all shares
      const listResponse = await request(app)
        .get(`/tunnel/shares/${session.id}`)
        .expect(200);
      
      expect(listResponse.body.shares).toHaveLength(3);
      
      // Each share should work independently
      for (const share of shares) {
        const accessResponse = await request(app)
          .get(`/tunnel/share/${share.body.shareToken}`)
          .expect(200);
        
        expect(accessResponse.body.sessionId).toBe(session.id);
      }
    });
  });

  describe('Error handling without ShareManager', () => {
    let appWithoutShare: express.Express;

    beforeEach(() => {
      // Create app without ShareManager
      appWithoutShare = express();
      appWithoutShare.use(express.json());
      appWithoutShare.use('/tunnel', tunnelRouter(sessionManager, connectionManager));
    });

    it('should return 501 when ShareManager is not available', async () => {
      const session = sessionManager.createSession('test-dev', 3000);
      
      const response = await request(appWithoutShare)
        .post('/tunnel/share')
        .send({ sessionId: session.id })
        .expect(501);

      expect(response.body).toMatchObject({
        error: 'Share links not available in remote mode',
        code: 'SHARE_NOT_AVAILABLE'
      });
    });
  });
});