# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Server Management

Wingman uses an intelligent development server manager that prevents duplicate processes and provides clear status information.

### Quick Start
```bash
npm run dev        # Start all services (checks for existing processes)
npm run dev:status # Check what's running
npm run dev:stop   # Stop all services
npm run dev:restart # Restart all services
```

### How It Works
1. **Before Starting**: Checks if services are already running via PID files
2. **Port Detection**: Verifies ports are available before attempting to start
3. **Process Tracking**: Maintains PID files in `.wingman-dev/pids/`
4. **Status Monitoring**: Run `npm run dev:status` to see what's running
5. **Automatic Cleanup**: Removes PID files on normal exit

### For Claude Code Sessions
- **ALWAYS** run `npm run dev:status` first to check current state
- If services are already running, you'll see a clear status table
- The system prevents duplicate processes automatically
- PID files persist across Claude Code sessions
- If you see "port already in use" errors, check status first

### Directory Structure
- `.wingman-dev/` - Development server management (PID files, status)
- `.wingman/` - Wingman feature data (annotations storage)

### Troubleshooting
- If a service crashes but PID file remains: `npm run dev:stop` then `npm run dev`
- To force restart: `npm run dev:restart`
- Check individual service logs in terminal output

## Project Overview

Wingman is a lightweight UX feedback assistant consisting of:
- Chrome Extension for capturing screenshots and context
- Optional Web SDK for React metadata
- Local Relay Server that forwards feedback to Claude Code

## Architecture

The project uses a monorepo structure with shared TypeScript types across all packages (Chrome Extension, Web SDK, and Local Relay Server). All packages must use the same `WingmanAnnotation` type definition to ensure consistency.

## Key Technical Constraints

1. **Shared Types**: Never duplicate types across packages. The `WingmanAnnotation` interface is the single source of truth for the payload structure.

2. **Build Approach**: Development starts from a demo React app, then Wingman functionality is built into it incrementally.

3. **TypeScript**: Use strict TypeScript configuration for all packages.

4. **Simplicity**: Keep code as simple as possible while meeting requirements.

5. **Incremental Development**: Work in small, testable steps. Get minimal functionality working first (e.g., just screenshot capture), then layer on features one at a time.

## Core Components

### Chrome Extension (Manifest V3)
- Content script overlay for element/region picking
- Screenshot capture via `chrome.tabs.captureVisibleTab()`
- Console/error buffer capture
- Network timing collection via PerformanceObserver
- Posts to configurable endpoint (default: `http://localhost:8787/annotations`)

### Web SDK (Optional)
- Provides robust CSS selectors for selected elements
- Best-effort React metadata extraction via `__REACT_DEVTOOLS_GLOBAL_HOOK__`
- Graceful degradation when React DevTools hook is unavailable

### Local Relay Server
- Receives annotations at `POST /annotations`
- Provides `GET /annotations/last` for retrieving the most recent annotation
- Body size limit ≥ 25MB for screenshots
- Returns consistent error shapes: `{ error: string, code?: string, details?: any }`
- Stores annotations as files in `./.wingman/annotations/:id.json`
- CORS enabled for browser access
- No authentication (for v1)
- **MCP Integration**: Serves MCP over HTTP/SSE at `/mcp` endpoint

## Development Commands

### Build Commands
- Each package has `npm run build` and `npm run dev` (watch mode with HMR for servers)
- Root-level `npm run build` runs all sub-package builds
- Use npm workspaces for monorepo management

### Testing

#### Testing Philosophy
- **No Mocking**: Real integration tests are strongly preferred. Mocking is bad and should be avoided.
- **Snapshot Testing**: Use snapshot tests for component output, API responses, and CLI output. Snapshot tests are good.
- **Integration-First**: Test actual behavior with real servers, real file systems, and real network connections.
- **No Test Doubles**: Avoid stubs, spies, and mocks. Use real implementations.

#### Test Infrastructure
- **Test Runner**: Vitest for all packages (fast, ESM-native, great snapshot support)
- **API Testing**: Supertest for Express integration tests (no mocks, real servers)
- **E2E Testing**: Playwright with accompanying MCP for browser automation
- **Coverage**: Aim for high coverage through integration tests, not unit tests

#### Writing Tests
- Test real behavior, not isolated functions
- Use temporary directories for file-based tests
- Clean up resources in afterEach/afterAll hooks
- Use dynamically allocated ports for server tests
- Store snapshots in `__snapshots__` directories
- Test names should describe expected behavior clearly

