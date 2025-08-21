# Wingman SDK

React SDK for Wingman - Enhanced UX feedback collection with React component metadata.

## Installation

```bash
npm install wingman-sdk
```

## Quick Start

Wrap your React app with the `WingmanProvider`:

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

## Features

- **React Component Metadata**: Automatically captures React component names and props
- **Enhanced CSS Selectors**: Provides robust selectors for captured elements
- **Console Integration**: Buffers console logs and errors for debugging
- **Network Timing**: Tracks network request performance
- **Seamless Integration**: Works alongside the Wingman Chrome Extension

## Configuration

The `WingmanProvider` accepts the following configuration:

```jsx
<WingmanProvider
  config={{
    enabled: true,           // Enable/disable the SDK
    maxConsoleEntries: 100,  // Max console entries to buffer
    maxNetworkEntries: 50,   // Max network requests to track
    sanitizeProps: true,     // Remove sensitive data from props
  }}
>
```

## Usage with Hooks

Access Wingman functionality in your components:

```jsx
import { useWingman } from 'wingman-sdk';

function MyComponent() {
  const { isEnabled, captureEvent } = useWingman();
  
  if (!isEnabled) {
    return null;
  }
  
  // Your component logic
}
```

## How it Works

1. The SDK enhances the data collected by the Wingman Chrome Extension
2. When a user captures feedback, the SDK provides:
   - React component hierarchy
   - Component props (sanitized)
   - Accurate CSS selectors
   - Console history
   - Network timing data
3. All data is sent to your local Wingman relay server

## Privacy & Security

- **Props Sanitization**: Sensitive data is automatically removed from captured props
- **Local Storage**: All feedback is stored locally on your machine
- **No External Services**: Data never leaves your local network
- **Open Source**: Full transparency of what data is collected

## Requirements

- React 16.8.0 or higher
- Wingman Chrome Extension installed
- Wingman CLI running locally (`wingman serve`)

## Development

```bash
# Clone the repo
git clone https://github.com/wingman/wingman.git
cd wingman/packages/web-sdk

# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test
```

## API Reference

### WingmanProvider

Main provider component that enables Wingman functionality.

**Props:**
- `config` (optional): Configuration object
- `children`: React children elements

### useWingman

Hook to access Wingman functionality.

**Returns:**
- `isEnabled`: Boolean indicating if Wingman is active
- `captureEvent`: Function to manually capture events
- `config`: Current configuration

## License

MIT © Wingman Team

## Links

- [GitHub Repository](https://github.com/wingman/wingman)
- [Chrome Extension](https://chrome.google.com/webstore)
- [CLI Documentation](https://www.npmjs.com/package/wingman-cli)