# Wingman SDK

React SDK for Wingman - Enhanced UX feedback collection with React component metadata and OAuth tunnel support.

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
    <WingmanProvider config={{
      enabled: true,
      debug: true  // Enable debug logging
    }}>
      {/* Your app components */}
    </WingmanProvider>
  );
}
```

## Features

- **React Component Metadata**: Automatically captures React component names, props, and state via React DevTools hook
- **OAuth Tunnel Support**: Automatically detects and adjusts OAuth redirect URIs when using tunnels (ngrok, localtunnel, etc.)
- **Chrome Extension Integration**: Seamlessly provides React metadata to the Wingman Chrome Extension
- **Enhanced Selectors**: Generates robust CSS selectors for captured elements
- **Debug Mode**: Comprehensive logging for development

## Configuration

The `WingmanProvider` accepts the following configuration:

```jsx
<WingmanProvider
  config={{
    enabled: true,    // Enable/disable the SDK (default: true)
    debug: false,     // Enable debug logging (default: false)
    oauth: {          // OAuth configuration (optional)
      routes: ['/auth/*'],  // Routes that handle OAuth callbacks
      modifyRedirectUri: (originalUri, tunnelDomain) => {
        // Customize how redirect URIs are modified for tunnels
        return originalUri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
      },
      envOverrides: {
        'OAUTH_REDIRECT_BASE': '{tunnelDomain}'
      }
    }
  }}
>
```

## Usage with Hooks

Access Wingman functionality in your components:

```jsx
import { useWingman } from 'wingman-sdk';

function MyComponent() {
  const {
    config,        // Current configuration
    isActive,      // Whether SDK is active
    activate,      // Activate the SDK
    deactivate,    // Deactivate the SDK
    sendFeedback   // Manually send feedback
  } = useWingman();

  // Your component logic
}
```

## OAuth Tunnel Support

For applications using OAuth with local development tunnels:

```jsx
import { WingmanProvider, createOAuthHandler } from 'wingman-sdk';

const oauthConfig = {
  routes: ['/auth/*', '/callback'],
  modifyRedirectUri: (originalUri, tunnelDomain) => {
    console.log('Tunnel detected:', tunnelDomain);
    return originalUri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
  },
  envOverrides: {
    'VITE_OAUTH_REDIRECT_BASE': '{tunnelDomain}',
    'REACT_APP_OAUTH_REDIRECT': '{tunnelDomain}/callback'
  }
};

function App() {
  return (
    <WingmanProvider config={{ oauth: oauthConfig, debug: true }}>
      {/* Your app */}
    </WingmanProvider>
  );
}
```

## How it Works

1. **Chrome Extension Integration**: The SDK communicates with the Wingman Chrome Extension via message passing
2. **React Metadata Extraction**: Uses React DevTools hook to extract component information
3. **OAuth Tunnel Detection**: Automatically detects when your app is accessed via a tunnel and adjusts OAuth redirect URIs
4. **Data Enhancement**: When feedback is captured, the SDK provides:
   - React component names and hierarchy
   - Component props and state (when available)
   - Robust CSS selectors
   - Element positioning data

## Privacy & Security

- **Props Sanitization**: Sensitive data is automatically removed from captured props
- **Local Storage**: All feedback is stored locally on your machine
- **No External Services**: Data never leaves your local network
- **Open Source**: Full transparency of what data is collected

## Requirements

- React 16.8.0 or higher
- Wingman Chrome Extension installed
- Wingman CLI running locally (`wingman serve`)

## Important Notes

⚠️ **Avoid Duplicate Providers**: Only wrap your app once with `WingmanProvider`. If you have it in multiple places (e.g., both `main.jsx` and `App.jsx`), remove one of them.

## Development

```bash
# Clone the repo
git clone https://github.com/glamp/wingman-ux.git
cd packages/sdk

# Install dependencies
npm install

# Build the SDK
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test
```

## API Reference

### `WingmanProvider`

Main provider component that enables Wingman functionality.

**Props:**
- `config` (optional): Configuration object
  - `enabled`: Enable/disable the SDK
  - `debug`: Enable debug logging
  - `oauth`: OAuth configuration for tunnel support
- `endpoint` (optional): Custom endpoint for feedback submission (default: `http://localhost:8787/annotations`)
- `children`: React children elements

### `useWingman`

Hook to access Wingman functionality. Must be used within a `WingmanProvider`.

**Returns:**
- `config`: Current configuration object
- `introspector`: React introspector instance
- `isActive`: Boolean indicating if SDK is currently active
- `activate()`: Function to activate the SDK
- `deactivate()`: Function to deactivate the SDK
- `sendFeedback(data)`: Function to manually send feedback

### `createOAuthHandler`

Creates an OAuth handler for tunnel detection.

**Parameters:**
- `config`: OAuth configuration object

**Returns:**
- OAuth handler instance with `setupTunnelOAuth()` method

### `withWingmanOAuth`

Higher-order component for OAuth integration.

**Parameters:**
- `Component`: React component to wrap
- `config`: OAuth configuration

## License

MIT © Wingman Team

## Links

- [GitHub Repository](https://github.com/glamp/wingman-ux)
- [NPM Package](https://www.npmjs.com/package/wingman-sdk)
- [Wingman CLI](https://www.npmjs.com/package/wingman-cli)
- [Documentation](https://github.com/glamp/wingman-ux/tree/main/packages/sdk)