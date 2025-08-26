# Wingman

A lightweight UX feedback assistant for capturing and sharing feedback from web applications.

## Quick Start

### For Users (NPM Package)

```bash
# Start unified server (local mode)
npx wingman-cli serve

# Or with automatic tunnel for sharing
npx wingman-cli serve --tunnel
```

That's it! Your server is running at `http://localhost:8787` 🎉

### For Development

```bash
# Clone the repository
git clone https://github.com/glamp/wingman-ux.git
cd wingman-ux

# Install dependencies
npm install

# Start all services (API, webapp, extension, react-app)
npm run dev

# Check what's running
npm run dev:status

# Stop everything
npm run dev:stop
```

### What You Get
- 🪶 Unified server with built-in WebSocket support
- 🌐 Web interface for annotations, tunnels, and monitoring
- 🚇 Optional cloud tunnel for remote collaboration
- 🤖 MCP integration for Claude Code
- ✈️ Aviation-themed session IDs for easy sharing

### Next Steps

1. **Install Chrome Extension**
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/wingman) (coming soon)
   - Or [load unpacked](#development-setup) for development

2. **Optional: Add to Your React App**

```bash
npm install wingman-sdk
```

```jsx
import { WingmanProvider } from 'wingman-sdk';

function App() {
  return (
    <WingmanProvider config={{ enabled: true }}>
      {/* Your app components */}
    </WingmanProvider>
  );
}
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Chrome browser for extension testing

### Project Structure

```
wingman-ux/
├── packages/
│   ├── api/          # Backend server & tunnel management
│   ├── webapp/       # Web interface & landing pages
│   ├── extension/    # Chrome extension
│   ├── sdk/          # React SDK for web apps
│   └── cli/          # NPM CLI package
├── examples/
│   └── react-app/    # Demo React application
└── .env.defaults     # Default configuration
```

### Development Commands

```bash
# Start everything (API, webapp, extension, react-app)
npm run dev

# Start individual services
npm run dev:api        # API server only (port 8787)
npm run dev:webapp     # Web app only (port 3001)
npm run dev:extension  # Extension build watcher
npm run dev:react-app  # Example React app (port 5173)

# Utility commands
npm run dev:status     # Check what's running
npm run dev:stop       # Stop all services
npm run dev:restart    # Restart everything

# Build all packages
npm run build

# Run tests
npm test
```

### Load Chrome Extension for Development

1. Build the extension first:
   ```bash
   cd packages/extension
   npm run build
   ```

2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `packages/extension/dist` folder

### Local Subdomain Testing (Optional)

To test subdomain-based tunnels locally:

1. Edit `/etc/hosts` (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1   ghost-alpha.localhost
   127.0.0.1   maverick-bravo.localhost
   # Add more as needed
   ```

2. Access your sessions at `http://ghost-alpha.localhost:8787`

### 5. Capture Feedback

1. Click the Wingman extension icon in Chrome
2. Select an element or region on the page
3. Add your feedback notes
4. Submit to send to the relay server

The feedback is stored locally in `./.wingman/annotations/` and can be retrieved via:

```bash
# Get the last annotation
curl http://localhost:8787/annotations/last
```

## What Gets Captured

- Screenshot of the selected area
- CSS selectors for the element
- Console logs and errors
- Network request timings
- React component metadata (when available)
- Your feedback notes

## 🪶 Claude Code Integration

Wingman provides MCP (Model Context Protocol) tools for Claude Code to review and fix UI issues.

### Setup Claude Code

Add Wingman to your Claude Code settings:

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

That's it! Claude Code will automatically start the Wingman server when needed.

### Available MCP Tools

Once configured, Claude Code has access to:

- **`wingman_list()`** - List all UI feedback annotations
- **`wingman_review()`** - Get the latest annotation with full details
- **`wingman_delete(id)`** - Remove processed annotation

### Slash Commands

Use these commands in Claude Code:
- `/wingman` - Show all Wingman options
- `/wingman:list` - List all annotations
- `/wingman:review` - Review latest issue
- `/wingman:fix` - Fix UI issue with guided approach

### Example Workflow

1. **Start server**: `wingman serve`
2. **User reports issue** via Chrome extension
3. **In Claude Code**: "Use wingman to check for feedback"
4. **Claude** uses MCP tools to review annotations
5. **Claude** fixes the code and cleans up

### The Wingman Fix Flow

When using the `wingman_fix_ui` prompt, Claude will:
- 🔍 Analyze the screenshot and target element
- 🎯 Identify the specific UI issue
- 📝 Review React/HTML context
- 🔧 Generate and apply the fix
- ✅ Validate the changes
- 🗑️ Clean up the processed annotation

## Environment Configuration

Copy `.env.defaults` to `.env` to customize your local setup:

```bash
cp .env.defaults .env
```

Key configuration options:
- `API_PORT`: API server port (default: 8787)
- `WEBAPP_PORT`: Web app port (default: 3001)
- `TUNNEL_MODE`: local or remote
- `NODE_ENV`: development or production

See `.env.defaults` for all available options.

## Server Architecture

The Wingman server (`wingman serve`) provides a unified HTTP server with multiple endpoints:

```
http://localhost:8787/
├── /annotations       # Chrome extension posts feedback here
├── /annotations/last  # Get most recent annotation
├── /mcp              # Claude Code MCP endpoint (SSE)
├── /preview          # Preview UI for viewing feedback
└── /health           # Health check endpoint
```

All endpoints share the same storage (`./.wingman/annotations/`), ensuring consistency between Chrome extension feedback and Claude Code tools.

## Publishing to NPM

### Prerequisites

1. Login to npm:
```bash
npm login
```

2. Ensure you have publishing rights for:
- `wingman-cli` package
- `wingman-sdk` package (optional)

### Publishing Packages

```bash
# Publish all packages
./scripts/publish-npm.sh

# Publish only CLI
./scripts/publish-npm.sh --cli

# Publish only SDK
./scripts/publish-npm.sh --sdk

# Dry run (test without publishing)
npm run release:cli
cd release/cli
npm publish --dry-run
```

### Version Management

Update version in package.json before publishing:

```bash
cd packages/cli
npm version patch  # or minor/major
```

### After Publishing

Users can run immediately with:

```bash
# No installation needed!
npx wingman-cli serve

# SDK for React projects (optional)
npm install wingman-sdk
```

## License

MIT