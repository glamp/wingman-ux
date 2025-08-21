# Phase 3: P2P WebRTC

## Objective
Add peer-to-peer WebRTC functionality to enable direct browser-to-browser connections, reducing latency and server load. Falls back to relay when P2P fails.

## Deliverables

### 1. WebRTC Signaling Server
- STUN/TURN server coordination
- Offer/answer exchange
- ICE candidate relay
- Connection state management

### 2. P2P Client (Browser Side)
- WebRTC data channel setup
- HTTP request tunneling over data channels
- Service Worker for request interception
- Automatic fallback to relay

### 3. P2P Host (Relay Server Side) 
- WebRTC peer connection from Node.js
- HTTP server proxy over data channels
- Connection monitoring and fallback logic

## File Structure

```
packages/tunnel-server/src/
├── p2p-signaling.ts         # WebRTC signaling server
├── stun-coordination.ts     # STUN server management
└── connection-monitor.ts    # P2P connection health

packages/tunnel-server/static/
├── p2p-client.js           # Browser P2P client
├── service-worker.js       # HTTP request interception
└── webrtc-utils.js         # WebRTC helper functions

packages/relay-server/src/tunnel/
├── p2p-host.ts             # Node.js P2P host
├── webrtc-adapter.ts       # WebRTC Node.js adapter
└── fallback-manager.ts     # P2P -> relay fallback
```

## Implementation Details

### WebRTC Signaling Protocol
```typescript
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'connection-state';
  sessionId: string;
  from: 'host' | 'client';
  data: RTCSessionDescription | RTCIceCandidate | ConnectionState;
}

class P2PSignalingServer {
  private connections = new Map<string, SignalingConnection>();
  
  // Handle signaling between host and client
  handleSignalingMessage(ws: WebSocket, message: SignalingMessage): void;
  
  // Coordinate P2P connection establishment
  coordinateConnection(sessionId: string): Promise<boolean>;
  
  // Monitor connection health
  monitorConnection(sessionId: string): void;
}
```

### P2P Client (Browser)
```typescript
class P2PClient {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel;
  private serviceWorker: ServiceWorker;
  
  // Establish P2P connection
  async connect(sessionId: string): Promise<boolean> {
    try {
      await this.createPeerConnection();
      await this.exchangeSignaling(sessionId);
      await this.waitForConnection();
      this.setupServiceWorker();
      return true;
    } catch (error) {
      console.log('P2P failed, falling back to relay');
      return false;
    }
  }
  
  // Send HTTP request over data channel
  async sendRequest(request: Request): Promise<Response> {
    const requestData = await this.serializeRequest(request);
    this.dataChannel.send(JSON.stringify(requestData));
    return this.waitForResponse();
  }
}
```

### Service Worker for Request Interception
```typescript
// service-worker.js
self.addEventListener('fetch', (event) => {
  // Only intercept requests to the app, not assets
  if (event.request.url.includes('/app/')) {
    event.respondWith(handleP2PRequest(event.request));
  }
});

async function handleP2PRequest(request: Request): Promise<Response> {
  if (window.p2pClient && window.p2pClient.isConnected()) {
    // Send through P2P data channel
    return window.p2pClient.sendRequest(request);
  } else {
    // Fallback to normal fetch (relay mode)
    return fetch(request);
  }
}
```

### P2P Host (Node.js)
```typescript
class P2PHost {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel;
  private localPort: number;
  
  // Accept P2P connection from browser
  async acceptConnection(sessionId: string, localPort: number): Promise<boolean> {
    this.localPort = localPort;
    
    try {
      await this.createPeerConnection();
      await this.handleSignaling(sessionId);
      this.setupDataChannelHandler();
      return true;
    } catch (error) {
      console.log('P2P host failed, using relay mode');
      return false;
    }
  }
  
  // Handle incoming HTTP requests from data channel
  private async handleDataChannelMessage(event: MessageEvent): Promise<void> {
    const request = JSON.parse(event.data);
    const response = await this.forwardToLocalhost(request);
    this.dataChannel.send(JSON.stringify(response));
  }
}
```

## Connection Flow

