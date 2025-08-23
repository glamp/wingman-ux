# Chrome Extension Development Setup Guide

This guide provides comprehensive setup instructions for developing the Wingman Chrome extension using both automated loading approaches.

## Overview

The Wingman Chrome extension supports two development workflows:

1. **Personal Chrome Development**: Uses your personal Chrome browser for quick iteration
2. **Playwright MCP Integration**: Provides programmatic browser automation for advanced testing

Both approaches eliminate the need for manual extension loading through Chrome's UI.

## Prerequisites

- Node.js 18+ and npm
- macOS (scripts are optimized for macOS, but concepts apply to other platforms)
- Chrome browser installed at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

## Quick Start

### 1. Initial Setup

```bash
# Navigate to the chrome extension package
cd packages/chrome-extension

# Install dependencies
npm install

# Build the extension for development
npm run build:dev
```

### 2. Choose Your Workflow

**For daily development work**:
```bash
npm run dev:chrome:personal
```

**For automated testing**:
```bash
npm run dev:playwright:setup  # One-time setup
npm run dev:playwright:test   # Run tests
```

## Personal Chrome Development Workflow

### Features
- Uses your existing Chrome profile with bookmarks, passwords, and sessions
- Automatically builds and launches Chrome with the extension loaded
- Supports file watching for automatic rebuilds
- Graceful Chrome process management

### Available Commands

```bash
# Quick start: Build and launch Chrome with extension
npm run dev:chrome:personal

# Development with auto-reload on file changes
npm run dev:chrome:watch

# Use fresh Chrome profile (temporary, no personal data)
npm run dev:chrome:fresh

# Combined: Start build watcher and Chrome launcher
npm run dev:full
```

### Command Options

The underlying script (`scripts/dev-chrome-personal.js`) supports these options:

```bash
node scripts/dev-chrome-personal.js --help

Options:
  --build-first    Build the extension before launching Chrome
  --fresh-profile  Use a temporary profile instead of personal profile
  --watch         Enable file watching for auto-reload
  --help          Show help message
```

### Workflow Steps

1. **Build Check**: Verifies extension build exists (or builds if `--build-first` is used)
2. **Chrome Management**: Closes existing Chrome processes gracefully
3. **Extension Loading**: Launches Chrome with `--load-extension` flag pointing to your built extension
4. **File Watching**: (Optional) Monitors source files for changes and triggers rebuilds

### Directory Structure

When using personal Chrome workflow:
```
packages/chrome-extension/
├── dist/development/          # Built extension (loaded by Chrome)
├── src/                      # Source files (watched for changes)
└── scripts/
    └── dev-chrome-personal.js # Chrome launcher script
```

## Playwright MCP Integration Workflow

### Features
- Programmatic browser automation through Claude Code
- Automated testing with screenshot capture and network monitoring
- Integration with Model Context Protocol for AI-assisted testing
- Perfect for regression testing and complex user flow validation

### Setup Process

```bash
# One-time setup: Install dependencies and create configuration
npm run dev:playwright:setup

# Alternative: Create config files only (no dependency installation)
npm run dev:playwright:config
```

### Available Commands

```bash
# Run extension tests through Playwright
npm run dev:playwright:test

# Interactive test development with UI
npm run dev:playwright:test:ui

# Run tests in headed mode (visible browser)
npm run test:playwright:headed
```

### Setup Components

The Playwright MCP setup creates:

```
packages/chrome-extension/
├── .mcp/
│   ├── server-config.json     # MCP server configuration
│   └── server.js             # MCP server startup script
├── playwright.config.ts      # Playwright test configuration
├── tests/
│   └── playwright/
│       ├── global-setup.ts   # Test environment setup
│       ├── global-teardown.ts # Cleanup
│       └── extension.spec.ts  # Example tests
└── test-results/             # Test outputs and artifacts
```

