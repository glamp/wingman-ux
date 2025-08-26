import { createLogger } from '@wingman/shared';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { TunnelSession } from './session-manager';

export interface ShareToken {
  token: string;
  sessionId: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  metadata?: {
    createdBy?: string;
    label?: string;
    password?: string; // Hashed password for future use
    expiresAt?: Date;
    maxAccesses?: number;
  };
}

/**
 * Manages shareable links for tunnel sessions using Loom-style unguessable URLs.
 * Provides a secure, frictionless way to share tunnel access with PMs and reviewers.
 */
export class ShareManager {
  private shares: Map<string, ShareToken> = new Map();
  private sessionToTokens: Map<string, Set<string>> = new Map();
  private storagePath: string;
  private logger = createLogger('Wingman:ShareManager');

  constructor(storagePath: string = './.wingman/shares') {
    this.storagePath = storagePath;
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await this.loadShares();
    } catch (error) {
      this.logger.error('Failed to initialize share storage:', error);
    }
  }

  private async loadShares() {
    try {
      const files = await fs.readdir(this.storagePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.storagePath, file), 'utf-8');
          const share = JSON.parse(content, (key, value) => {
            if (key === 'createdAt' || key === 'lastAccessed' || key === 'expiresAt') {
              return new Date(value);
            }
            return value;
          });
          
          this.shares.set(share.token, share);
          
          // Rebuild session mapping
          if (!this.sessionToTokens.has(share.sessionId)) {
            this.sessionToTokens.set(share.sessionId, new Set());
          }
          this.sessionToTokens.get(share.sessionId)!.add(share.token);
        }
      }
      this.logger.info(`Loaded ${this.shares.size} share tokens from disk`);
    } catch (error) {
      this.logger.error('Failed to load shares:', error);
    }
  }

  private async saveShare(share: ShareToken) {
    try {
      const filePath = path.join(this.storagePath, `${share.token}.json`);
      await fs.writeFile(filePath, JSON.stringify(share, null, 2));
    } catch (error) {
      this.logger.error('Failed to save share:', error);
    }
  }

  private async deleteShareFile(token: string) {
    try {
      const filePath = path.join(this.storagePath, `${token}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  /**
   * Generate a cryptographically secure 32-character hex token.
   * Similar to Loom's approach for unguessable URLs.
   */
  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create a shareable link for a tunnel session.
   */
  createShareToken(
    sessionId: string, 
    metadata?: ShareToken['metadata']
  ): ShareToken {
    let token = this.generateToken();
    
    // Ensure unique token
    while (this.shares.has(token)) {
      token = this.generateToken();
    }

    const share: ShareToken = {
      token,
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      ...(metadata && { metadata })
    };

    // Store the share
    this.shares.set(token, share);
    
    // Map to session for reverse lookup
    if (!this.sessionToTokens.has(sessionId)) {
      this.sessionToTokens.set(sessionId, new Set());
    }
    this.sessionToTokens.get(sessionId)!.add(token);
    
    this.saveShare(share);
    
    this.logger.info(`Created share token for session ${sessionId}: ${token.substring(0, 8)}...`);
    return share;
  }

  /**
   * Get share information by token.
   * Increments access count and updates last accessed time.
   */
  getShare(token: string): ShareToken | undefined {
    const share = this.shares.get(token);
    if (share) {
      // Check if expired
      if (share.metadata?.expiresAt && new Date() > share.metadata.expiresAt) {
        this.logger.info(`Share token expired: ${token.substring(0, 8)}...`);
        this.deleteShare(token);
        return undefined;
      }

      // Check max accesses
      if (share.metadata?.maxAccesses && share.accessCount >= share.metadata.maxAccesses) {
        this.logger.info(`Share token exceeded max accesses: ${token.substring(0, 8)}...`);
        return undefined;
      }

      // Update access info
      share.accessCount++;
      share.lastAccessed = new Date();
      this.saveShare(share);
    }
    return share;
  }

  /**
   * Delete a share token.
   */
  deleteShare(token: string): boolean {
    const share = this.shares.get(token);
    if (share) {
      // Remove from session mapping
      const tokens = this.sessionToTokens.get(share.sessionId);
      if (tokens) {
        tokens.delete(token);
        if (tokens.size === 0) {
          this.sessionToTokens.delete(share.sessionId);
        }
      }
      
      // Delete the share
      this.shares.delete(token);
      this.deleteShareFile(token);
      
      this.logger.info(`Deleted share token: ${token.substring(0, 8)}...`);
      return true;
    }
    return false;
  }

  /**
   * Get all share tokens for a session.
   */
  getSessionTokens(sessionId: string): ShareToken[] {
    const tokens = this.sessionToTokens.get(sessionId);
    if (!tokens) return [];
    
    return Array.from(tokens)
      .map(token => this.shares.get(token))
      .filter((share): share is ShareToken => share !== undefined);
  }

  /**
   * Delete all share tokens for a session.
   */
  deleteSessionTokens(sessionId: string): number {
    const tokens = this.sessionToTokens.get(sessionId);
    if (!tokens) return 0;
    
    let count = 0;
    for (const token of tokens) {
      if (this.deleteShare(token)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clean up expired share tokens.
   */
  cleanupExpiredShares(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, share] of this.shares.entries()) {
      // Check expiration
      if (share.metadata?.expiresAt && now > share.metadata.expiresAt) {
        this.deleteShare(token);
        cleaned++;
        continue;
      }
      
      // Clean up old shares without explicit expiry (30 days)
      const age = now.getTime() - share.createdAt.getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (age > thirtyDays && !share.metadata?.expiresAt) {
        this.deleteShare(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} expired share tokens`);
    }
  }

  /**
   * Generate a full shareable URL for a token.
   */
  generateShareUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || process.env.SHARE_BASE_URL || 'https://wingmanux.com';
    return `${base}/s/${token}`;
  }

  /**
   * Validate a password for a protected share (future feature).
   */
  validatePassword(token: string, password: string): boolean {
    const share = this.shares.get(token);
    if (!share || !share.metadata?.password) {
      return true; // No password required
    }
    
    // For now, simple comparison. In production, use bcrypt or similar.
    // This is a placeholder for future implementation.
    return share.metadata.password === password;
  }
}