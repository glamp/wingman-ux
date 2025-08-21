import { randomBytes } from 'crypto';

export interface TunnelSession {
  id: string;
  developerId: string;
  targetPort: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'active' | 'expired';
}

export class SessionManager {
  private sessions = new Map<string, TunnelSession>();
  private readonly sessionExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new tunnel session
   */
  createSession(developerId: string, port: number): string {
    const id = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionExpiryMs);

    const session: TunnelSession = {
      id,
      developerId,
      targetPort: port,
      createdAt: now,
      expiresAt,
      status: 'pending'
    };

    this.sessions.set(id, session);
    return id;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TunnelSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      session.status = 'expired';
    }

    return session;
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: TunnelSession['status']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   */
  getActiveSessions(): TunnelSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Generate a unique session ID using aviation callsigns and NATO phonetic alphabet
   */
  private generateSessionId(): string {
    const callsigns = [
      // Famous aviators
      'maverick', 'iceman', 'goose', 'rooster', 'phoenix', 'hangman', 'bob',
      'viper', 'jester', 'cougar', 'slider', 'wolfman', 'hollywood', 'chipper',
      'sundown', 'stinger', 'merlin', 'charley', 'duke', 'raven',
      
      // Fictional callsigns
      'ghost', 'shadow', 'hawk', 'eagle', 'falcon', 'venom', 'saber', 'storm',
      'lightning', 'thunder', 'vortex', 'cyclone', 'typhoon', 'raptor', 'stealth',
      'phantom', 'hunter', 'archer', 'ranger', 'blade', 'fury', 'striker',
      'valkyrie', 'banshee', 'reaper', 'cobra', 'talon', 'wings',
      'skyfall', 'stardust', 'comet', 'nebula', 'orbit', 'rocket', 'apollo',
      
      // Aviation themed
      'turbine', 'afterburner', 'supersonic', 'mach', 'altitude', 'runway',
      'tower', 'radar', 'compass', 'throttle', 'yoke', 'rudder', 'flaps',
      'gear', 'canopy', 'cockpit', 'hangar', 'squadron'
    ];
    
    // NATO phonetic alphabet
    const natoPhonetic = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
      'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
      'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey',
      'xray', 'yankee', 'zulu'
    ];
    
    const callsign = callsigns[Math.floor(Math.random() * callsigns.length)];
    const phonetic = natoPhonetic[Math.floor(Math.random() * natoPhonetic.length)];
    
    // Format: callsign-phonetic (e.g., maverick-alpha)
    return `${callsign}-${phonetic}`;
  }
}