# Wingman Tunnel Integration Test Plan

## Overview
This test plan covers the tunnel functionality integration between the Chrome Extension, Relay Server, and Tunnel Server for the Wingman UX feedback system.

## Test Environment Setup

### Prerequisites
- Node.js installed
- Chrome browser with developer mode enabled
- All dependencies installed (`npm install`)
- Services can be started with `npm run dev`

### Test Data
- Demo App running on port 3000
- Preview UI running on port 3001
- Relay Server running on port 8787

## Test Cases

### 1. Relay Server Tunnel Management

#### 1.1 Create New Tunnel
**Steps:**
1. Start relay server: `cd packages/relay-server && npm run dev`
2. Create tunnel: `curl -X POST http://localhost:8787/tunnel/create -H "Content-Type: application/json" -d '{"targetPort": 3000}'`
3. Verify response contains `sessionId`, `tunnelUrl`, and `status: "active"`

**Expected Result:**
- Returns JSON with format: `https://{sessionId}.wingmanux.com`
- Tunnel status shows as active
- Connection mode is "relay"

#### 1.2 Automatic Cleanup of Old Tunnels
**Steps:**
1. Create first tunnel for port 3000
2. Note the sessionId
3. Create second tunnel for same port 3000
4. Check tunnel status: `curl http://localhost:8787/tunnel/status`

**Expected Result:**
- Only one tunnel exists for port 3000
- New tunnel has different sessionId
- Old tunnel was automatically cleaned up

#### 1.3 Multiple Ports Support
**Steps:**
1. Create tunnel for port 3000
2. Create tunnel for port 3001
3. Check status: `curl http://localhost:8787/tunnel/status`

**Expected Result:**
- Both tunnels are active
- Each has unique sessionId
- Different ports can have simultaneous tunnels

#### 1.4 Stop Tunnel
**Steps:**
1. Create a tunnel and note sessionId
2. Stop tunnel: `curl -X DELETE http://localhost:8787/tunnel/stop -H "Content-Type: application/json" -d '{"sessionId": "SESSION_ID"}'`
3. Verify tunnel is removed from status

**Expected Result:**
- Tunnel successfully stopped
- No longer appears in status endpoint

### 2. Chrome Extension Tunnel UI

#### 2.1 Extension Installation
**Steps:**
1. Build extension: `cd packages/chrome-extension && npm run build:dev`
2. Load unpacked extension from `packages/chrome-extension/dist/development`
3. Pin extension to toolbar

**Expected Result:**
- Extension loads without errors
- Icon appears in toolbar
- Popup opens when clicked

#### 2.2 Create Tunnel from Extension
**Steps:**
1. Open extension popup
2. Ensure relay server URL is set to `http://localhost:8787`
3. Click "Detect Local Server"
4. Enter port or use detected port
5. Click "Start Live Sharing"

**Expected Result:**
- Status changes to "Active"
- Tunnel URL displayed (format: `https://{id}.wingmanux.com`)
- QR code button appears
- Copy URL button works

#### 2.3 Error Handling - Server Not Running
**Steps:**
1. Stop relay server
2. Try to create tunnel from extension
3. Observe error message

**Expected Result:**
- Error: "Cannot connect to relay server. Make sure it's running (npm run dev)"
- UI remains functional
- Can retry after starting server

#### 2.4 Error Handling - Invalid Port
**Steps:**
1. Enter invalid port (e.g., 99999)
2. Click "Start Live Sharing"

**Expected Result:**
- Error: "Invalid port number. Please enter a valid port (1-65535)"
- Form remains usable

#### 2.5 Stop Tunnel from Extension
**Steps:**
1. Create an active tunnel
2. Click "Stop Sharing" button
3. Verify UI updates

**Expected Result:**
- Status changes to "Inactive"
- Tunnel URL is cleared
- Button changes back to "Start Live Sharing"

#### 2.6 Persistent Tunnel State
**Steps:**
1. Create a tunnel
2. Close extension popup
3. Reopen extension popup

**Expected Result:**
- Tunnel state is preserved
- Shows active tunnel with correct URL
- Can still stop the tunnel

### 3. Tunnel Functionality

#### 3.1 Basic HTTP Proxying
**Steps:**
1. Start demo app: `npm run dev`
2. Create tunnel for port 3000
3. Access tunnel URL in browser: `https://{sessionId}.wingmanux.com`

**Expected Result:**
- Demo app loads successfully
- All assets load (CSS, JS, images)
- No mixed content warnings

#### 3.2 Vite HMR Support
**Steps:**
1. Create tunnel for Vite dev server
2. Access tunnel URL
3. Make a code change in source files
4. Observe hot reload

**Expected Result:**
- HMR connects successfully
- Changes reflect without page reload
- No WebSocket connection errors

#### 3.3 CORS and Headers
**Steps:**
1. Create tunnel for API server
2. Make cross-origin request to tunnel URL
3. Check response headers

**Expected Result:**
- CORS headers properly forwarded
- Custom headers preserved
- Cookies work correctly

### 4. QR Code Functionality

#### 4.1 Generate QR Code
**Steps:**
1. Create tunnel in extension
2. Click QR code button
3. Scan QR code with mobile device

