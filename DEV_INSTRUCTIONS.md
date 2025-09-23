# Development Environment Setup

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Everything
```bash
npm run dev
```

This starts:
- **API Server** → http://localhost:8787
- **Web App** → http://localhost:3001
- **Extension** → Building with hot reload
- **React Example** → http://localhost:5173

### 3. Load Chrome Extension

**Option A: Auto-load in Chrome (Recommended)**
```bash
# In a new terminal
cd packages/extension
npm run dev:chrome:personal
```

**Option B: Manual Load**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/dist/development/`

## Hot Reload is Working! 🔥

The Chrome extension will automatically reload when you change any file in:
- `packages/extension/src/`
- `packages/extension/manifests/`
- `packages/extension/config/`

No manual reload needed!

## Individual Services

If you only need specific parts:

```bash
npm run dev:api        # Just the API
npm run dev:webapp     # Just the web app
npm run dev:extension  # Just the extension
npm run dev:backend    # API only
npm run dev:frontend   # Webapp + Extension
```

## Troubleshooting

### Extension not hot reloading?
- Make sure you see `[HMR] Connected` in the console
- Check that port 9012 is not blocked
- Restart `npm run dev` if needed

### Port conflicts?
- API: 8787
- Webapp: 3001
- React Example: 5173
- Hot Reload WebSocket: 9012

### Chrome not loading extension?
- Make sure to build first: `cd packages/extension && npm run build:dev`
- Check that `dist/development/` folder exists
- Try closing all Chrome instances and restarting

## That's it!

Just run `npm run dev` and start coding. The extension will hot reload automatically.