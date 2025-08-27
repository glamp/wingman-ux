import { Request, Response, NextFunction } from 'express';
import { ProxyHandler } from '../services/proxy-handler';
import { SessionManager } from '../services/session-manager';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:SubdomainProxy');

/**
 * Middleware to handle subdomain-based tunnel routing.
 * Extracts session ID from subdomain and proxies requests through the tunnel.
 * 
 * Handles patterns like:
 * - session-id.wingmanux.com (production)
 * - session-id.api.wingmanux.com (production API subdomain)
 * - session-id.localhost:8787 (local development)
 */
export function createSubdomainProxyMiddleware(
  sessionManager: SessionManager,
  proxyHandler: ProxyHandler
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const host = req.get('host') || '';
    
    logger.debug(`Checking subdomain for host: ${host}`);
    
    // Extract subdomain from host
    // Remove port if present (for local development)
    const hostWithoutPort = host.split(':')[0] || '';
    const hostParts = hostWithoutPort.split('.');
    
    // Check if this looks like a session subdomain
    // Need at least 2 parts (subdomain.domain or subdomain.domain.tld)
    if (hostParts.length >= 2) {
      const possibleSessionId = hostParts[0] || '';
      
      // Check if this matches our session ID pattern
      // Session IDs are alphanumeric with hyphens (e.g., alpha-bravo-123)
      // Allow both uppercase and lowercase
      if (possibleSessionId && /^[a-z0-9][a-z0-9-]+[a-z0-9]$/i.test(possibleSessionId)) {
        logger.debug(`Checking session: ${possibleSessionId}`);
        
        // Check if session exists
        const session = sessionManager.getSession(possibleSessionId);
        
        if (session) {
          logger.info(`Proxying request for session ${possibleSessionId}: ${req.method} ${req.path}`);
          
          // This is a tunnel request - set up params for proxy handler
          // The proxy handler expects params.sessionId and params[0] for the path
          req.params = req.params || {};
          req.params.sessionId = possibleSessionId;
          req.params['0'] = req.path.slice(1); // Remove leading slash
          
          // Let the proxy handler handle it
          return proxyHandler.handleRequest(req, res, next);
        } else {
          logger.debug(`Session ${possibleSessionId} not found`);
        }
      }
    }
    
    // Not a tunnel subdomain, continue to normal routes
    next();
  };
}