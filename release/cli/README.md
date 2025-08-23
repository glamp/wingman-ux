# Wingman CLI

Local relay server for Wingman - A lightweight UX feedback assistant for web applications.

## Installation

```bash
npm install -g wingman-cli
```

## Usage

Start the Wingman relay server:

```bash
# Start with default settings (port 8787)
wingman serve

# Custom port and host
wingman serve --port 3000 --host 0.0.0.0

# With verbose logging
wingman serve --verbose
```

## What it Does

The Wingman CLI runs a local relay server that:
- Receives feedback annotations from the Wingman Chrome Extension
- Stores feedback locally in `./.wingman/annotations/`
- Provides a REST API to retrieve annotations
- Includes a preview UI at `http://localhost:8787/preview`

## API Endpoints

- `POST /annotations` - Submit new feedback annotation
- `GET /annotations/last` - Get the most recent annotation
- `GET /preview` - View the preview UI
- `GET /health` - Health check endpoint

## Chrome Extension

To use Wingman, you'll also need the Chrome Extension:

1. Download the extension from [Chrome Web Store](https://chrome.google.com/webstore)
2. Or load the unpacked extension from the GitHub repository

## Configuration

The server accepts the following environment variables:

- `WINGMAN_PORT` - Server port (default: 8787)
- `WINGMAN_HOST` - Server host (default: localhost)
- `WINGMAN_STORAGE_DIR` - Storage directory (default: ./wingman)

## Development

```bash
# Clone the repo
git clone https://github.com/wingman/wingman.git
cd wingman/packages/cli

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## License

MIT © Wingman Team

## Links

- [GitHub Repository](https://github.com/wingman/wingman)
- [Chrome Extension](https://chrome.google.com/webstore)
- [Documentation](https://github.com/wingman/wingman#readme)