**Expected Result:**
- QR code modal appears
- QR code is scannable
- Mobile device can access tunnel URL

#### 4.2 Copy Tunnel URL
**Steps:**
1. Create tunnel
2. Click copy button next to URL
3. Paste in new browser tab

**Expected Result:**
- URL copied to clipboard
- Success message shown briefly
- Pasted URL works correctly

### 5. P2P Mode (Future Enhancement)

#### 5.1 Enable P2P Mode
**Steps:**
1. Create tunnel with P2P enabled: `curl -X POST http://localhost:8787/tunnel/create -H "Content-Type: application/json" -d '{"targetPort": 3000, "enableP2P": true}'`
2. Check connection mode in status

**Expected Result:**
- Initially shows "relay" mode
- Switches to "p2p" when peer connects
- Falls back to relay if P2P fails

### 6. Stress Testing

#### 6.1 Rapid Tunnel Creation
**Steps:**
1. Create and destroy tunnels rapidly (10 times)
2. Check for memory leaks or hanging connections
3. Verify final state is clean

**Expected Result:**
- No orphaned tunnels
- No memory leaks
- System remains responsive

#### 6.2 Long-Running Tunnel
**Steps:**
1. Create tunnel
2. Leave running for 30+ minutes
3. Test periodically that it still works

**Expected Result:**
- Tunnel remains active
- No timeout disconnections
- Automatic cleanup only after 30 min of inactivity

#### 6.3 Multiple Simultaneous Tunnels
**Steps:**
1. Create tunnels for ports 3000, 3001, 8080
2. Access all three tunnel URLs simultaneously
3. Generate traffic on all tunnels

**Expected Result:**
- All tunnels work independently
- No cross-contamination of traffic
- Performance remains acceptable

### 7. Edge Cases

#### 7.1 Network Interruption Recovery
**Steps:**
1. Create tunnel
2. Disconnect network briefly
3. Reconnect network
4. Test tunnel functionality

**Expected Result:**
- Tunnel reconnects automatically
- Or clear error state if reconnection fails
- Extension UI reflects correct state

#### 7.2 Server Restart During Active Tunnel
**Steps:**
1. Create tunnel
2. Stop and restart relay server
3. Check tunnel status in extension

**Expected Result:**
- Extension detects disconnection
- Shows appropriate error state
- Can create new tunnel after restart

#### 7.3 Port Already in Use
**Steps:**
1. Start service on port 3000
2. Create tunnel for port 3000
3. Stop service on port 3000
4. Try to access tunnel

**Expected Result:**
- Tunnel created successfully when port is in use
- Returns 502 error when service stops
- Clear error message about upstream connection

## Regression Testing

After any code changes, run through this checklist:

- [ ] Extension builds without errors
- [ ] Extension loads in Chrome without errors
- [ ] Can create basic tunnel
- [ ] Can stop tunnel
- [ ] Tunnel URL format is consistent
- [ ] Error messages are helpful
- [ ] QR code generation works
- [ ] Multiple ports can have tunnels
- [ ] Old tunnels are cleaned up
- [ ] Vite dev servers work through tunnel

## Performance Benchmarks

### Expected Performance Metrics
- Tunnel creation: < 2 seconds
- Initial connection: < 3 seconds  
- Request latency overhead: < 100ms
- Throughput: > 10 Mbps
- Concurrent connections: > 100

### How to Measure
```bash
# Latency test
time curl -s https://{tunnel-id}.wingmanux.com > /dev/null

# Throughput test  
curl -w "@curl-format.txt" -o /dev/null -s https://{tunnel-id}.wingmanux.com/large-file

# Concurrent connections
for i in {1..100}; do curl https://{tunnel-id}.wingmanux.com & done
```

## Automated Testing

### Unit Tests
```bash
# Run relay server tests
cd packages/relay-server && npm test

# Run extension tests
cd packages/chrome-extension && npm test
```

### Integration Tests
```bash
# Run full integration test suite
npm run test:integration
```

### E2E Tests
```bash
# Run Playwright tests
npm run test:e2e
```

## Bug Reporting Template

When reporting issues, include:

1. **Environment:**
   - OS: 
   - Node version:
   - Chrome version:
   - Which services running:

2. **Steps to Reproduce:**
   - Detailed steps
   - Commands used
   - Settings/configuration

3. **Expected Behavior:**
   - What should happen

4. **Actual Behavior:**
   - What actually happened
   - Error messages
   - Screenshots if applicable

5. **Logs:**
   - Relay server logs
   - Browser console logs
   - Network tab screenshots

## Sign-off Criteria

The tunnel feature is considered ready when:

- [ ] All test cases pass
- [ ] No critical bugs remain
- [ ] Performance meets benchmarks
- [ ] Error messages are user-friendly
- [ ] Documentation is complete
- [ ] Code review completed
- [ ] Security review completed (no secrets exposed)
- [ ] Accessibility requirements met
- [ ] Cross-browser testing completed (Chrome, Edge, Brave)

---

**Last Updated:** August 23, 2025
**Version:** 1.0.0
**Author:** Wingman Development Team