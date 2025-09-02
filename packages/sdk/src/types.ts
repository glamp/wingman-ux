export interface WingmanConfig {
  enabled?: boolean;
  debug?: boolean;
  oauth?: WingmanOAuthConfig;
}

export interface WingmanOAuthConfig {
  /** Routes that need OAuth tunnel support (e.g., ['/api/auth/*', '/auth/callback']) */
  routes: string[];
  
  /** Custom function to modify redirect URIs for tunnel domains */
  modifyRedirectUri?: (originalUri: string, tunnelDomain: string) => string;
  
  /** Environment variable overrides for tunnel mode */
  envOverrides?: Record<string, string>;
}