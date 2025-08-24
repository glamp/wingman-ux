# 🛩️ Wingman Usage Guide

A comprehensive guide to all the different ways you can utilize Wingman for UI feedback collection and development collaboration.

## Table of Contents
- [Quick Start](#quick-start)
- [Usage Modes](#usage-modes)
  - [1. Local-Only Mode](#1-local-only-mode)
  - [2. Local + Tunnel Mode](#2-local--tunnel-mode)
  - [3. Tunnel-Only Mode](#3-tunnel-only-mode)
  - [4. Copy Mode](#4-copy-mode)
  - [5. Hybrid P2P Mode](#5-hybrid-p2p-mode)
  - [6. MCP-Integrated Mode](#6-mcp-integrated-mode)
- [Configuration Options](#configuration-options)
- [Environment-Specific Setups](#environment-specific-setups)
- [Choosing the Right Mode](#choosing-the-right-mode)
- [Advanced Configurations](#advanced-configurations)

## Quick Start

The simplest way to get started with Wingman:

```bash
# Start the relay server
npx wingman-cli serve

# Install Chrome Extension
# Load from packages/chrome-extension/dist/development

# Capture feedback
# Click Wingman icon → Select element → Add note → Submit
```

## Usage Modes

### 1. Local-Only Mode

**The default and simplest setup for solo developers**

#### Setup
```bash
# Start local relay server
npx wingman-cli serve

# Or with custom port
npx wingman-cli serve --port 3456 --host localhost
```

#### Features
- Relay server runs on `http://localhost:8787` (default)
- Chrome extension posts annotations directly to local server
- Annotations stored in `.wingman/annotations/` directory
- Full MCP integration for Claude Code
- No external network dependencies

#### Use Cases
- Solo development
- Privacy-sensitive projects
- Offline development
- Local testing and debugging

#### Chrome Extension Config
```json
{
  "relayUrl": "http://localhost:8787"
}
```

### 2. Local + Tunnel Mode

**Share your local development with remote team members**

#### Setup
```bash
# Start relay server
npx wingman-cli serve

# Create tunnel session (via API)
curl -X POST http://localhost:8787/tunnel/create \
  -H "Content-Type: application/json" \
  -d '{"targetPort": 8787, "enableP2P": true}'

# Response includes public tunnel URL
# e.g., https://phantom-delta.wingmanux.com
```

#### Features
- Local relay server exposed via public URL
- Aviation-themed session URLs
- Supports WebSocket forwarding
- Optional P2P upgrade for better performance
- 24-hour session lifetime
- Automatic cleanup of stale tunnels

#### Use Cases
- Remote team collaboration
- Client demos of local development
- Cross-network testing
- Temporary sharing without deployment

#### Connection Modes
- **Relay Mode**: All traffic through tunnel server
- **P2P Mode**: Direct WebRTC connection when possible
- **Hybrid**: Starts with relay, upgrades to P2P

### 3. Tunnel-Only Mode

**Cloud-first approach using hosted tunnel server**

#### Setup
```bash
# Create session on hosted server
curl -X POST https://wingman-tunnel.fly.dev/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "developerId": "your-dev-id",
    "targetPort": 3000
  }'

# Get session URL like:
# https://maverick-alpha.wingman.dev
```

#### Features
- No local relay server needed
- Hosted at `wingman-tunnel.fly.dev`
- Beautiful PM interface with real-time status
- Aviation callsign URLs (e.g., `ghost-whiskey.wingman.dev`)
- WebSocket-based real-time updates
- 24-hour TTL with automatic cleanup

#### Use Cases
- Distributed teams
- No local setup for product managers
- Cloud-native workflows
- Production feedback collection

#### PM Interface
- Visit session URL to see live status
- Real-time connection indicators
- Beautiful gradient UI with glassmorphism
- Mobile-responsive design

### 4. Copy Mode

**Manual export and sharing of annotations**

#### Setup
```bash
# Start local server
npx wingman-cli serve

# Capture feedback via Chrome extension

# Export annotations via API
curl http://localhost:8787/annotations/last > feedback.json

# Or access all annotations
ls .wingman/annotations/
```

#### Features
- Export annotations as JSON files
- Manual sharing via email/Slack/tickets
- Full annotation data including screenshots
- No real-time requirements
- Complete offline capability

#### Use Cases
- Security-restricted environments
- Asynchronous review workflows
- Integration with existing tools
- Audit trail requirements
- Batch processing of feedback

#### Export Format
```json
{
  "id": "annotation-id",
  "timestamp": "2025-01-24T10:30:00Z",
  "url": "https://example.com",
  "selector": ".button.primary",
  "screenshot": "data:image/png;base64,...",
  "note": "Button color doesn't match design",
  "metadata": {
    "viewport": { "width": 1920, "height": 1080 },
    "userAgent": "..."
  }
}
```

### 5. Hybrid P2P Mode

**Direct peer-to-peer connections for optimal performance**

#### Setup
```bash
# Enable P2P when creating tunnel
curl -X POST http://localhost:8787/tunnel/create \
  -H "Content-Type: application/json" \
  -d '{"targetPort": 8787, "enableP2P": true}'
```

#### Features
- Initial connection via tunnel server (signaling)
- Automatic upgrade to WebRTC P2P when possible
- Falls back to relay mode if P2P fails
- Reduced latency (no server hop)
- Lower bandwidth usage on tunnel server
- Automatic reconnection handling

#### Use Cases
- Performance-critical applications
- High-frequency feedback sessions
- Bandwidth-sensitive environments
- Real-time collaboration
- Screen sharing scenarios

#### Connection Flow
```
1. Initial WebSocket connection to tunnel server
2. Exchange WebRTC offers/answers
3. Establish P2P data channel
4. Direct communication between peers
5. Fallback to relay if P2P fails
```

### 6. MCP-Integrated Mode

**AI-assisted development with Claude Code**

#### Setup
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

#### Features
- Automatic server startup via Claude Code
- Built-in MCP tools for annotation management
- AI-powered fix suggestions
- Integrated workflow with code editing

#### Available MCP Tools
- `wingman_list()` - List all UI feedback annotations
- `wingman_review(id?)` - Review specific or latest annotation
- `wingman_delete(id)` - Remove processed annotation

#### Available MCP Prompts
- `wingman_fix_ui` - Guided UI issue fixing workflow

#### Use Cases
- AI-assisted bug fixing
- Automated UI improvements
- Learning from feedback patterns
- Rapid iteration on UI issues

#### Example Workflow
```
1. User reports issue via Chrome extension
2. In Claude Code: "Check for wingman feedback"
3. Claude reviews annotation with screenshot
4. Claude identifies and fixes the issue
5. Claude cleans up processed annotation
```

## Configuration Options

### Chrome Extension Configuration

Different build configurations for various environments:

#### Development
```json
{
  "environment": "development",
  "relayUrl": "http://localhost:8787",
  "debug": true,
  "features": {
    "verboseLogging": true,
    "hotReload": true,
    "debugPanel": true
  }
}
```

#### Production
```json
{
  "environment": "production",
  "relayUrl": "http://localhost:8787",
  "debug": false,
  "features": {
    "verboseLogging": false,
    "hotReload": false,
    "debugPanel": false
  }
}
```

### CLI Server Options

```bash
# Basic options
wingman serve \
  --port 8787 \           # Server port (default: 8787)
  --host localhost        # Bind address (default: localhost)

# Environment variables
PORT=8787 \              # Override default port
NODE_ENV=production \    # Set environment
wingman serve
```

### Tunnel Configuration

```javascript
// Creating tunnel with options
{
  "targetPort": 8787,      // Local port to tunnel
  "enableP2P": true,       // Enable P2P upgrade
  "developerId": "dev-123" // Developer identifier
}
```

## Environment-Specific Setups

### Development Environment
```bash
# Use development manager script
npm run dev              # Start all services
npm run dev:status       # Check service status
npm run dev:logs         # Stream logs
```

### Staging Environment
- Configure Chrome extension with staging relay URL
- Use staging tunnel server if available
- Enable debug features for testing

### Production Environment
- Use production Chrome extension build
- Configure proper CORS origins
- Enable monitoring and logging
- Set up SSL certificates if needed

## Choosing the Right Mode

### Decision Matrix

| Mode | Best For | Network | Setup Complexity | Real-time |
|------|----------|---------|-----------------|-----------|
| **Local-Only** | Solo devs | Local | Low | Yes |
| **Local + Tunnel** | Remote teams | Hybrid | Medium | Yes |
| **Tunnel-Only** | Cloud teams | Cloud | Low | Yes |
| **Copy Mode** | Security/Async | Any | Low | No |
| **Hybrid P2P** | Performance | P2P | Medium | Yes |
| **MCP-Integrated** | AI workflow | Local | Low | Yes |

### Recommendations by Scenario

#### Solo Developer
- **Primary**: Local-Only Mode with MCP
- **Benefits**: Simple setup, full privacy, AI assistance

#### Small Team (2-5 people)
- **Primary**: Local + Tunnel Mode
- **Benefits**: Easy sharing, no infrastructure needed

#### Distributed Team
- **Primary**: Tunnel-Only Mode
- **Benefits**: No local setup for non-developers, always accessible

#### Enterprise
- **Primary**: Copy Mode or Custom Deployment
- **Benefits**: Full control, audit trail, security compliance

#### Performance-Critical
- **Primary**: Hybrid P2P Mode
- **Benefits**: Lowest latency, reduced server load

## Advanced Configurations

### Multi-Mode Setup

Run multiple modes simultaneously:

```bash
# Local server for development
npx wingman-cli serve --port 8787

# Tunnel for sharing
curl -X POST http://localhost:8787/tunnel/create

# MCP for Claude Code (automatic)
```

### Custom Deployment

Deploy your own tunnel server:

```bash
# Clone tunnel server
cd packages/tunnel-server

# Deploy to Fly.io
fly launch --name my-wingman-tunnel
fly deploy

# Configure Chrome extension
{
  "relayUrl": "https://my-wingman-tunnel.fly.dev"
}
```

### Storage Backends

Currently file-based, but extensible:

```javascript
// Current: File storage
.wingman/annotations/*.json

// Future: Database storage
PostgreSQL, Redis, S3, etc.
```

### Authentication (Future)

Planned authentication modes:
- API keys for developers
- Session tokens for PMs
- OAuth integration
- Team-based access control

### Monitoring and Analytics

Track usage and performance:

```bash
# Check tunnel status
curl http://localhost:8787/tunnel/status

# Monitor active sessions
curl https://wingman-tunnel.fly.dev/health

# View annotation count
ls -la .wingman/annotations/ | wc -l
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8787

# Use different port
wingman serve --port 3456
```

**Tunnel connection fails:**
```bash
# Check tunnel status
curl http://localhost:8787/tunnel/status

# Verify tunnel server is accessible
curl https://wingman-tunnel.fly.dev/health
```

**Chrome extension not connecting:**
- Verify relay server is running
- Check extension configuration
- Look at browser console for errors
- Ensure CORS is properly configured

**P2P connection not establishing:**
- Check firewall settings
- Verify WebRTC is not blocked
- Try relay mode as fallback
- Check browser compatibility

## Best Practices

1. **Start Simple**: Begin with Local-Only mode
2. **Add Complexity as Needed**: Upgrade to tunnel when sharing is required
3. **Monitor Performance**: Use appropriate mode for your latency requirements
4. **Secure Sensitive Data**: Use Copy Mode for sensitive projects
5. **Leverage AI**: Enable MCP for faster issue resolution
6. **Clean Up**: Regularly clean old annotations
7. **Document Your Setup**: Keep team informed about configuration

## Future Enhancements

Planned features for upcoming releases:

- **Authentication & Authorization**: Secure access control
- **Persistent Storage**: Database backends for scale
- **Advanced P2P**: Better NAT traversal, TURN servers
- **Analytics Dashboard**: Usage metrics and insights
- **Batch Operations**: Process multiple annotations
- **Integrations**: Jira, GitHub Issues, Slack
- **Mobile Support**: iOS/Android companion apps
- **Session Recording**: Full interaction replay

---

For more information, see:
- [README.md](README.md) - Project overview
- [CLAUDE.md](CLAUDE.md) - Development guide
- [Chrome Extension Docs](packages/chrome-extension/README.md)
- [Tunnel Server Docs](packages/tunnel-server/README.md)