import { createLogger } from '@wingman/shared';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Aviation-themed word lists for session ID generation
const CALLSIGNS = [
  'maverick', 'ghost', 'phantom', 'viper', 'lightning',
  'thunder', 'storm', 'eagle', 'hawk', 'falcon',
  'razor', 'dagger', 'sabre', 'raptor', 'phoenix',
  'raven', 'wolf', 'tiger', 'cobra', 'dragon'
];

const PHONETIC = [
  'alpha', 'bravo', 'charlie', 'delta', 'echo',
  'foxtrot', 'golf', 'hotel', 'india', 'juliet',
  'kilo', 'lima', 'mike', 'november', 'oscar',
  'papa', 'quebec', 'romeo', 'sierra', 'tango',
  'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu'
];

export interface TunnelSession {
  id: string;
  developerId: string;
  targetPort: number;
  status: 'pending' | 'active' | 'expired';
  createdAt: Date;
  lastActivity: Date;
  tunnelUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Manages tunnel sessions with persistence and automatic cleanup.
 * Sessions are stored both in memory and on disk for recovery after restarts.
 */
export class SessionManager {
  private sessions: Map<string, TunnelSession> = new Map();
  private storagePath: string;
  private logger = createLogger('Wingman:SessionManager');

  constructor(storagePath: string = './.wingman/sessions') {
    this.storagePath = storagePath;
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      // Load existing sessions from disk if any
      await this.loadSessions();
    } catch (error) {
      this.logger.error('Failed to initialize storage:', error);
    }
  }

  private async loadSessions() {
    try {
      const files = await fs.readdir(this.storagePath);
      let loadedCount = 0;
      let skippedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storagePath, file);
          
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Validate JSON before parsing
            let session: TunnelSession;
            try {
              session = JSON.parse(content, (key, value) => {
                // Revive Date objects
                if (key === 'createdAt' || key === 'lastActivity') {
                  return new Date(value);
                }
                return value;
              });
            } catch (parseError: any) {
              this.logger.warn(`Corrupted session file ${file}: ${parseError.message}`);
              skippedCount++;
              
              // Optionally delete corrupted files
              try {
                await fs.unlink(filePath);
                this.logger.info(`Deleted corrupted session file: ${file}`);
              } catch (deleteError) {
                this.logger.error(`Failed to delete corrupted file ${file}:`, deleteError);
              }
              continue;
            }
            
            // Validate session structure
            if (!session.id || !session.developerId || !session.targetPort) {
              this.logger.warn(`Invalid session structure in ${file}, skipping`);
              skippedCount++;
              continue;
            }
            
            this.sessions.set(session.id, session);
            loadedCount++;
          } catch (readError: any) {
            this.logger.error(`Failed to read session file ${file}: ${readError.message}`);
            skippedCount++;
          }
        }
      }
      
      this.logger.info(`Loaded ${loadedCount} sessions from disk` + 
        (skippedCount > 0 ? ` (skipped ${skippedCount} corrupted files)` : ''));
    } catch (error) {
      this.logger.error('Failed to load sessions directory:', error);
    }
  }

  private async saveSession(session: TunnelSession) {
    try {
      const filePath = path.join(this.storagePath, `${session.id}.json`);
      const tempPath = `${filePath}.tmp`;
      
      // Write to temp file first (atomic write pattern)
      await fs.writeFile(tempPath, JSON.stringify(session, null, 2));
      
      // Rename temp file to final file (atomic on most filesystems)
      await fs.rename(tempPath, filePath);
    } catch (error) {
      this.logger.error('Failed to save session:', error);
      
      // Clean up temp file if it exists
      const tempPath = path.join(this.storagePath, `${session.id}.json.tmp`);
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async deleteSessionFile(sessionId: string) {
    try {
      const filePath = path.join(this.storagePath, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  /**
   * Generate aviation-themed session ID (e.g., "ghost-whiskey", "maverick-alpha")
   * These are memorable and easy to share verbally
   */
  private generateSessionId(): string {
    const callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
    const phonetic = PHONETIC[Math.floor(Math.random() * PHONETIC.length)];
    return `${callsign}-${phonetic}`;
  }

  createSession(developerId: string, targetPort: number, metadata?: Record<string, any>): TunnelSession {
    let sessionId = this.generateSessionId();
    
    // Ensure unique ID
    while (this.sessions.has(sessionId)) {
      sessionId = this.generateSessionId();
    }

    const session: TunnelSession = {
      id: sessionId,
      developerId,
      targetPort,
      status: 'pending',
      createdAt: new Date(),
      lastActivity: new Date(),
      ...(metadata && { metadata })
    };

    this.sessions.set(sessionId, session);
    this.saveSession(session);
    
    this.logger.info(`Created session ${sessionId} for developer ${developerId}`);
    return session;
  }

  getSession(sessionId: string): TunnelSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      this.saveSession(session);
    }
    return session;
  }

  updateSession(sessionId: string, updates: Partial<TunnelSession>): TunnelSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = new Date();
      this.saveSession(session);
      this.logger.info(`Updated session ${sessionId}:`, updates);
    }
    return session;
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.deleteSessionFile(sessionId);
      this.logger.info(`Deleted session ${sessionId}`);
    }
    return deleted;
  }

  getActiveSessions(): TunnelSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  getAllSessions(): TunnelSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up sessions older than 24 hours.
   * Called periodically by the server to prevent memory leaks.
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > expiryTime) {
        this.logger.info(`Expiring session ${sessionId} (age: ${Math.round(age / 1000 / 60)} minutes)`);
        session.status = 'expired';
        this.deleteSession(sessionId);
      }
    }
  }

  // Find sessions by developer or port
  findSessions(filter: { developerId?: string; targetPort?: number }): TunnelSession[] {
    return Array.from(this.sessions.values()).filter(session => {
      if (filter.developerId && session.developerId !== filter.developerId) return false;
      if (filter.targetPort && session.targetPort !== filter.targetPort) return false;
      return true;
    });
  }
}