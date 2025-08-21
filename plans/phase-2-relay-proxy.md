# Phase 2: Relay Proxy

## Objective
Implement HTTP/WebSocket relay functionality so PM can access developer's localhost through the tunnel server. This creates a working tunnel without P2P complexity.

## Deliverables

### 1. Relay Proxy Server
- HTTP request forwarding to developer's localhost
- WebSocket proxy support
- Header preservation for auth flows
- Response rewriting for proper domain handling

### 2. Tunnel Client (Relay Server Enhancement)
- Connect to tunnel server
- Register localhost port for forwarding
- Maintain persistent connection
- Handle reconnection logic

### 3. End-to-End Tunnel Flow
- Developer starts tunnel from relay server
- PM accesses session URL
- Traffic flows: PM → Tunnel Server → Relay Server → Localhost

## File Structure

```
packages/tunnel-server/src/
├── relay-proxy.ts            # HTTP/WS relay functionality
├── connection-manager.ts     # Manage developer connections
└── auth-preserving.ts        # Header/cookie preservation

packages/relay-server/src/tunnel/
├── tunnel-client.ts          # Connect to tunnel server
├── tunnel-routes.ts          # API endpoints
└── connection-handler.ts     # Handle tunnel connections
```

## Implementation Details

### Relay Proxy (Tunnel Server)
```typescript
class RelayProxy {
  // Forward HTTP requests to developer's machine
  async forwardRequest(
    req: Request, 
    sessionId: string, 
    path: string
  ): Promise<Response>;
  
  // Handle WebSocket connections
  setupWebSocketProxy(
    sessionId: string, 
    wsConnection: WebSocket
  ): void;
  
  // Preserve auth headers/cookies
  preserveAuthHeaders(req: Request): Headers;
  rewriteResponseHeaders(res: Response, tunnelDomain: string): Response;
}
```

### Connection Manager
```typescript
class ConnectionManager {
  private connections = new Map<string, WebSocket>();
  
  // Register developer's connection
  registerDeveloper(sessionId: string, ws: WebSocket): void;
  
  // Send HTTP request to developer
  async sendRequest(sessionId: string, request: ProxiedRequest): Promise<ProxiedResponse>;
  
  // Handle connection loss
  handleDisconnection(sessionId: string): void;
}
```

### Tunnel Client (Relay Server)
```typescript
class TunnelClient {
  private connection: WebSocket | null = null;
  private sessionId: string | null = null;
  
  // Start tunnel for specified port
  async startTunnel(port: number): Promise<string> {
    const sessionId = await this.registerSession(port);
    await this.connectToTunnelServer(sessionId);
    return `https://session-${sessionId}.wingman.dev`;
  }
  
  // Handle incoming requests from tunnel server
  private async handleIncomingRequest(request: ProxiedRequest): Promise<void> {
    const response = await this.forwardToLocalhost(request);
    this.sendResponse(response);
  }
}
```

## Auth Preservation Logic

### Header Forwarding
```typescript
const preservedHeaders = [
  'cookie',
  'authorization', 
  'x-csrf-token',
  'x-requested-with',
  'accept',
  'content-type'
];
```

### Cookie Domain Rewriting
```typescript
function rewriteCookieDomain(cookieHeader: string, tunnelDomain: string): string {
  return cookieHeader.replace(
    /domain=localhost(:\d+)?/gi, 
    `domain=${tunnelDomain}`
  );
}
```

### OAuth Redirect Handling
```typescript
function rewriteRedirectUrl(location: string, tunnelDomain: string): string {
  return location.replace(
    /https?:\/\/localhost:\d+/gi,
    `https://${tunnelDomain}`
  );
}
```

## API Enhancements

### Relay Server Routes
```typescript
// Start tunnel
app.post('/tunnel/start', async (req, res) => {
  const { port } = req.body;
  const tunnelUrl = await tunnelClient.startTunnel(port);
  res.json({ tunnelUrl, status: 'active' });
});

// Get tunnel status
app.get('/tunnel/status', (req, res) => {
  res.json({
    active: tunnelClient.isActive(),
    sessionId: tunnelClient.getSessionId(),
    connections: tunnelClient.getConnectionCount()
  });
});

// Stop tunnel
app.post('/tunnel/stop', (req, res) => {
  tunnelClient.stop();
  res.json({ status: 'stopped' });
});
```

### Tunnel Server Routes
```typescript
// Handle all proxied requests
app.all('/session/:sessionId/*', async (req, res) => {
  const { sessionId } = req.params;
  const path = req.params[0];
  
  try {
    const response = await relayProxy.forwardRequest(req, sessionId, path);
    res.status(response.status).send(response.body);
  } catch (error) {
    res.status(502).json({ error: 'Tunnel connection failed' });
  }
});
```

## Testing Strategy

### Unit Tests
- Header preservation logic
- Cookie domain rewriting
- URL rewriting for redirects
- Connection management

### Integration Tests
- End-to-end request flow
- WebSocket proxy functionality
- Auth flow preservation
- Error handling and reconnection

### Manual Testing
1. Start relay server with tunnel
2. Access tunnel URL from different browser
3. Test various app features:
   - Login/logout flows
   - API requests
   - WebSocket connections
   - File uploads
   - OAuth redirects

## Test Scenarios

### Basic HTTP Tunnel
```bash
# Terminal 1: Start a simple HTTP server
cd test-app && npm start # localhost:3000

# Terminal 2: Start Wingman relay server
npm run dev # localhost:8787

# Terminal 3: Start tunnel
curl -X POST http://localhost:8787/tunnel/start \
  -H "Content-Type: application/json" \
  -d '{"port": 3000}'

# Browser: Access returned tunnel URL
```

### Auth Flow Testing
- Create test app with Google OAuth
- Start tunnel
- Test complete OAuth flow through tunnel
- Verify cookies and redirects work correctly

## Deployment Considerations

### Environment Variables
```env
TUNNEL_SERVER_URL=wss://wingman-tunnel.fly.dev
TUNNEL_DOMAIN=wingman.dev
MAX_CONNECTIONS=100
```

### Error Handling
- Connection timeouts
- Developer disconnection
- Invalid session IDs
- Rate limiting

## Acceptance Criteria

✅ PM can access developer's localhost through tunnel URL  
✅ All HTTP methods (GET, POST, PUT, DELETE) work  
✅ WebSocket connections proxy correctly  
✅ Cookie-based auth sessions persist  
✅ OAuth redirects work through tunnel  
✅ File uploads/downloads function properly  
✅ Connection loss handled gracefully  
✅ Multiple concurrent sessions supported  

## Performance Targets
- Request latency: <100ms additional overhead
- WebSocket messages: <50ms additional latency
- Support 50+ concurrent sessions
- Handle 1000+ requests per minute

## Dependencies
- http-proxy or similar for request forwarding
- WebSocket library with proxy support
- URL parsing and rewriting utilities

## Estimated Timeline
**2-3 weeks**

## Next Phase
Phase 3 will add P2P WebRTC functionality to reduce latency and server load for direct connections.