# Playwright MCP Usage Guide

This guide covers advanced usage patterns for the Wingman Chrome Extension Playwright MCP integration, enabling programmatic browser automation through Claude Code.

## Table of Contents

- [Overview](#overview)
- [Setup and Configuration](#setup-and-configuration)
- [Available MCP Tools](#available-mcp-tools)
- [Writing Tests](#writing-tests)
- [Claude Code Integration](#claude-code-integration)
- [Advanced Patterns](#advanced-patterns)
- [Performance Optimization](#performance-optimization)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)

## Overview

The Playwright MCP integration provides:

- **Automated Testing**: Run extension tests programmatically
- **Screenshot Automation**: Capture extension states and UI interactions
- **API Integration Testing**: Test extension communication with relay server
- **Claude Code Tools**: Direct browser automation through AI assistance

### Architecture

```
Claude Code ──► MCP Server ──► Playwright ──► Chrome + Extension
     ▲                                               │
     └─────────── Test Results & Screenshots ────────┘
```

## Setup and Configuration

### Initial Setup

```bash
cd packages/chrome-extension

# Install dependencies and create configuration
npm run dev:playwright:setup

# Test the setup
npm run dev:playwright:test
```

### Configuration Files Created

```
packages/chrome-extension/
├── .mcp/
│   ├── server-config.json     # MCP server configuration
│   └── server.js             # MCP server startup script
├── playwright.config.ts      # Playwright configuration
└── tests/playwright/         # Test files and setup
```

### Claude Code MCP Configuration

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "wingman-playwright": {
      "command": "node",
      "args": [".mcp/server.js"],
      "cwd": "/path/to/wingman/packages/chrome-extension"
    }
  }
}
```

## Available MCP Tools

### wingman_test_extension

Tests the extension in a browser context.

**Usage in Claude Code:**
```
Please use the wingman_test_extension tool to test the popup functionality
```

**Parameters:**
- `testType` (optional): Type of test to run (e.g., "popup", "content-script", "background")
- `url` (optional): URL to navigate to for testing (defaults to "https://example.com")

**Example Response:**
```json
{
  "success": true,
  "results": {
    "extensionLoaded": true,
    "popupAccessible": true,
    "contentScriptActive": true,
    "errors": []
  }
}
```

### wingman_capture_screenshot

Captures screenshots with extension overlay visible.

**Usage in Claude Code:**
```
Take a screenshot of the current page with the Wingman extension overlay
```

**Parameters:**
- `elementSelector` (optional): CSS selector to focus on specific element
- `includeOverlay` (optional): Whether to include extension overlay (default: true)
- `fullPage` (optional): Capture full page or viewport only (default: false)

**Example Response:**
```json
{
  "success": true,
  "screenshot": "/path/to/screenshot.png",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "url": "https://example.com",
    "viewport": { "width": 1280, "height": 720 }
  }
}
```

### wingman_simulate_feedback

Simulates user feedback flow through the extension.

**Usage in Claude Code:**
```
Simulate a user providing feedback on the current page
```

**Parameters:**
- `feedbackType` (optional): Type of feedback ("bug", "feature", "general")
- `feedbackText` (optional): Feedback content
- `includeScreenshot` (optional): Whether to include screenshot (default: true)

**Example Response:**
```json
{
  "success": true,
  "feedbackId": "01FXVS123...",
  "submitted": true,
  "relayServerResponse": {
    "status": 200,
    "annotationId": "annotation_123"
  }
}
```

### wingman_test_api_integration

Tests extension integration with Wingman relay server.

**Usage in Claude Code:**
```
Test the extension's API integration with the relay server
```

**Parameters:**
- `endpoint` (optional): Specific endpoint to test (default: "/annotations")
- `testPayload` (optional): Custom payload for testing

**Example Response:**
```json
{
  "success": true,
  "apiTests": {
    "connectivity": "pass",
    "authentication": "pass",
    "payloadSubmission": "pass",
    "responseHandling": "pass"
  },
  "responseTime": 145
}
```

## Writing Tests

### Basic Test Structure

```typescript
// tests/playwright/extension.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Wingman Extension', () => {
  test('should load extension successfully', async ({ page, context }) => {
    await page.goto('https://example.com');
    
    // Verify extension is loaded
    const extensionLoaded = await page.evaluate(() => {
      return window.wingmanExtensionLoaded === true;
    });
    
    expect(extensionLoaded).toBe(true);
  });
});
```

### Testing Extension Popup

```typescript
test('should open extension popup', async ({ page, context }) => {
  await page.goto('https://example.com');
  
  // Get extension ID
  const extensions = await context.backgroundPages();
  const extensionId = extensions[0].url().split('/')[2];
  
  // Open popup
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // Test popup functionality
  await expect(popupPage.locator('h1')).toContainText('Wingman');
});
```

### Testing Content Script Injection

```typescript
test('should inject content script', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Verify content script is injected
  const contentScriptActive = await page.evaluate(() => {
    return typeof window.wingmanContentScript !== 'undefined';
  });
  
  expect(contentScriptActive).toBe(true);
});
```

### Testing Screenshot Capture

```typescript
test('should capture screenshot', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Trigger screenshot capture
  await page.keyboard.press('Alt+Shift+S');
  
  // Wait for screenshot processing
  await page.waitForTimeout(1000);
  
  // Verify screenshot was captured
  const screenshotCaptured = await page.evaluate(() => {
    return window.lastWingmanScreenshot !== null;
  });
  
  expect(screenshotCaptured).toBe(true);
});
```

### Testing API Integration

```typescript
test('should submit feedback to relay server', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Mock relay server response
  await page.route('**/annotations', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, id: 'test-annotation' })
    });
  });
  
  // Simulate feedback submission
  await page.click('[data-testid="feedback-button"]');
  await page.fill('[data-testid="feedback-text"]', 'Test feedback');
  await page.click('[data-testid="submit-button"]');
  
  // Verify API call was made
  const apiCalled = await page.waitForResponse('**/annotations');
  expect(apiCalled.status()).toBe(200);
});
```

## Claude Code Integration

### Interactive Testing

Claude Code can use the MCP tools for interactive testing:

**Example Claude Code Session:**
```
Human: Test the Wingman extension on the current page

