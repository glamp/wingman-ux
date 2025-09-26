# Wingman Chrome Extension

Chrome extension for capturing UI feedback with screenshots, console logs, and network activity.

## Quick Start

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build
```

## Loading the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist-wxt/chrome-mv3-dev` folder (for development)

## Project Structure

```
src/
├── entrypoints/       # Extension entry points
│   ├── background.ts  # Background service worker
│   ├── content.ts     # Content script
│   └── popup/         # Extension popup UI
├── components/        # React components
├── stores/           # State management (Zustand)
├── lib/              # Utilities
└── content-ui/       # Overlay components
```

## Development

### Commands

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build for production
npm run build:dev    # Build for development
npm run clean        # Clean build artifacts
```

### Hot Reload

The extension automatically reloads when you make changes in development mode. WXT handles this for you - no manual reload needed.

### Environment Configuration

The extension uses `.env` files for configuration:
- `.env` - Default configuration
- `.env.development` - Development overrides
- `.env.production` - Production settings

## Usage

### Keyboard Shortcuts

- **Windows/Linux**: `Alt + Shift + K`
- **Mac**: `⌘ + Shift + K` (Command + Shift + K)

### Output Modes

The extension supports three output modes (configurable in settings):

1. **Clipboard**: Copies feedback as formatted text
2. **Local Server**: Posts to `http://localhost:8787`
3. **Remote**: Sends to configured remote endpoint

## Features

- **Screenshot Capture**: Captures visible tab area
- **Element Selection**: Click to select DOM elements
- **Console Logging**: Captures console output
- **Network Timing**: Records network request performance
- **React DevTools Integration**: Extracts React component data when available

## Architecture

### Technology Stack

- **Framework**: WXT (Web Extension Framework)
- **UI**: React + Material-UI
- **State**: Zustand with chrome.storage sync
- **Styling**: MUI theme system with Geist font
- **Language**: TypeScript (strict mode)

### Key Components

1. **Background Script** (`src/entrypoints/background.ts`)
   - Handles screenshot capture
   - Manages message passing
   - Coordinates with content scripts

2. **Content Script** (`src/entrypoints/content.ts`)
   - Injects overlay UI
   - Captures page context
   - Handles element selection

3. **Popup UI** (`src/entrypoints/popup/`)
   - Settings management
   - Quick feedback capture
   - Live share functionality

4. **State Management** (`src/stores/`)
   - Zustand stores for reactive state
   - Chrome storage for persistence
   - Cross-context synchronization

## Testing

```bash
# Unit tests
npm test

# Build and test manually
npm run build:dev
# Then load the extension in Chrome
```

## Troubleshooting

### Extension not working?

1. **Check extension is loaded**: Go to `chrome://extensions/` and verify it's enabled
2. **Check for errors**: Right-click extension icon → "Inspect popup" to see console
3. **Reload extension**: Click the refresh button in `chrome://extensions/`
4. **Check permissions**: Extension won't work on chrome:// or chrome-extension:// pages

### Build issues?

1. **Clean and rebuild**: `npm run clean && npm run build:dev`
2. **Check Node version**: Requires Node.js 18+
3. **Reinstall dependencies**: `rm -rf node_modules && npm install`

### Development issues?

1. **Hot reload not working**: Make sure you're running `npm run dev`
2. **Changes not appearing**: Check that WXT server is running
3. **TypeScript errors**: Run `npx tsc --noEmit` to check types

## Configuration

Settings are stored in Chrome's local storage and persist across sessions:

- **Output Mode**: Choose between Clipboard, Local, or Remote
- **Relay URL**: Configure custom server endpoint
- **Display Options**: Toggle various UI features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

See LICENSE file in the root directory.