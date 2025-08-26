# Local Tunnel Testing Guide

This guide walks through testing the Wingman tunnel functionality using your local development environment.

## Prerequisites

- Node.js and npm installed
- Chrome browser
- Two browser windows/profiles (one for Developer, one for PM)

## Setup

### 1. Start Local Services

```bash
# From repository root
npm install
npm run dev
```

This starts:
- **API Server** on `http://localhost:8787`
- **Webapp** on `http://localhost:3001`
- **Extension** build watcher
- **React demo app** on `http://localhost:5173`

Verify all services are running:
```bash
npm run dev:status
```

### 2. Load Chrome Extension

#### Option A: Automated (Recommended)
```bash
cd packages/extension
npm run dev:chrome:personal
```

#### Option B: Manual
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/dist` folder

## Testing Workflow

### Phase 1: Developer Setup (Local App)

1. **Open your local React app**
   - Navigate to `http://localhost:5173` in Chrome
   - This is your "development app" that PM wants to review

2. **Create a tunnel session**
   ```bash
   # In a new terminal
   curl -X POST http://localhost:8787/tunnel/sessions/create \
     -H "Content-Type: application/json" \
     -d '{"targetUrl": "http://localhost:5173"}'
   ```
   
   Note the `sessionId` returned (e.g., `ghost-alpha-1234`)

3. **Verify tunnel is active**
   - Visit `http://localhost:8787/tunnel/sessions`
   - Confirm your session appears with status "pending"

### Phase 2: PM Access (Remote User)

4. **Open a second browser window** (incognito or different profile)
   - Navigate to tunnel URL: `http://localhost:8787/tunnel/{sessionId}/*`
   - Example: `http://localhost:8787/tunnel/ghost-alpha-1234/`
   - You should see "Developer not connected" initially

### Phase 3: Connect Developer

5. **Start the tunnel connection** (in Developer's browser)
   ```bash
   # Connect your local app to the tunnel
   curl -X POST http://localhost:8787/tunnel/sessions/{sessionId}/connect
   ```

6. **Verify connection**
   - PM's browser should now show your React app
   - Check session status: `http://localhost:8787/tunnel/sessions/{sessionId}`
   - Status should be "active"

### Phase 4: Chrome Extension Testing

7. **In PM's tunneled view**
   - Press `Alt+Shift+W` to activate Wingman
   - Click on UI elements to select them
   - Add feedback notes
   - Click "Copy for Claude"

8. **Verify annotation was created**
   ```bash
   curl http://localhost:8787/annotations/last
   ```

9. **Test shareable link creation**
   - In extension popup, click "Create Share Link"
   - Copy the generated link
   - Open in a new tab to verify it loads the annotation

### Phase 5: WebSocket Testing (Advanced)

10. **Monitor WebSocket connections**
    ```bash
    # Watch API server logs for WebSocket activity
    npm run dev:api
    ```

11. **Test P2P signaling**
    - Developer and PM should establish P2P connection automatically
    - Check browser console for "P2P connection established"
    - Network tab should show WebRTC data channels

## Test Scenarios

### Scenario 1: Basic Tunnel Flow
- [ ] Create session
- [ ] Developer connects
- [ ] PM can access app through tunnel
- [ ] PM can interact with the app
- [ ] Session shows as "active"

### Scenario 2: Annotation Flow
- [ ] PM captures feedback with extension
- [ ] Annotation includes screenshot
- [ ] React component data captured (if applicable)
- [ ] Console logs included
- [ ] Network requests captured

### Scenario 3: Share Link Flow
- [ ] Create share link from annotation
- [ ] Share link loads correctly
- [ ] Share link shows preview
- [ ] "Copy for Claude" works on share page

### Scenario 4: Error Handling
- [ ] Tunnel handles developer disconnect gracefully
- [ ] Session cleanup after timeout (24 hours)
- [ ] Invalid session ID shows appropriate error
- [ ] CORS headers work correctly

### Scenario 5: Subdomain Testing (Optional)

If you want to test subdomain routing:

1. **Edit /etc/hosts**
   ```bash
   sudo nano /etc/hosts
   # Add:
   127.0.0.1   ghost-alpha-1234.localhost
   ```

2. **Access via subdomain**
   - Navigate to `http://ghost-alpha-1234.localhost:8787`
   - Should route to your tunneled app

## Debugging Tips

### Check Active Sessions
```bash
curl http://localhost:8787/api/sessions
```

### Monitor WebSocket Connections
Open Chrome DevTools → Network → WS tab

### View Server Logs
```bash
# In the terminal running npm run dev
# Look for blue (API) output
```

### Test Direct API Access
```bash
# Health check
curl http://localhost:8787/health

# MCP endpoint (for Claude Code)
curl http://localhost:8787/mcp/health
```

### Common Issues

1. **"Developer not connected"**
   - Ensure local app is running on the target port
   - Check WebSocket connection in developer tools
   - Verify session ID matches

2. **Extension not working**
   - Check extension is loaded and enabled
   - Verify permissions granted
   - Check console for errors

3. **CORS errors**
   - API server should handle CORS automatically
   - Check `CORS_ORIGIN` env variable if needed

4. **Port conflicts**
   - Check `.env` file for custom ports
   - Use `npm run dev:status` to see what's running
   - Kill stuck processes: `npm run dev:stop`

## Cleanup

After testing:
```bash
# Stop all services
npm run dev:stop

# Clean up test data (optional)
rm -rf packages/api/.wingman/annotations/*.json
rm -rf packages/api/.wingman/sessions/*.json
```

## Advanced Testing

### Load Testing
```bash
# Create multiple sessions
for i in {1..10}; do
  curl -X POST http://localhost:8787/tunnel/sessions/create \
    -H "Content-Type: application/json" \
    -d '{"targetUrl": "http://localhost:5173"}'
done
```

### WebSocket Stability
Keep tunnel open for extended period and monitor for:
- Connection drops
- Memory leaks
- Session timeout behavior

### Cross-Browser Testing
Test tunnel with:
- Chrome (primary)
- Edge (Chromium-based)
- Brave
- Opera

## Success Criteria

✅ Tunnel session created successfully  
✅ Developer can connect local app  
✅ PM can access app through tunnel  
✅ Chrome extension captures feedback  
✅ Annotations saved with screenshots  
✅ Share links work correctly  
✅ WebSocket connections stable  
✅ P2P fallback works when available  
✅ Session cleanup works after timeout  

---

For more details, see:
- [Chrome Extension Development](packages/extension/DEVELOPMENT.md)
- [API Documentation](packages/api/README.md)
- [Main README](README.md)