Claude: I'll test the Wingman extension for you.

[Uses wingman_test_extension tool]

The extension loaded successfully! Here's what I found:
- Extension is active and content script is injected
- Popup is accessible via the extension icon
- Background script is running normally
- No errors detected in the console

Would you like me to capture a screenshot or test specific functionality?
```

### Automated Test Generation

Claude Code can generate tests based on requirements:

```
Human: Create a test that verifies the feedback submission flow

Claude: I'll create a comprehensive test for the feedback submission flow.

[Generates test code using MCP tools and knowledge of the codebase]
```

### Debugging Assistance

```
Human: The extension isn't capturing screenshots properly

Claude: Let me investigate the screenshot capture functionality.

[Uses wingman_capture_screenshot and wingman_test_extension tools]

I found the issue - the content script isn't properly initialized. Let me run some diagnostic tests and provide a fix.
```

## Advanced Patterns

### Multi-Browser Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium-extension',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chrome-stable',
      use: { 
        channel: 'chrome',
        ...devices['Desktop Chrome'] 
      },
    },
  ],
});
```

### Cross-Origin Testing

```typescript
test('should work across different origins', async ({ page }) => {
  const origins = [
    'https://example.com',
    'https://github.com',
    'https://google.com'
  ];
  
  for (const origin of origins) {
    await page.goto(origin);
    
    const extensionActive = await page.evaluate(() => {
      return window.wingmanExtensionLoaded === true;
    });
    
    expect(extensionActive).toBe(true);
  }
});
```

### Performance Testing