#### Running Tests
- `npm test` - Run all tests across workspaces
- `npm run test:watch` - Run tests in watch mode during development
- Check individual package.json files for package-specific test commands

### Code Quality
- Format code: `npm run prettier` or `npx prettier --write .`
- Lint: Run the appropriate lint command from package.json
- TypeScript: Use strictest possible settings for Rust-like compile-time error catching

### Chrome Extension Development

#### Automated Extension Loading (Recommended)

**For Personal Chrome Development (macOS)**:
```bash
cd packages/chrome-extension

# Quick start: Build and launch Chrome with extension loaded
npm run dev:chrome:personal

# Development with auto-reload on file changes  
npm run dev:chrome:watch

# Use fresh Chrome profile (no personal data)
npm run dev:chrome:fresh
```

**For Advanced Testing with Playwright MCP**:
```bash
cd packages/chrome-extension

# One-time setup: Install Playwright MCP dependencies
npm run dev:playwright:setup

# Run extension tests through Playwright
npm run dev:playwright:test

# Interactive test development
npm run dev:playwright:test:ui
```

#### Manual Loading (Fallback)
- Load unpacked extension from `packages/chrome-extension/dist` in Chrome
- Use `npm run dev` in chrome-extension package for development

#### Development Features
- **Hot Reload**: The extension automatically reloads when you make changes
  - The development build includes hot-reload-extension-vite plugin
  - Changes to source files trigger automatic extension reload
  - No need to manually reload the extension in Chrome
  - Requires NODE_ENV=development (automatically set by wingit)

#### Chrome Extension Auto-Loading

**Personal Chrome Workflow (Recommended for daily development)**:
- Uses your personal Chrome profile with existing bookmarks and login sessions
- Automatically builds extension and launches Chrome with `--load-extension` flag
- Supports file watching for automatic rebuilds
- Handles Chrome process management gracefully

**Available Scripts**:
- `npm run dev:chrome:personal` - Build and launch personal Chrome with extension
- `npm run dev:chrome:watch` - Enable file watching for auto-reload
- `npm run dev:chrome:fresh` - Use temporary profile (clean slate)
- `npm run dev:full` - Start both build watcher and Chrome launcher

**Playwright MCP Integration (Advanced testing)**:
- Provides programmatic browser automation through Claude Code
- Uses Microsoft's official `@playwright/test` and `@microsoft/playwright-mcp`
- Enables automated testing, screenshot capture, and network monitoring
- Perfect for regression testing and complex user flow validation

**MCP Configuration for Claude Code**:
Add to your Claude Code settings:
```json
{
  "mcpServers": {
    "wingman": {
      "command": "npx",
      "args": ["wingman-cli", "serve"]
    },
    "wingman-playwright": {
      "command": "node",
      "args": [".mcp/server.js"],
      "cwd": "packages/chrome-extension"
    }
  }
}
```

**When to Use Each Approach**:
- **Personal Chrome**: Daily development, UI iteration, manual testing
- **Playwright MCP**: Automated testing, screenshot comparison, API integration testing
- **Manual Loading**: Fallback when automated approaches fail

**Troubleshooting**:
- If Chrome fails to start: Check that all Chrome processes are closed first
- Extension not loading: Verify `packages/chrome-extension/dist/development` exists
- File watching not working: Ensure `chokidar` dependency is installed
- MCP setup issues: Run `npm run dev:playwright:setup` to reinstall dependencies

## Code Search and Navigation

### Using SAH Search Tools
The SwissArmyHammer (SAH) search tools provide semantic code search capabilities. Use these for efficient code navigation and understanding.

#### 1. Index Files First
Before searching, index the TypeScript files in the project:
```
mcp__sah__search_index with patterns: ["packages/**/*.ts", "packages/**/*.tsx"]
```
- Run this after cloning the repo or major file changes
- Use `force: true` to re-index all files when needed
- The index is stored in `.swissarmyhammer/search.db` (automatically gitignored)

#### 2. Search for Code
Use semantic search to find relevant code:
```
mcp__sah__search_query with query: "your search terms"
```
- Returns results ranked by semantic similarity (not just keyword matching)
- Includes file path, line numbers, and code context
- Higher similarity scores (closer to 1.0) indicate better matches

### Search Best Practices

#### Effective Search Queries
- **Type definitions**: "WingmanAnnotation interface type definition"
- **Error handling**: "error handling middleware Express"
- **React components**: "React hook useWingman provider"
- **API endpoints**: "POST annotations endpoint handler"
- **Specific functionality**: "screenshot capture chrome extension"

