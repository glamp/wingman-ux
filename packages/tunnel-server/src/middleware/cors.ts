import cors from 'cors';
import type { CorsOptions } from 'cors';

/**
 * CORS configuration for the tunnel server
 * 
 * Purpose: Allow PM browsers to connect to the tunnel server for P2P WebRTC signaling
 * This handles:
 * - PM browser WebSocket connections from subdomains (ghost-whiskey.wingmanux.com)
 * - P2P signaling between browser peers
 * - Static asset loading for PM interface
 * 
 * This does NOT affect the user's tunneled application - that appears same-origin
 */
export function createCorsMiddleware() {
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (server-side requests, same-origin)
      if (!origin) {
        return callback(null, true);
      }

      // Allow all subdomains of wingmanux.com (PM session URLs)
      // Matches: ghost-whiskey.wingmanux.com, maverick-alpha.wingmanux.com, etc.
      if (origin.match(/^https?:\/\/[a-z]+-[a-z]+\.wingmanux\.com$/)) {
        return callback(null, true);
      }

      // Allow root domain
      if (origin === 'https://wingmanux.com' || origin === 'https://www.wingmanux.com') {
        return callback(null, true);
      }

      // Development: allow localhost with any port
      if (process.env.NODE_ENV === 'development') {
        if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
          return callback(null, true);
        }
        // Also allow 127.0.0.1
        if (origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
          return callback(null, true);
        }
      }

      // Allow configured additional origins
      const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
      if (additionalOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origins for debugging
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },

    // Need credentials for WebSocket upgrade and session management
    credentials: true,

    // Methods used by PM interface and P2P signaling
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    // Headers that might be sent during P2P signaling
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Id',
      'X-Request-Id',
      'Upgrade',
      'Connection'
    ],

    // Headers we expose to the client
    exposedHeaders: [
      'X-P2P-Status',
      'X-Connection-Mode',
      'X-Session-Id'
    ],

    // Cache preflight requests for 24 hours
    maxAge: 86400,

    // Success status for legacy browsers
    optionsSuccessStatus: 204
  };

  return cors(corsOptions);
}

/**
 * Special CORS handling for WebSocket upgrade requests
 * WebSocket doesn't use standard CORS, but we should validate origin
 */
export function validateWebSocketOrigin(req: any): boolean {
  const origin = req.headers.origin;
  
  // No origin header (same-origin or non-browser client)
  if (!origin) {
    return true;
  }

  // Check if origin is allowed
  // Same logic as CORS middleware
  if (origin.match(/^https?:\/\/[a-z]+-[a-z]+\.wingmanux\.com$/)) {
    return true;
  }

  if (origin === 'https://wingmanux.com' || origin === 'https://www.wingmanux.com') {
    return true;
  }

  // Development
  if (process.env.NODE_ENV === 'development') {
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return true;
    }
  }

  console.warn(`[WebSocket] Rejected origin: ${origin}`);
  return false;
}

/**
 * Middleware to add security headers for static assets
 */
export function staticAssetHeaders(req: any, res: any, next: any) {
  // Content Security Policy for loading scripts from CDN
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-src 'self' http://localhost:* https://*.wingmanux.com"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}