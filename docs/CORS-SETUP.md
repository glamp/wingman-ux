# CORS Configuration Guide

This document explains the CORS (Cross-Origin Resource Sharing) configuration for the Wingman P2P infrastructure.

## Overview

Wingman uses CORS to enable secure communication between:
- Chrome/Firefox extensions and the relay server
- PM browsers and the tunnel server
- WebRTC P2P signaling between peers

**Important**: This CORS configuration is for the P2P infrastructure only, NOT for user applications being tunneled.

## Relay Server CORS (Port 8787)

The relay server accepts requests from browser extensions to store annotations.

### Allowed Origins
- **Chrome Extensions**: `chrome-extension://*`
- **Firefox Extensions**: `moz-extension://*`
- **Localhost (dev)**: `http://localhost:*`
- **Production**: Configurable via `CORS_ALLOWED_ORIGINS` environment variable

### Configuration
```javascript
// packages/relay-server/src/middleware/cors.ts
- Allows POST requests to /annotations endpoint
- Exposes custom headers: X-Request-Id, X-Preview-Url
- Credentials included for future auth support
```

### Testing
```bash
# Test Chrome extension access
curl -X OPTIONS http://localhost:8787/annotations \
  -H "Origin: chrome-extension://abcdefghijklmnop" \
  -H "Access-Control-Request-Method: POST" \
  -i
```

## Tunnel Server CORS (Port 9876)

The tunnel server handles PM browser connections and P2P signaling.

### Allowed Origins
- **Subdomains**: `https://*.wingmanux.com` (e.g., ghost-whiskey.wingmanux.com)
- **Root domain**: `https://wingmanux.com`, `https://www.wingmanux.com`
- **Localhost (dev)**: `http://localhost:*`, `http://127.0.0.1:*`
- **Custom origins**: Via `CORS_ALLOWED_ORIGINS` environment variable

### Configuration
```javascript
// packages/tunnel-server/src/middleware/cors.ts
- Supports WebSocket upgrade headers
- Exposes P2P status headers: X-P2P-Status, X-Connection-Mode
- Credentials required for session management
```

### Testing
```bash
# Test subdomain access
curl -X OPTIONS http://localhost:9876/api/sessions \
  -H "Origin: https://ghost-whiskey.wingmanux.com" \
  -H "Access-Control-Request-Method: POST" \
  -i
```

## Security Features

### 1. Origin Validation
- Strict origin checking with wildcard support for subdomains
- Separate validation for WebSocket connections
- Rejected origins are logged for debugging

### 2. Content Security Policy (CSP)
Static assets served with CSP headers:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  connect-src 'self' ws: wss:;
  frame-src 'self' http://localhost:* https://*.wingmanux.com
```

### 3. Secure postMessage
The iframe proxy uses origin validation instead of wildcard:
```javascript
// Send to specific origin, not '*'
window.parent.postMessage(data, parentOrigin);

// Validate incoming messages
if (!isOriginAllowed(event.origin)) {
  console.warn('Ignoring message from untrusted origin');
  return;
}
```

## Environment Variables

### CORS_ALLOWED_ORIGINS
Comma-separated list of additional allowed origins:
```bash
export CORS_ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"
```

### NODE_ENV
- `development`: Enables localhost origins
- `production`: Restricts to configured origins only

## Browser Extension Testing

Use the included test page to verify CORS configuration:

1. Open `test-cors.html` in a browser
2. Click buttons to test each endpoint
3. Verify green success messages

For Chrome extension context testing:
1. Load the extension from `packages/chrome-extension/dist`
2. Open the extension popup or options page
3. Check console for CORS-related errors

## WebSocket CORS

WebSocket connections don't use standard CORS, but we validate origins:

```javascript
// packages/tunnel-server/src/middleware/cors.ts
export function validateWebSocketOrigin(req): boolean {
  const origin = req.headers.origin;
  // Validation logic matching CORS config
}
```

## Common Issues

### "CORS policy: No 'Access-Control-Allow-Origin'"
- Check that the origin is in the allowed list
- Verify NODE_ENV is set correctly for development
- Check server logs for rejected origin warnings

### "CORS preflight failed"
- Ensure OPTIONS method is handled
- Check Access-Control-Allow-Headers includes all requested headers
- Verify Access-Control-Max-Age is set for caching

### WebSocket connection fails
- WebSocket uses origin validation, not CORS
- Check browser console for connection errors
- Verify subdomain is correctly formatted

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure `CORS_ALLOWED_ORIGINS` for your domains
3. Use HTTPS for all production origins
4. Monitor logs for rejected origins
5. Consider rate limiting for public endpoints

## Security Best Practices

1. **Never use wildcard (*) for Access-Control-Allow-Origin in production**
2. **Always validate message origins in postMessage handlers**
3. **Use credentials only when necessary**
4. **Implement rate limiting on public endpoints**
5. **Log and monitor rejected origins**
6. **Keep CSP headers restrictive**
7. **Use HTTPS in production**

## Testing Checklist

- [ ] Chrome extension can POST to relay server
- [ ] Firefox extension can POST to relay server
- [ ] PM browser can connect via WebSocket to tunnel server
- [ ] Subdomains are properly validated
- [ ] Rejected origins are logged
- [ ] CSP headers are present on static assets
- [ ] postMessage uses specific origins, not wildcards
- [ ] WebSocket connections validate origins
- [ ] Preflight caching works (Access-Control-Max-Age)
- [ ] Credentials work when needed