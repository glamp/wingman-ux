# 🚀 Wingman

**Instant UI feedback for developers** — Capture, annotate, and fix UI issues in seconds.

[![npm version](https://img.shields.io/npm/v/wingman-cli.svg)](https://www.npmjs.com/package/wingman-cli)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Wingman?

Wingman is your AI copilot for UI development. Point, click, and get instant fixes for any UI issue. No more back-and-forth with screenshots in Slack. No more "it works on my machine."

### ✨ Key Features

- **🎯 Point & Click** — Select any element on the page and capture context
- **📸 Smart Screenshots** — Automatically includes React props, console logs, and network data
- **🤖 AI-Ready** — Perfectly formatted for Claude, Cursor, and GitHub Copilot
- **🔥 Hot Reload** — Chrome extension reloads instantly during development
- **🌐 Share Links** — Create shareable feedback links without any backend setup
- **🔒 Privacy First** — Run locally or use your own infrastructure

## 🎬 Quick Start (2 minutes)

```bash
# Install and run everything
npm install
npm run dev

# In another terminal, load the Chrome extension
cd packages/extension
npm run dev:chrome:personal
```

That's it! The extension hot-reloads when you change code. See [DEV_INSTRUCTIONS.md](DEV_INSTRUCTIONS.md) for details.

## 📦 Installation Options

### Option 1: Chrome Extension (Recommended)
Install from Chrome Web Store or load locally for development.

### Option 2: NPM Package
```bash
# Run without installing
npx wingman-cli serve

# Or install globally
npm install -g wingman-cli
wingman serve

# With tunnel for sharing
wingman serve --tunnel
```

### Option 3: React SDK
```bash
npm install @wingman/sdk
```

```jsx
import { WingmanProvider } from '@wingman/sdk';

function App() {
  return (
    <WingmanProvider apiUrl="http://localhost:8787">
      <YourApp />
    </WingmanProvider>
  );
}
```

## 🏗️ Architecture

```
wingman/
├── packages/
│   ├── api/          # Express server with WebSocket support
│   ├── extension/    # Chrome extension (Manifest V3)
│   ├── webapp/       # React dashboard
│   ├── sdk/          # React SDK for metadata extraction
│   └── cli/          # NPM CLI package
└── examples/
    └── react-app/    # Demo application
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- Chrome or Chromium browser
- npm 9+

### Environment Setup

The dev environment is pre-configured with hot reloading:

```bash
# Everything with hot reload
npm run dev

# Individual services
npm run dev:api        # API only (port 8787)
npm run dev:webapp     # Web app only (port 3001)
npm run dev:extension  # Extension only (with watchers)
```

### Chrome Extension Development

The extension includes:
- **Hot Reload** via Vite HMR on port 9012
- **Auto-rebuild** on file changes
- **Source maps** in development
- **React DevTools** integration

Load the extension:
```bash
cd packages/extension
npm run dev:chrome:personal  # Uses your Chrome profile
# OR
npm run dev:chrome:fresh     # Clean profile for testing
```

## 🎯 How It Works

1. **Capture** — Click any element on the page
2. **Annotate** — Add notes about the issue
3. **Context** — Automatically captures:
   - React component props & state
   - Console logs & errors
   - Network requests
   - Device & browser info
4. **Share** — Copy formatted output or create share link
5. **Fix** — Paste into your AI tool for instant solutions

## 🤝 Integration Examples

### Claude Code / Claude.ai
```markdown
# Paste captured feedback directly
![Screenshot](https://api.wingmanux.com/annotations/abc123/screenshot)

**Issue:** Button not aligned properly
**Component:** <Button variant="primary" />
**Props:** { disabled: false, loading: true }
```

### MCP Integration for Claude Code
```json
{
  "mcpServers": {
    "wingman": {
      "command": "npx",
      "args": ["wingman-cli", "serve"]
    }
  }
}
```

Available MCP tools:
- `wingman_list` - List all feedback
- `wingman_review` - Review specific annotation
- `wingman_delete` - Clean up processed items
- `wingman_fix_ui` - Automated fix workflow

### Cursor / GitHub Copilot
The extension formats output specifically for each AI tool's preferred format.

### Custom Templates
Create your own output templates for any workflow:
```javascript
{
  "template": "{{userNote}}\n![]({{screenshotUrl}})\n{{reactComponentName}}"
}
```

## 🚢 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run release:chrome   # Chrome extension
npm run release:cli      # NPM package
```

### Self-Hosted
```bash
docker run -p 8787:8787 wingman/wingman
```

### Tunnel Mode (Share with anyone)
```bash
wingman serve --tunnel
# Creates: https://ghost-alpha.wingmanux.com
```

## 📚 API Reference

### REST Endpoints
- `POST /annotations` — Submit feedback
- `GET /annotations/last` — Get latest annotation
- `GET /share/:token` — Access shared feedback
- `GET /health` — Server status

### WebSocket
- Connect to `/ws` for real-time updates
- Automatic reconnection with exponential backoff

### Storage
- Annotations: `./.wingman/annotations/:id.json`
- Sessions: `./.wingman/sessions/:id.json`
- Screenshots embedded as base64 in JSON

## 🐛 Troubleshooting

### Extension not hot-reloading?
```bash
# Check HMR connection
curl http://localhost:9012
# Should see WebSocket upgrade headers

# Restart dev server
npm run dev:restart
```

### Port conflicts?
Default ports:
- API: 8787
- Web: 3001
- React Example: 5173
- HMR: 9012

Change in `.env`:
```env
API_PORT=8788
WEBAPP_PORT=3002
HOT_RELOAD_EXTENSION_VITE_PORT=9013
```

### Chrome won't load extension?
```bash
# Build first
cd packages/extension
npm run build:dev

# Check manifest
cat dist/development/manifest.json

# Check for errors
chrome://extensions/ → Details → Errors
```

### Development Workflow
1. Fork the repo
2. Create feature branch
3. Make changes with hot reload
4. Run tests: `npm test`
5. Submit PR

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📄 License

MIT © Wingman Team

## 🙏 Acknowledgments

Built with:
- [Vite](https://vitejs.dev/) for blazing fast builds
- [React](https://react.dev/) for UI
- [Express](https://expressjs.com/) for the API
- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [MCP SDK](https://modelcontextprotocol.io/) for AI integration

---

<p align="center">
  <b>Stop describing bugs. Start fixing them.</b><br>
  <a href="https://wingmanux.com">wingmanux.com</a> •
  <a href="https://twitter.com/wingmanux">Twitter</a> •
  <a href="https://github.com/wingman/wingman">GitHub</a>
</p>
