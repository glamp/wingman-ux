# Wingman

A lightweight UX feedback assistant for capturing and sharing feedback from web applications.

## Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/wingman/wingman.git
cd wingman

# Install dependencies and build packages
npm install
npm run build
```

### 2. Add to Your React Project

Install the Wingman SDK in your React app:

```bash
npm install @wingman/sdk
```

Wrap your app with the WingmanProvider:

```jsx
import { WingmanProvider } from '@wingman/sdk';

function App() {
  return (
    <WingmanProvider config={{ enabled: true }}>
      {/* Your app components */}
    </WingmanProvider>
  );
}
```

### 3. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `packages/chrome-extension/dist` folder

### 4. Start the Wingman Server

Run the Wingman server to collect feedback:

```bash
# Install globally
npm install -g wingman

# Start the server
wingman serve

# Or use npx (no global install)
npx wingman serve

# Custom port/host
wingman serve --port 3000 --host 0.0.0.0
```

The server provides:
- **HTTP API** on port 8787 for Chrome extension
- **MCP tools** via HTTP for Claude Code integration

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

1. Open Claude Code settings
2. Navigate to MCP Servers section
3. Add the following configuration:

```json
{
  "wingman": {
    "transport": "sse",
    "url": "http://localhost:8787/mcp"
  }
}
```

Or add it manually to your MCP configuration file:

```json
{
  "mcpServers": {
    "wingman": {
      "transport": "sse",
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

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

## Development

```bash
# Start all services in development mode
npm run dev

# Check service status
npm run dev:status

# Stop all services
npm run dev:stop
```

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

## License

MIT