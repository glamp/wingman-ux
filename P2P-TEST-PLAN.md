# P2P WebRTC Manual Test Plan

## Overview
This test plan walks you through manually testing the P2P WebRTC functionality across multiple machines. You'll test both successful P2P connections and fallback to relay mode.

## Architecture Recap

```
Developer Machine → Relay Server → Tunnel Server ← PM Browser
                     ↓                    ↓
                    P2P Host ←────────→ P2P Client
                   (Node.js)          (Browser JS)
```

- **Relay Mode**: All traffic goes through tunnel server
- **P2P Mode**: Direct connection between developer and PM browser
- **Automatic Fallback**: If P2P fails, falls back to relay

## Prerequisites

### Machine Setup
- **Machine 1 (Developer)**: Your development machine with the app running
- **Machine 2 (PM)**: Another computer/laptop/tablet with a modern browser
- **Both machines**: Should be on the same network for best P2P success

### Software Requirements
1. Node.js 18+ on developer machine
2. Chrome/Firefox/Safari on PM machine
3. The tunnel server deployed (or running locally for testing)

## Test Setup

### Step 1: Start Tunnel Server (if testing locally)
```bash
# On developer machine or separate server
cd packages/tunnel-server
npm run dev

# Note the URL (e.g., http://localhost:9876)
```

### Step 2: Start Your Local App
```bash
# On developer machine - start whatever app you want to tunnel
# For example, a simple React app:
npx create-react-app test-app
cd test-app
npm start
# Running on http://localhost:3000
```

### Step 3: Start Relay Server with P2P
```bash
# On developer machine
cd packages/relay-server
npm run dev

# In another terminal, create a tunnel session:
npx wingman tunnel --port 3000

# You'll see output like:
# 🚀 Creating tunnel session...
# ✅ Tunnel established!
# 
# Session URL: http://ghost-whiskey.localhost:9876
# or for production: https://ghost-whiskey.wingmanux.com
# 
# Share this URL with your PM to access your local app
# P2P: Enabled (will attempt direct connection)
```

## Test Scenarios

### Test 1: Successful P2P Connection (Same Network)

**Setup**: Both machines on same WiFi/LAN

1. **Developer Machine**:
   - Start tunnel as above
   - Watch console for: `[P2PHost] P2P connection established`

2. **PM Machine**:
   - Open the session URL in browser
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for these messages:
     ```
     [P2P] Initializing P2P client as initiator
     [P2P] Peer connection established
     [ConnectionMonitor] P2P connection established
     ```

3. **Verify P2P is Working**:
   - In PM browser, look for "P2P" badge (green)
   - Check connection stats on the page
   - Navigate through the app - should be very responsive
   - In DevTools Network tab, requests should NOT go to tunnel server

4. **Expected Behavior**:
   - Connection established in 2-5 seconds
   - Very low latency (<50ms typical on LAN)
   - All app features work normally
   - No data going through tunnel server

### Test 2: P2P Fallback (Different Networks)

**Setup**: Machines on different networks (e.g., one on WiFi, one on mobile hotspot)

1. **Developer Machine**:
   - Start tunnel as before
   - Watch for: `[P2PHost] Failed to initialize P2P`

2. **PM Machine**:
   - Open session URL
   - Watch console for:
     ```
     [P2P] Initializing P2P client...
     [ConnectionMonitor] P2P connection timeout, staying on relay
     [ConnectionMonitor] Using relay mode
     ```

3. **Verify Relay Mode**:
   - Look for "RELAY" badge (yellow/orange)
   - App still works but slightly higher latency
   - In Network tab, requests go through tunnel server

### Test 3: P2P Connection Loss & Recovery

**Setup**: Start on same network, then simulate network issues

1. **Establish P2P** (Test 1)

2. **Simulate Network Issue**:
   - Option A: Disconnect developer machine from WiFi briefly
   - Option B: Use browser DevTools to throttle network
   - Option C: Block WebRTC in browser settings

3. **Watch Fallback**:
   ```
   [ConnectionMonitor] P2P unhealthy, falling back to relay
   [IframeProxy] Using relay fallback
   ```

4. **Restore Network**:
   - Reconnect WiFi or remove throttling
   - System should attempt P2P again after cooldown

### Test 4: Connection Monitoring

1. **Open Connection Stats**:
   - Look for stats display on session page
   - Should show:
     - Mode: P2P or RELAY
     - Latency: XXms
     - Data sent/received
     - P2P success rate

2. **Monitor During Use**:
   - Stats update every 30 seconds
   - Watch latency changes
   - See data transfer amounts