```typescript
test('should not impact page performance', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Measure performance impact
  const metrics = await page.evaluate(() => {
    return performance.getEntriesByType('measure');
  });
  
  // Verify extension doesn't add significant overhead
  const extensionMetrics = metrics.filter(m => 
    m.name.includes('wingman')
  );
  
  extensionMetrics.forEach(metric => {
    expect(metric.duration).toBeLessThan(100); // 100ms threshold
  });
});
```

### Network Monitoring

```typescript
test('should handle API failures gracefully', async ({ page }) => {
  // Simulate network failure
  await page.route('**/annotations', route => {
    route.abort('failed');
  });
  
  await page.goto('https://example.com');
  
  // Try to submit feedback
  await page.click('[data-testid="feedback-button"]');
  await page.fill('[data-testid="feedback-text"]', 'Test feedback');
  await page.click('[data-testid="submit-button"]');
  
  // Verify error handling
  await expect(page.locator('.error-message')).toBeVisible();
});
```

## Performance Optimization

### Test Parallelization

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    // Optimize for speed
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

### Resource Management

```typescript
// Global setup for resource optimization
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Pre-compile extension once
  await buildExtension();
  
  // Warm up relay server
  await startRelayServer();
}

export default globalSetup;
```

### Selective Testing

```typescript
// Run only critical tests in CI
test.describe.configure({ mode: 'serial' });

test.describe('Critical Path', () => {
  test('extension loads @critical', async ({ page }) => {
    // Critical functionality test
  });
  
  test('feedback submission works @critical', async ({ page }) => {
    // Critical API test
  });
});
```

## Debugging and Troubleshooting

### Debug Mode

```bash
# Run tests with debug output
DEBUG=pw:api npm run test:playwright

# Run single test with debugging
npx playwright test --debug extension.spec.ts
```

### MCP Server Debugging

```javascript
// .mcp/server.js - Add debugging
console.error('MCP Server starting...', {
  extensionPath: EXTENSION_PATH,
  timestamp: new Date().toISOString()
});
```

### Test Artifacts

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Capture artifacts for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  
  outputDir: 'test-results/artifacts',
});
```

### Common Issues

**Extension not loading:**
```bash
# Verify extension build
ls -la dist/development/manifest.json

# Check Playwright browser
npx playwright --version
```

**MCP server connection issues:**
```bash
# Test MCP server manually
node .mcp/server.js

# Check Claude Code MCP configuration
cat ~/.claude/settings.json
```

**Test timeouts:**
```typescript
// Increase timeout for slow operations
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 second timeout
  
  // Test implementation
});
```

## Best Practices

### Test Organization

```
tests/playwright/
├── fixtures/           # Test fixtures and data
├── helpers/           # Test helper functions
├── pages/            # Page object models
└── specs/            # Test specifications
    ├── extension/    # Extension-specific tests
    ├── integration/  # API integration tests
    └── performance/  # Performance tests
```

### Page Object Pattern

```typescript
// pages/ExtensionPopup.ts
export class ExtensionPopup {
  constructor(private page: Page) {}
  
  async open(extensionId: string) {
    await this.page.goto(`chrome-extension://${extensionId}/popup.html`);
  }
  
  async submitFeedback(text: string) {
    await this.page.fill('[data-testid="feedback-text"]', text);
    await this.page.click('[data-testid="submit-button"]');
  }
}
```

### Assertions

```typescript
// Use specific assertions
await expect(page.locator('.success-message')).toContainText('Feedback submitted');

// Wait for network requests
await page.waitForResponse(response => 
  response.url().includes('/annotations') && response.status() === 200
);

// Verify extension state
const extensionState = await page.evaluate(() => window.wingmanState);
expect(extensionState.initialized).toBe(true);
```

This guide provides comprehensive patterns for using Playwright MCP with the Wingman Chrome extension. The combination of automated testing and AI-assisted debugging through Claude Code creates a powerful development workflow for extension testing and validation.