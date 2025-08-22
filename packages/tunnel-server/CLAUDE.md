# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Development Commands
```bash
# Install dependencies
npm install

# Start development server (hot reload with tsx watch)
npm run dev

# Build TypeScript for production
npm run build

# Start production server (requires build)
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Testing Specific Components
```bash
# Run tests for specific file
npm test src/__tests__/session-manager.test.ts

# Run tests matching pattern
npm test -- -t "SessionManager"

# Debug tests with verbose output
npm test -- --reporter=verbose
```

## Architecture Overview

The tunnel server is a WebSocket-based signaling server for establishing P2P connections between developers and product managers. It manages session lifecycle, serves PM interface pages, and facilitates WebRTC-style connection negotiation.

### Core Components

1. **Session Manager** (`src/session-manager.ts`)
   - In-memory session storage with Map<string, TunnelSession>
   - Aviation-themed session ID generation (e.g., "ghost-whiskey", "maverick-alpha")
   - 24-hour TTL with automatic cleanup every minute
   - Session states: pending → active → expired

2. **Express Server** (`src/index.ts`)
   - Port 9876 (configurable via PORT env var)
   - WebSocket server on `/ws` path
   - 25MB JSON body limit for future payload handling
   - CORS enabled for browser access
   - Graceful shutdown handlers (SIGTERM/SIGINT)

3. **API Routes** (`src/routes/sessions.ts`)
   - `POST /api/sessions` - Create new session with developerId and targetPort
   - `GET /api/sessions/:id` - Retrieve session details
   - Returns consistent error shapes: `{ error: string, code?: string }`

4. **Static Routes** (`src/routes/static.ts`)
   - `GET /sessions/:id` - PM interface HTML page
   - `/static/*` - CSS/JS assets for PM interface
   - Beautiful gradient UI with real-time status updates

### Session Flow

```
1. Developer creates session → Gets aviation callsign URL
2. PM visits session URL → Sees beautiful waiting page
3. WebSocket connects → Real-time status updates
4. Developer connects → Session becomes active
5. 24 hours pass → Session expires and gets cleaned up
```

### WebSocket Protocol

Messages are JSON with `type` field:
- `connected` - Initial handshake
- `register_session` - Associate WebSocket with session
- `session_update` - Session status change
- `ping/pong` - Keep-alive
- `error` - Error notifications

## Key Technical Details

### Session ID Generation
Uses two arrays of aviation-themed words:
- **Callsigns**: maverick, ghost, phantom, viper, lightning, etc.
- **NATO Phonetic**: alpha, bravo, charlie, delta, echo, etc.
- Format: `{callsign}-{phonetic}` (e.g., "phantom-delta")

### Error Handling
All errors return consistent JSON structure:
```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common error codes:
- `INVALID_REQUEST` - Missing required fields
- `INVALID_PORT` - Port number out of range
- `SESSION_NOT_FOUND` - Session doesn't exist
- `INTERNAL_ERROR` - Server-side error

### Health Monitoring
- `/health` endpoint returns server status and active session count
- Docker health check runs every 30 seconds
- Automatic cleanup of expired sessions every 60 seconds

## Testing Strategy

### Unit Tests
- `session-manager.test.ts` - Session CRUD operations, ID generation, expiry
- Use Vitest with Node environment
- No mocking - test real implementations

### Integration Tests
- `api.test.ts` - HTTP endpoints with Supertest
- Test actual Express server with dynamic ports
- Verify error responses and status codes

### Test Patterns
```typescript
// Use dynamic ports for parallel test execution
const server = app.listen(0);
const port = (server.address() as any).port;

// Clean up in afterEach
afterEach(() => {
  server.close();
});
```

## Deployment

### Docker Build
```bash
# Build image
docker build -t wingman-tunnel .

# Run locally
docker run -p 9876:9876 wingman-tunnel
```

### Fly.io Deployment
```bash
# Deploy to production
fly deploy

# Check logs
fly logs

# Scale horizontally (requires persistent session storage)
fly scale count=3
```

### Environment Variables
- `PORT` - Server port (default: 9876, 0 for tests)
- `NODE_ENV` - Environment (development/production/test)

## Future Considerations

### Phase 2+ Enhancements
- Redis/PostgreSQL for session persistence (currently in-memory)
- Authentication with API keys
- Rate limiting on session creation
- Prometheus metrics integration
- Multiple server instances with shared state

### Security Notes
- No authentication in Phase 1 (add in Phase 2)
- CORS enabled for all origins (restrict in production)
- 25MB body limit prevents memory exhaustion
- Session IDs are random but not cryptographically secure

## Common Development Tasks

### Adding New API Endpoint
1. Create route handler in `src/routes/`
2. Add to router in appropriate file
3. Write integration test in `src/__tests__/`
4. Update this documentation

### Modifying Session Logic
1. Update `SessionManager` class
2. Run unit tests to verify: `npm test session-manager`
3. Check integration tests still pass
4. Consider backward compatibility for existing sessions

### Debugging WebSocket Issues
1. Check browser console for connection errors
2. Server logs show all WebSocket events
3. Use `wscat` for manual testing: `wscat -c ws://localhost:9876/ws`
4. Verify session exists before registration