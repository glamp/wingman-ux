import type { WingmanOAuthConfig } from './types';

/**
 * OAuth handler for tunnel-aware authentication
 * Detects tunnel mode and modifies OAuth configuration accordingly
 */
export class WingmanOAuthHandler {
  private config: WingmanOAuthConfig;

  constructor(config: WingmanOAuthConfig) {
    this.config = config;
  }

  /**
   * Check if current request is in tunnel mode
   */
  private isTunnelMode(req?: any): boolean {
    // Server-side: check headers
    if (req && req.headers) {
      return req.headers['x-tunnel-oauth'] === 'true';
    }
    
    // Client-side: check window context (would be set by server-side rendering)
    if (typeof window !== 'undefined') {
      return !!(window as any).__wingman_tunnel_context;
    }
    
    return false;
  }

  /**
   * Get tunnel domain from request headers
   */
  private getTunnelDomain(req?: any): string | null {
    if (req && req.headers && req.headers['x-tunnel-domain']) {
      return req.headers['x-tunnel-domain'];
    }
    
    if (typeof window !== 'undefined') {
      return (window as any).__wingman_tunnel_domain || null;
    }
    
    return null;
  }

  /**
   * Check if a path matches configured OAuth routes
   */
  private isOAuthRoute(path: string): boolean {
    return this.config.routes.some(route => {
      // Convert glob pattern to regex
      const regexPattern = route
        .replace(/\//g, '\\/')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    });
  }

  /**
   * Modify environment variables for tunnel mode
   */
  private setupTunnelEnv(tunnelDomain: string): void {
    if (!this.config.envOverrides) return;
    
    Object.entries(this.config.envOverrides).forEach(([key, template]) => {
      const value = template.replace('{tunnelDomain}', tunnelDomain);
      process.env[key] = value;
    });
  }

  /**
   * Default redirect URI modifier
   */
  private defaultRedirectModifier(originalUri: string, tunnelDomain: string): string {
    // Replace the domain but preserve the path
    return originalUri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
  }

  /**
   * Modify redirect URIs for tunnel compatibility
   */
  public modifyRedirectUri(originalUri: string, tunnelDomain: string): string {
    const modifier = this.config.modifyRedirectUri || this.defaultRedirectModifier;
    return modifier(originalUri, tunnelDomain);
  }

  /**
   * Setup OAuth for tunnel mode (called automatically when tunnel detected)
   */
  public setupTunnelOAuth(req?: any): void {
    if (!this.isTunnelMode(req)) return;
    
    const tunnelDomain = this.getTunnelDomain(req);
    if (!tunnelDomain) return;

    // Setup environment variables
    this.setupTunnelEnv(tunnelDomain);

    // Store tunnel context for client-side access
    if (typeof window !== 'undefined') {
      (window as any).__wingman_tunnel_domain = tunnelDomain;
      (window as any).__wingman_tunnel_context = true;
    }
  }

  /**
   * Express/Next.js middleware wrapper
   */
  public middleware() {
    return (req: any, res: any, next: any) => {
      // Check if this is an OAuth route
      if (req.path && this.isOAuthRoute(req.path)) {
        this.setupTunnelOAuth(req);
      }
      
      next();
    };
  }

  /**
   * Get configuration for debugging
   */
  public getConfig(): WingmanOAuthConfig {
    return this.config;
  }
}

/**
 * Factory function to create OAuth handler
 */
export function createOAuthHandler(config: WingmanOAuthConfig): WingmanOAuthHandler {
  return new WingmanOAuthHandler(config);
}

/**
 * Simple middleware wrapper for Express/Next.js
 */
export function withWingmanOAuth<T>(
  handler: T, 
  config: WingmanOAuthConfig
): T {
  const oauthHandler = createOAuthHandler(config);
  
  return ((req: any, res: any, next?: any) => {
    // Setup tunnel OAuth if needed
    oauthHandler.setupTunnelOAuth(req);
    
    // Call original handler
    if (typeof handler === 'function') {
      return (handler as any)(req, res, next);
    }
    
    return handler;
  }) as T;
}