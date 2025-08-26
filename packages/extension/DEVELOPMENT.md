# Chrome Extension Development Quick Reference

This file provides quick access to Chrome extension development workflows and documentation.

## 🚀 Quick Start

### Personal Chrome Development (Recommended)
```bash
# Launch your personal Chrome with extension auto-loaded
npm run dev:chrome:personal

# Enable file watching for auto-rebuild
npm run dev:chrome:watch
```

### Playwright MCP Integration (Advanced Testing)
```bash
# One-time setup
npm run dev:playwright:setup

# Run automated tests  
npm run dev:playwright:test
```

## 📚 Documentation

### Setup Guides
- **[Development Setup Guide](./docs/development-setup.md)** - Comprehensive setup instructions for both workflows
- **[README](./README.md)** - Package overview and quick reference

### Advanced Usage
- **[Playwright MCP Usage Guide](./docs/playwright-mcp-guide.md)** - Advanced testing patterns and Claude Code integration
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues and solutions

### Project Documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Root project instructions including Chrome extension auto-loading section

## 🛠️ Available Scripts

### Chrome Development
- `npm run dev:chrome:personal` - Launch personal Chrome with extension
- `npm run dev:chrome:watch` - File watching with auto-reload
- `npm run dev:chrome:fresh` - Use temporary Chrome profile
- `npm run dev:full` - Combined build watcher and Chrome launcher

### Playwright MCP
- `npm run dev:playwright:setup` - Install and configure Playwright MCP
- `npm run dev:playwright:test` - Run extension tests
- `npm run dev:playwright:test:ui` - Interactive test development
- `npm run test:playwright:headed` - Run tests with visible browser

### Build & Test
- `npm run build:dev` - Development build
- `npm test` - Run unit tests
- `npm run clean` - Clean build artifacts

## 🔧 Script Files

### Core Scripts
- `scripts/dev-chrome-personal.js` - Personal Chrome auto-loading script
- `scripts/setup-playwright-mcp.js` - Playwright MCP setup script

### Configuration
- `playwright.config.ts` - Playwright test configuration (created by setup)
- `.mcp/` - MCP server configuration (created by setup)

## 💡 When to Use Each Approach

### Personal Chrome (Daily Development)
- ✅ Quick iteration and manual testing
- ✅ UI development and styling
- ✅ Real user sessions and data
- ✅ Fast feedback loop

### Playwright MCP (Advanced Testing)
- ✅ Automated regression testing
- ✅ Screenshot comparison
- ✅ API integration testing
- ✅ AI-assisted debugging through Claude Code

### Manual Loading (Fallback)
- ✅ When automation fails
- ✅ Debugging script issues
- ✅ One-time testing

## 🐛 Common Issues

### Chrome Won't Start
```bash
# Close all Chrome processes
pkill -f "Google Chrome"

# Try again
npm run dev:chrome:personal
```

### Extension Not Loading
```bash
# Verify build exists
ls -la dist/development/manifest.json

# Rebuild if needed
npm run build:dev
```

### File Watching Not Working
```bash
# Install chokidar dependency
npm install chokidar --save-dev
```

## 🤝 Claude Code Integration

### MCP Configuration
Add to your Claude Code settings:
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

### Available Tools
- `wingman_test_extension` - Test extension functionality
- `wingman_capture_screenshot` - Capture extension screenshots
- `wingman_simulate_feedback` - Simulate user feedback flows
- `wingman_test_api_integration` - Test API integration

## 📞 Getting Help

1. **Check the troubleshooting guide**: `docs/troubleshooting.md`
2. **Review setup documentation**: `docs/development-setup.md`
3. **Test with manual loading**: Load extension via chrome://extensions/
4. **Check script help**: `node scripts/dev-chrome-personal.js --help`

## 🎯 Architecture Overview

```
Personal Chrome Workflow:
Developer ──► npm script ──► Chrome launcher ──► Chrome + Extension

Playwright MCP Workflow:  
Claude Code ──► MCP Server ──► Playwright ──► Chrome + Extension
```

Both workflows are designed to eliminate manual extension loading and provide seamless development experiences for different use cases.