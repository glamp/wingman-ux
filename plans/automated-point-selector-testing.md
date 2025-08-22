# Automated Point Selector Testing Plan

## Overview

This plan outlines an approach for automated end-to-end testing of the point selector feature in the Wingman Chrome extension to catch interaction bugs and verify fixes work in real browser environments.

## Problem Statement

The point selector feature had a complex bug where clicking the "Select Point" button would immediately trigger point selection on the button itself, due to Shadow DOM event retargeting and timing issues. Manual testing of such interaction bugs is:

- Time-consuming and error-prone
- Hard to reproduce consistently 
- Difficult to verify edge cases
- Not caught by unit tests with JSDOM

## Proposed Solution

### Automated E2E Testing with Playwright

Create comprehensive end-to-end tests that:

1. **Load actual Chrome extension** in a real Chromium browser
2. **Navigate to demo app** (localhost:5173)
3. **Test complete user workflow**:
   - Open extension popup
   - Click "Start Capture" 
   - Click "Select Point" mode
   - Click on page content (not UI controls)
   - Verify annotation panel appears
4. **Verify interaction isolation**: UI clicks don't trigger point selection

### Benefits

- **Catches real bugs**: Tests actual browser behavior, not mocked interactions
- **Prevents regressions**: Automated tests run on every change
- **Documents expected behavior**: Tests serve as living specification
- **Builds confidence**: Ensures fixes work in production environment
- **Reduces manual QA**: Automation handles repetitive testing scenarios

## Technical Implementation

### Test Architecture

```
packages/chrome-extension/
├── tests/
│   ├── e2e/
│   │   ├── point-selector.spec.ts     # Point selector specific tests
│   │   ├── element-selector.spec.ts   # Element selector tests  
│   │   └── annotation-flow.spec.ts    # Full annotation workflow
│   ├── fixtures/
│   │   ├── test-pages/               # Custom test pages
│   │   └── extension-setup.ts        # Extension loading helpers
│   └── playwright.config.ts          # Playwright configuration
```

### Test Setup

```typescript
// Extension loading helper
async function loadWingmanExtension() {
  const extensionPath = path.resolve(__dirname, '../dist/production');
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
    ]
  });
  return browser;
}
```

### Sample Test Cases

```typescript
test('point selector isolates UI clicks from page clicks', async ({ page }) => {
  // 1. Load extension and navigate to demo app
  // 2. Trigger overlay via keyboard shortcut (⌘+Shift+K)
  // 3. Click "Select Point" button 
  // 4. Verify cursor becomes crosshair
  // 5. Click page content (not UI)
  // 6. Verify annotation panel appears
  // 7. Verify point marker is placed correctly
});

test('clicking mode selector buttons does not trigger point selection', async ({ page }) => {
  // 1. Activate point selection mode
  // 2. Click between mode selector buttons rapidly
  // 3. Verify no spurious point selections occur
  // 4. Verify mode switches work correctly
});
```

## Implementation Challenges

### Chrome Extension Loading

- **Manifest V3 complexity**: Service workers, permissions, content script injection
- **Extension ID detection**: Dynamic IDs make popup URL construction difficult
- **Background script access**: Limited Playwright API for extension internals

### Proposed Solutions

1. **Use keyboard shortcuts** instead of popup interaction (⌘+Shift+K)
2. **Static extension ID**: Use key in manifest for predictable ID
3. **Test mode flag**: Special test build with debugging helpers
4. **Extension bridge**: Expose test APIs via `window` object

### Alternative Approaches

If direct extension testing proves too complex:

1. **Component integration tests**: Test React components with real DOM
2. **Content script injection**: Manually inject built content.js in test pages
3. **Hybrid approach**: Unit tests + manual E2E verification

## Success Criteria

- [ ] Tests run reliably in CI/CD
- [ ] Catch point selector interaction bugs
- [ ] Complete in under 30 seconds
- [ ] Work with both development and production builds
- [ ] Provide clear failure messages with screenshots

## Future Enhancements

- **Visual regression testing**: Screenshot comparison for UI changes
- **Performance testing**: Measure overlay rendering times
- **Cross-browser testing**: Firefox, Safari extension testing
- **Accessibility testing**: Screen reader, keyboard navigation

## Dependencies

- Playwright with Chromium
- Demo app running on localhost:5173
- Built Chrome extension in dist/production
- Test data and fixtures

## Timeline Estimate

- **Setup and configuration**: 1-2 days
- **Basic workflow tests**: 2-3 days  
- **Edge case coverage**: 1-2 days
- **CI integration**: 1 day

**Total**: ~1 week for comprehensive E2E test suite

## Lessons Learned

During implementation attempt:

1. **Chrome extension testing is complex** - requires specialized setup
2. **Shadow DOM interactions** need careful handling in tests
3. **Content script injection** fails in some test environments
4. **Manual testing remains important** for complex interaction flows

The approach is sound but requires dedicated time and expertise in Chrome extension testing patterns.