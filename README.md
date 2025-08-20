# Wingman

A lightweight UX feedback assistant for capturing and sharing feedback from web applications.

## Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/wingman/wingman.git
cd wingman

# Install dependencies and build packages
npm install
npm run build
```

### 2. Add to Your React Project

Install the Wingman SDK in your React app:

```bash
npm install wingman-sdk
```

Wrap your app with the WingmanProvider:

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

### 3. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `packages/chrome-extension/dist` folder

### 4. Start the Relay Server

Run the Wingman server to collect feedback:

```bash
# Using npm scripts
npm run dev

# Or using the CLI directly
npx wingman serve

# Custom port/host
npx wingman serve --port 3000 --host 0.0.0.0
```

The server will start on `http://localhost:8787` by default.

### 5. Capture Feedback

1. Click the Wingman extension icon in Chrome
2. Select an element or region on the page
3. Add your feedback notes
4. Submit to send to the relay server

The feedback is stored locally in `./wingman/annotations/` and can be retrieved via:

```bash
# Get the last annotation
curl http://localhost:8787/annotations/last
```

## What Gets Captured

- Screenshot of the selected area
- CSS selectors for the element
- Console logs and errors
- Network request timings
- React component metadata (when available)
- Your feedback notes

## Development

```bash
# Start all services in development mode
npm run dev

# Check service status
npm run dev:status

# Stop all services
npm run dev:stop
```

## License

MIT