#### When to Use Search vs Other Tools
- **Use SAH search for**:
  - Finding type definitions and interfaces
  - Locating implementations of specific features
  - Understanding code patterns across files
  - Discovering dependencies and imports
  
- **Use Grep/Glob for**:
  - Exact string matches
  - Finding specific file names
  - Simple pattern matching

### Wingman-Specific Search Examples

1. **Find the core annotation type**:
   - Query: "WingmanAnnotation type interface shared"
   - Expected: Links to `packages/shared/src/types.ts`

2. **Locate error handling**:
   - Query: "error handler middleware Express server"
   - Expected: Links to relay server error handling

3. **Find React integration points**:
   - Query: "React DevTools hook metadata extraction"
   - Expected: Links to web SDK React introspector

4. **Discover Chrome extension functionality**:
   - Query: "chrome tabs captureVisibleTab screenshot"
   - Expected: Links to extension background script

### Maintaining Search Index
- Re-index after:
  - Adding new TypeScript files
  - Major refactoring
  - Switching branches with different file structures
- The search uses TreeSitter for accurate code parsing
- Files that fail to parse are indexed as plain text

## MCP (Model Context Protocol) Integration

### Overview
The relay server includes built-in MCP support for Claude Code integration. MCP runs on the same server as the HTTP API - single server, single command.

### Architecture
- **Endpoint**: `/mcp` - Serves MCP over HTTP with SSE (Server-Sent Events) transport
- **Tools**: Wingman-branded tools for annotation management
- **Prompts**: UI fix prompt for processing feedback
- **Configuration**: Simple HTTP SSE transport configuration in Claude Code

### MCP SDK API Patterns

**CRITICAL**: The MCP SDK uses specific method names that must be used correctly:

```typescript
// CORRECT - Using the actual SDK API
mcpServer.registerTool(name, config, handler)
mcpServer.registerPrompt(name, config, handler)

// WRONG - These methods don't exist
mcpServer.tool(...)        // ❌ Does not exist
mcpServer.addTool(...)     // ❌ Does not exist  
mcpServer.prompt(...)      // ❌ Does not exist
```

**Tool Registration**:
```typescript
mcpServer.registerTool(
  'tool_name',
  {
    title: 'Display Title',
    description: 'Tool description',
    inputSchema: {  // Raw Zod schema, NOT wrapped in z.object()
      param: z.string().describe('Parameter description')
    }
  },
  async (params) => { /* handler */ }
)
```

**Prompt Registration**:
```typescript
mcpServer.registerPrompt(
  'prompt_name',
  {
    title: 'Display Title',
    description: 'Prompt description',
    argsSchema: {  // Note: argsSchema, not inputSchema for prompts!
      param: z.string().optional()
    }
  },
  async (args) => { /* handler */ }
)
```

### Testing MCP Features

**CRITICAL**: Always test the actual CLI entry point, not just the internal API:

```bash
# This MUST work without errors
npx wingman serve

# Then verify MCP is available
curl http://localhost:8787/mcp/health
```

#### Required Tests for MCP Changes

1. **CLI Integration Test**: Test that `wingman serve` starts without errors
2. **MCP Initialization**: Verify MCP server initializes correctly  
3. **Tool Registration**: Test that tools are actually registered (not just listed)
4. **SSE Transport**: Verify SSE connections work properly
5. **End-to-End**: Test actual tool invocation through the MCP protocol

#### Common Testing Pitfalls

- ❌ **Don't** only test the `/mcp/health` endpoint
- ❌ **Don't** mock the MCP server in tests
- ❌ **Don't** skip SSE connection tests
- ✅ **Do** test the real `npx wingman serve` command
- ✅ **Do** verify runtime behavior matches test expectations
- ✅ **Do** test with actual process spawning

### Claude Code Configuration

Add to Claude Code settings:
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

### Available Tools and Prompts

**Tools**:
- `wingman_list` - List all UI feedback annotations
- `wingman_review` - Review specific or latest annotation
- `wingman_delete` - Delete processed annotations

**Prompts**:
- `wingman_fix_ui` - Process and fix UI issues from annotations

## Important Notes

- **Comments**: Comment code so it is easy to follow and read.
- **React Hook Integration**: The `__REACT_DEVTOOLS_GLOBAL_HOOK__` is an unsupported/internal API. Always feature-detect and gracefully degrade.
- **Privacy**: Sanitize React props/state before including in payloads (remove functions, large objects, tokens/emails).
- **Screenshot Strategy**: v1 captures visible tab only, no full-page stitching.
- **Not in v1**: Session replay, desktop app, cross-origin iframe access, request/response bodies, screenshot masking.