### Claude Code Integration

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "wingman-playwright": {
      "command": "node",
      "args": [".mcp/server.js"],
      "cwd": "packages/chrome-extension"
    }
  }
}
```

### Available MCP Tools

Once configured, Claude Code can use these tools:

- `wingman_test_extension` - Test the extension in browser context
- `wingman_capture_screenshot` - Capture screenshots with extension overlay
- `wingman_simulate_feedback` - Simulate user feedback flows
- `wingman_test_api_integration` - Test integration with Wingman relay server

## Environment Configuration

### Development Builds

The extension supports multiple build environments:

```bash
npm run build:dev      # Development: includes debugging, hot reload
npm run build:staging  # Staging: staging environment configuration
npm run build:prod     # Production: optimized build
```

### Environment Variables

Set via `WINGMAN_ENV`:
- `development` - Local development with debug features
- `staging` - Staging environment
- `production` - Production build

### Build Outputs

```
dist/
├── development/    # Development build (used by auto-loading scripts)
├── staging/       # Staging build
└── production/    # Production build
```

## Integration with Existing Workflows

### Relay Server Integration

Both workflows integrate with the Wingman relay server:

1. **Start the relay server** (in a separate terminal):
   ```bash
   cd packages/relay-server
   npm run dev
   ```

2. **Start extension development**:
   ```bash
   cd packages/chrome-extension
   npm run dev:chrome:personal
   ```

### Combined Development

For full-stack development:

```bash
# Terminal 1: Start relay server
cd packages/relay-server && npm run dev

# Terminal 2: Start extension development
cd packages/chrome-extension && npm run dev:chrome:watch

# Terminal 3: (Optional) Start web SDK demo
cd demo-app && npm run dev
```

## File Watching and Hot Reload

### Extension Hot Reload

The development build includes automatic extension reloading:
- Uses `hot-reload-extension-vite` plugin
- Monitors changes to source files
- Automatically reloads the extension in Chrome
- No manual intervention required

### Script-Based File Watching

The personal Chrome workflow also supports script-based watching:

```bash
npm run dev:chrome:watch
```

This provides:
- Source file monitoring via `chokidar`
- Automatic extension rebuilds
- Console notifications for build status
- Debounced rebuilds to prevent excessive builds

## Advanced Configuration

### Chrome Launch Flags

The personal Chrome script uses these flags for development:

```javascript
const args = [
  `--load-extension=${EXTENSION_PATH}`,
  '--no-first-run',
  '--disable-default-browser-check',
  '--disable-web-security',        // For development testing
  '--disable-features=TranslateUI',
];
```

### Playwright Configuration

The Playwright setup configures:

```typescript
// Extension-specific launch options
launchOptions: {
  args: [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=TranslateUI'
  ],
  devtools: false,
},
```

### Customization

Both approaches can be customized by modifying:

- `scripts/dev-chrome-personal.js` - Personal Chrome behavior
- `scripts/setup-playwright-mcp.js` - Playwright MCP configuration
- `playwright.config.ts` - Playwright test settings

## Dependency Management

### Personal Chrome Requirements

Requires:
- `chokidar` - File watching (installed automatically)

### Playwright MCP Requirements

Requires:
- `@microsoft/playwright-mcp` - MCP server
- `@playwright/test` - Playwright test framework
- Additional dependencies installed via setup script

### Installation

Dependencies are installed automatically when running setup scripts:

```bash
# Personal Chrome (installs chokidar if needed)
npm run dev:chrome:personal

# Playwright MCP (installs all dependencies)  
npm run dev:playwright:setup
```

## Next Steps

1. **Choose your primary workflow** based on development needs
2. **Set up your preferred approach** using the commands above
3. **Integrate with your existing development process**
4. **Explore the troubleshooting guide** if you encounter issues
5. **Check the Playwright MCP usage guide** for advanced testing patterns

## Related Documentation

- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions
- [Playwright MCP Usage Guide](./playwright-mcp-guide.md) - Advanced MCP patterns
- [Chrome Extension README](../README.md) - Package overview and quick reference