### Successful P2P Flow
```
1. PM opens session-abc123.wingman.dev
2. Browser loads P2P client JavaScript
3. P2P client connects to signaling server
4. Developer's relay server creates P2P host
5. WebRTC offer/answer exchange via signaling
6. Direct data channel established
7. Service Worker intercepts HTTP requests
8. Requests sent directly to developer via data channel
9. No server relay needed
```

### P2P Failure Fallback
```
1. P2P connection attempt fails (NAT/firewall)
2. Browser automatically falls back to relay mode
3. HTTP requests go through tunnel server
4. Tunnel server forwards to developer
5. User experience unchanged (transparent fallback)
```

## STUN Server Configuration

### Free STUN Servers
```typescript
const stunServers = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
];

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: stunServers }
  ],
  iceCandidatePoolSize: 10
};
```

### Connection Monitoring
```typescript
class ConnectionMonitor {
  // Monitor P2P connection health
  monitorConnection(peerConnection: RTCPeerConnection): void {
    peerConnection.addEventListener('connectionstatechange', () => {
      if (peerConnection.connectionState === 'failed') {
        this.triggerFallback();
      }
    });
    
    // Periodic health checks
    setInterval(() => this.checkConnectionHealth(), 30000);
  }
  
  // Switch to relay when P2P fails
  private triggerFallback(): void {
    window.p2pClient = null;
    console.log('Switching to relay mode');
    // Service Worker will automatically use fetch fallback
  }
}
```

## Testing Strategy

### P2P Connection Tests
```typescript
describe('P2P Connection', () => {
  it('establishes WebRTC connection', async () => {
    const client = new P2PClient();
    const host = new P2PHost();
    
    // Simulate signaling exchange
    const connected = await Promise.all([
      client.connect('test-session'),
      host.acceptConnection('test-session', 3000)
    ]);
    
    expect(connected).toBe([true, true]);
  });
  
  it('handles HTTP requests over data channel', async () => {
    // Setup P2P connection
    // Send HTTP request through data channel
    // Verify response
  });
  
  it('falls back to relay on P2P failure', async () => {
    // Simulate P2P failure
    // Verify automatic fallback to relay
  });
});
```

### Network Simulation Tests
- Test with various NAT configurations
- Simulate firewall blocking
- Test connection drops and recovery
- Verify fallback timing

### Browser Compatibility Tests
- Chrome/Chromium WebRTC support
- Firefox WebRTC differences
- Safari WebRTC limitations
- Service Worker compatibility

## Performance Monitoring

### Metrics to Track
```typescript
interface P2PMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failureRate: number;
  averageConnectionTime: number;
  dataChannelLatency: number;
  fallbackActivations: number;
}
```

### Connection Analytics
- P2P success rate by network type
- Common failure reasons
- Latency improvements vs relay
- Data transfer statistics

## Deployment Configuration

### Feature Flags
```env
P2P_ENABLED=true
P2P_TIMEOUT_MS=10000
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun.cloudflare.com:3478
```

### Graceful Degradation
- P2P disabled for unsupported browsers
- Automatic retry logic for connection failures
- Clear user feedback for connection status

## Security Considerations

### Data Channel Security
- All WebRTC connections use DTLS encryption
- No sensitive data stored in client JavaScript
- Session IDs are temporary and expire

### Service Worker Scope
- Limit Service Worker to app paths only
- Avoid intercepting authentication endpoints
- Clean unregistration on session end

## Acceptance Criteria

✅ P2P connection established in optimal network conditions  
✅ HTTP requests flow through data channels correctly  
✅ WebSocket messages work over P2P  
✅ Automatic fallback to relay when P2P fails  
✅ Service Worker intercepts requests properly  
✅ Connection state visible to user  
✅ P2P success rate >70% in testing  
✅ Latency improvement vs relay measurable  

## Performance Targets
- P2P connection establishment: <5 seconds
- Data channel latency: <20ms additional overhead
- Fallback time: <2 seconds
- P2P success rate: >60% across network types

## Dependencies
- WebRTC libraries (Node.js: wrtc or @roamhq/wrtc)
- Service Worker support
- STUN server access

## Estimated Timeline
**3-4 weeks**

## Next Phase
Phase 4 will integrate the tunnel functionality into the Chrome extension UI and add user experience improvements.