# Phase 1: Tunnel Server Foundation

## Objective

Create the basic tunnel server infrastructure that can accept session requests and serve PM access pages. This phase establishes the foundation without P2P complexity.

## Deliverables

### 1. New Package: `packages/tunnel-server`

- Basic Express server with session management
- Static file serving for PM access pages
- WebSocket server for future signaling
- Fly.io deployment configuration

### 2. Session Management System

- Create/retrieve tunnel sessions
- Generate unique session IDs
- Basic session storage (in-memory for Phase 1)
- Session cleanup and expiration

### 3. PM Access Page

- Simple HTML page served at `session-{id}.wingmanux.com`
- Basic connection status UI
- Placeholder for tunnel connection logic

## File Structure

```
packages/tunnel-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── session-manager.ts    # Session tracking and routing
│   ├── routes/
│   │   ├── sessions.ts       # Session API endpoints
│   │   └── static.ts         # Static file serving
│   └── static/
│       ├── session.html      # Page served to PM
│       ├── styles.css        # Basic styling
│       └── client.js         # Placeholder client script
├── package.json
├── Dockerfile
├── fly.toml                  # Fly.io deployment config
└── README.md
```

## Implementation Details

### Session Manager

```typescript
interface TunnelSession {
  id: string;
  developerId: string;
  targetPort: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'active' | 'expired';
}

class SessionManager {
  createSession(developerId: string, port: number): string;
  getSession(sessionId: string): TunnelSession | null;
  updateSessionStatus(sessionId: string, status: TunnelSession['status']): void;
  cleanupExpiredSessions(): void;
}
```

### API Endpoints

- `POST /api/sessions` - Create new tunnel session
- `GET /api/sessions/:id` - Get session details
- `GET /session/:id` - Serve PM access page

### PM Access Page

Simple HTML that shows:

- Connection status
- Basic branding
- Placeholder for app iframe
- Error states

## Testing Strategy

### Unit Tests

- Session manager CRUD operations
- Session expiration logic
- API endpoint responses

### Integration Tests

- Session creation flow
- Static file serving
- WebSocket connection establishment

### Manual Testing

1. Deploy to Fly.io
2. Create session via API
3. Access `session-{id}.wingmanux.com` in browser
4. Verify page loads with correct session info

## Deployment

### Fly.io Configuration

```toml
app = "wingman-tunnel"
primary_region = "lax"

[http_service]
  internal_port = 8080
  force_https = true

[env]
  NODE_ENV = "production"
```

### Domain Setup

- Configure `*.wingmanux.com` wildcard DNS
- Point to Fly.io app

## Acceptance Criteria

✅ PM can access unique URL (session-abc123.wingmanux.com)  
✅ Session page loads with basic UI  
✅ Sessions are created and tracked properly  
✅ Expired sessions are cleaned up  
✅ Server deployed successfully on Fly.io  
✅ WebSocket server accepts connections

## Dependencies

- Express.js for HTTP server
- WebSocket library (ws)
- Basic HTML/CSS/JS for client
