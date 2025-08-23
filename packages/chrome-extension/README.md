# Wingman Chrome Extension

Lightweight UX feedback assistant for web applications. The Wingman Chrome Extension captures screenshots, context, and user feedback to help improve your web applications.

## Quick Start

### Development Setup

1. **Build the extension**:
   ```bash
   npm run build:dev
   ```

2. **Choose your development approach**:

   **Option A: Personal Chrome (Recommended)**
   ```bash
   # Launch your personal Chrome with extension auto-loaded
   npm run dev:chrome:personal
   
   # Enable file watching for auto-rebuild
   npm run dev:chrome:watch
   ```

   **Option B: Playwright MCP (Advanced Testing)**
   ```bash
   # One-time setup
   npm run dev:playwright:setup
   
   # Run automated tests
   npm run dev:playwright:test
   ```

### Manual Installation (Fallback)

1. Build the extension: `npm run build:dev`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `packages/chrome-extension/dist/development`

## Development Workflows

### Personal Chrome Development

**Best for**: Daily development, UI iteration, manual testing

```bash
# Quick start: Build and launch Chrome with extension
npm run dev:chrome:personal

# Development with auto-reload on file changes
npm run dev:chrome:watch

# Use fresh Chrome profile (no personal data)
npm run dev:chrome:fresh

# Combined: Start build watcher and Chrome launcher
npm run dev:full
```

**Features**:
- Uses your personal Chrome profile with existing bookmarks and sessions
- Automatically builds extension and launches Chrome with `--load-extension` flag
- Supports file watching for automatic rebuilds
- Handles Chrome process management gracefully

### Playwright MCP Integration

**Best for**: Automated testing, screenshot comparison, API integration testing

```bash
# One-time setup: Install Playwright MCP dependencies
npm run dev:playwright:setup

# Run extension tests through Playwright
npm run dev:playwright:test

# Interactive test development with UI
npm run dev:playwright:test:ui

# Run tests in headed mode (visible browser)
npm run test:playwright:headed
```

**Features**:
- Programmatic browser automation through Claude Code
- Automated testing with screenshot capture and network monitoring
- Perfect for regression testing and complex user flow validation
- Integration with Model Context Protocol for AI-assisted testing

## Available Scripts

### Build Scripts
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run build:staging` - Staging build
- `npm run dev` - Development build with watch mode

### Chrome Development Scripts
- `npm run dev:chrome:personal` - Launch personal Chrome with extension
- `npm run dev:chrome:watch` - File watching with auto-reload
- `npm run dev:chrome:fresh` - Use temporary Chrome profile
- `npm run dev:full` - Combined build watcher and Chrome launcher

### Playwright MCP Scripts
- `npm run dev:playwright:setup` - Install and configure Playwright MCP
- `npm run dev:playwright:config` - Create configuration files only
- `npm run dev:playwright:test` - Run Playwright tests
- `npm run dev:playwright:test:ui` - Interactive test development

### Testing Scripts
- `npm test` - Run Vitest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:playwright` - Run Playwright extension tests
- `npm run test:playwright:headed` - Run Playwright tests with visible browser

### Utility Scripts
- `npm run clean` - Clean dist directory
- `npm run clean:all` - Clean all environment builds
- `npm run package` - Package extension for distribution

## Development Features

### Hot Reload
The development build includes automatic extension reloading:
- Changes to source files trigger automatic extension reload
- No need to manually reload the extension in Chrome
- Uses the `hot-reload-extension-vite` plugin
- Requires `NODE_ENV=development`

### Multi-Environment Builds
- **Development**: `dist/development` - includes hot reload, debugging tools
- **Staging**: `dist/staging` - staging environment configuration  
- **Production**: `dist/production` - optimized for performance

## Architecture

### Core Components

**Content Script**: Element/region selection overlay
**Background Script**: Screenshot capture via `chrome.tabs.captureVisibleTab()`
**Popup**: User interface for feedback submission
**Options Page**: Configuration and settings

### Integration Points

**Wingman Web SDK** (Optional):
- Provides enhanced CSS selectors for selected elements
- React metadata extraction via DevTools hooks
- Graceful degradation when unavailable

**Relay Server**:
- Posts feedback to `http://localhost:8787/annotations` (configurable)
- Handles annotation storage and MCP integration

## Configuration

### Environment Variables
Set via `WINGMAN_ENV` environment variable:
- `development` - Local development with debug features
- `staging` - Staging environment
- `production` - Production build

### Extension Settings
Configurable through the extension's options page:
- Relay server endpoint URL
- Screenshot quality settings
- Feedback form customization

## Testing

### Unit Tests (Vitest)
```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### Integration Tests (Playwright)
```bash
npm run test:playwright         # Headless tests
npm run test:playwright:headed  # Visible browser tests
```

### Manual Testing
```bash
npm run dev:chrome:personal     # Launch with extension
```

## Troubleshooting

### Chrome Launch Issues
- **Chrome fails to start**: Ensure all Chrome processes are closed first
- **Extension not loading**: Verify `dist/development` directory exists and contains `manifest.json`
- **Permission denied**: Check that Chrome has necessary permissions

### Build Issues  
- **Build fails**: Check TypeScript compilation errors
- **Hot reload not working**: Ensure development environment is set correctly
- **Missing dependencies**: Run `npm install` in the chrome-extension directory

### Playwright Setup Issues
- **MCP setup fails**: Run `npm run dev:playwright:setup` to reinstall dependencies
- **Tests fail to run**: Ensure relay server is running (`cd ../relay-server && npm run dev`)
- **Browser launch errors**: Check Playwright browser installation

### File Watching Issues
- **Auto-reload not working**: Ensure `chokidar` dependency is installed
- **Performance issues**: Large file trees may cause excessive watching - add exclusions if needed

## Integration with Claude Code

### MCP Configuration
Add to your Claude Code settings for Playwright MCP integration:

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
- `wingman_test_extension` - Test extension in browser context
- `wingman_capture_screenshot` - Capture screenshots with extension overlay
- `wingman_simulate_feedback` - Simulate user feedback flows
- `wingman_test_api_integration` - Test relay server integration

## Contributing

1. Use the automated development workflows (`npm run dev:chrome:personal`)
2. Follow the testing philosophy: prefer integration tests over mocks
3. Maintain TypeScript strictness for compile-time safety
4. Test across multiple environments (development, staging, production)

## Architecture Decisions

- **Manifest V3**: Uses the latest Chrome extension manifest format
- **TypeScript**: Strict configuration for compile-time error catching  
- **Vite**: Fast build system with Hot Module Replacement
- **Shared Types**: Uses `@wingman/shared` for type consistency across packages
- **No Mocking**: Tests use real implementations for reliability

## Related Packages

- `@wingman/shared` - Shared TypeScript types and utilities
- `@wingman/web-sdk` - Optional React integration for enhanced metadata
- `@wingman/relay-server` - Local server for annotation processing and MCP integration