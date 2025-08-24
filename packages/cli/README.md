# Wingman CLI

Lightweight UX feedback assistant with local relay server and MCP support for Claude Code.

## Quick Start

```bash
npx wingman-cli serve
```

That's it! Server running at `http://localhost:8787` 🎉

### What You Get
- 🪶 Annotation API for receiving UI feedback  
- 🤖 MCP integration for Claude Code
- 👁️ Preview UI for viewing annotations

## Installation (Optional)

Only needed if you prefer a global install:

```bash
npm install -g wingman-cli
wingman serve
```

## Usage

```bash
wingman serve [options]

Options:
  -p, --port <number>     Port to listen on (default: 8787)
  -h, --host <address>    Host/address to bind to (default: localhost)
  --help                  Display help for command
```

## Features

- **Local Relay Server**: Receives UI feedback annotations from the Wingman Chrome Extension
- **MCP Integration**: Built-in Model Context Protocol support for Claude Code
- **Preview UI**: Web interface for viewing captured annotations
- **Zero Config**: Works out of the box with sensible defaults
- **Lightweight**: Minimal dependencies, fast startup

## Chrome Extension

The Wingman CLI works with the [Wingman Chrome Extension](https://chrome.google.com/webstore/detail/wingman) to capture UI feedback.

1. Install the Chrome Extension
2. Start the relay server: `npx wingman serve`
3. Click the Wingman icon in Chrome to capture feedback
4. View annotations at `http://localhost:8787`

## Claude Code Integration

Add to your Claude Code settings:

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

Claude Code will automatically start the Wingman server when needed. This enables Claude Code to:
- List UI feedback annotations
- Review specific annotations with screenshots
- Process and fix UI issues automatically

## API Endpoints

- `POST /annotations` - Submit new annotation
- `GET /annotations/last` - Get most recent annotation
- `GET /annotations/:id` - Get specific annotation
- `GET /mcp` - MCP server endpoint (SSE)
- `GET /` - Preview UI

## Development

```bash
# Clone the repository
git clone https://github.com/glamp/wingman-attempt-4.git
cd wingman-attempt-4/packages/cli

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/glamp/wingman-attempt-4)
- [Chrome Extension](https://chrome.google.com/webstore/detail/wingman)
- [Documentation](https://github.com/glamp/wingman-attempt-4#readme)