### Test 5: Multiple PM Connections

**Setup**: Open session URL on multiple devices

1. **First PM**: Connect normally
2. **Second PM**: Open same URL on different device
3. **Expected**: Both should work, may share P2P connection

### Test 6: Browser Compatibility

Test on different browsers:

1. **Chrome**: Full P2P support expected
2. **Firefox**: P2P should work
3. **Safari**: May have limited P2P, falls back to relay
4. **Mobile browsers**: Often fallback to relay

## Debugging Guide

### Check P2P Status

**Developer Console**:
```bash
# Check if P2P host initialized
grep "P2PHost" in relay server logs

# Common messages:
"[P2PHost] Initializing P2P host"
"[P2PHost] P2P connection established"
"[P2PHost] Peer connection error"
```

**PM Browser Console**:
```javascript
// Check P2P client status
window.p2pClient?.isP2PConnected()

// Get connection stats
window.connectionMonitor?.getReport()

// Force fallback (for testing)
window.p2pClient?.cleanup()
```

### Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| P2P never connects | Always shows RELAY | Check firewall, ensure same network |
| High latency on P2P | >200ms on LAN | Check network congestion |
| Frequent fallbacks | Switches between P2P/RELAY | Network instability, check WiFi |
| No iframe loads | Blank page | Check tunnel server is running |
| CORS errors | Console errors | Ensure proper URL structure |

### Network Requirements for P2P

**Best case** (P2P works):
- Same local network
- No restrictive firewalls
- UDP not blocked
- STUN accessible

**Fallback case** (Relay only):
- Corporate networks
- Different networks
- Strict firewalls
- Mobile networks

## Performance Expectations

### P2P Mode
- **LAN**: 5-20ms latency
- **Same city**: 20-50ms latency
- **Data transfer**: Direct, no server bandwidth used
- **Connection time**: 2-5 seconds

### Relay Mode
- **Latency**: +50-200ms (depends on server location)
- **Data transfer**: Through tunnel server
- **Connection time**: <1 second
- **Reliability**: 100% (always works)

## Test Checklist

- [ ] P2P connects on same network
- [ ] Relay fallback works on different networks
- [ ] Connection monitor shows correct status
- [ ] Stats display updates properly
- [ ] Iframe loads and app functions
- [ ] Navigation works in iframe
- [ ] Form submissions work
- [ ] WebSocket connections work (if app uses them)
- [ ] File uploads work (if app has them)
- [ ] Performance acceptable in both modes
- [ ] Graceful handling of connection loss
- [ ] Browser compatibility verified

## Advanced Testing

### Test with Network Conditions

Use Chrome DevTools Network throttling:
1. Open DevTools → Network tab
2. Click throttling dropdown
3. Test with:
   - Fast 3G
   - Slow 3G
   - Offline (should show connection lost)

### Test with VPN

1. Developer on VPN, PM not (or vice versa)
2. Both on same VPN
3. Both on different VPNs

Expected: P2P fails, relay works

### Test Persistence

1. Establish P2P connection
2. Leave running for 30+ minutes
3. Verify connection stays stable
4. Check for memory leaks in DevTools

## Logging for Bug Reports

If you encounter issues, gather:

1. **Developer logs**:
```bash
# Copy relay server console output
# Include any error messages
```

2. **PM browser logs**:
```javascript
// In browser console:
console.save = function(data, filename){
  // ... (browser console export)
}
// Export and attach to bug report
```

3. **Network info**:
- Both machines' network type
- Firewall settings
- VPN status
- Browser versions

## Success Criteria

The P2P implementation is successful if:

1. ✅ P2P connects reliably on same network (>80% success)
2. ✅ Fallback to relay always works (100% reliability)
3. ✅ Latency improvement measurable with P2P
4. ✅ No data loss during mode switches
5. ✅ User experience remains smooth
6. ✅ Connection status clearly visible
7. ✅ Works across major browsers

## Next Steps

After testing:
1. Document any issues found
2. Note which network configurations work/don't work
3. Measure typical latencies in your environment
4. Provide feedback on user experience
5. Suggest improvements for connection reliability

---

## Quick Test Commands Reference

```bash
# Terminal 1: Start tunnel server (if local)
cd packages/tunnel-server && npm run dev

# Terminal 2: Start your app
cd my-app && npm start

# Terminal 3: Start relay with P2P
cd packages/relay-server && npm run dev

# Terminal 4: Create tunnel
npx wingman tunnel --port 3000

# Share the URL with PM machine!
```

Remember: The goal is seamless experience whether P2P works or not. Users shouldn't need to think about the connection mode - it should "just work"!