import cors from 'cors';
import type { CorsOptions } from 'cors';

/**
 * CORS configuration for the relay server
 * 
 * Purpose: Allow Chrome/Firefox extensions to submit annotations to the relay server
 * This is NOT for user's application APIs - those are handled separately
 */
export function createCorsMiddleware() {
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-side requests)
      if (!origin) {
        return callback(null, true);
      }

      // MUST allow Chrome extensions
      if (origin.startsWith('chrome-extension://')) {
        return callback(null, true);
      }

      // MUST allow Firefox extensions  
      if (origin.startsWith('moz-extension://')) {
        return callback(null, true);
      }

      // Allow Edge extensions
      if (origin.startsWith('extension://')) {
        return callback(null, true);
      }

      // Development mode: allow everything
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CORS] Allowing origin in development: ${origin}`);
        return callback(null, true);
      }

      // Production: allow configured origins (like our frontend)
      const corsOrigin = process.env.CORS_ORIGIN;
      if (corsOrigin && origin === corsOrigin) {
        return callback(null, true);
      }
      
      // Also support comma-separated list
      const allowedDomains = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
      if (allowedDomains.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origins for debugging
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS - only browser extensions can access this server'));
    },

    // Extensions don't typically need credentials
    credentials: false,

    // Methods that extensions might use
    methods: ['GET', 'POST', 'OPTIONS'],

    // Headers that extensions might send
    allowedHeaders: ['Content-Type', 'X-Extension-Id', 'X-Extension-Version'],

    // Headers we expose to the extension
    exposedHeaders: ['X-Request-Id', 'X-Preview-Url'],

    // Cache preflight requests for 24 hours
    maxAge: 86400,

    // Success status for legacy browsers
    optionsSuccessStatus: 204
  };

  return cors(corsOptions);
}

/**
 * Middleware to log CORS requests in development
 */
export function corsDebugMiddleware(req: any, res: any, next: any) {
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_CORS === 'true') {
    console.log('[CORS Debug]', {
      method: req.method,
      origin: req.headers.origin,
      path: req.path,
      headers: req.headers
    });
  }
  next();
}