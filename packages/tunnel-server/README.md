# 🛩️ Wingman Tunnel Server

The tunnel server provides the foundation for P2P connections between developers and product managers. It manages tunnel sessions and serves beautiful PM access pages with aviation-themed URLs.

## ✨ Features

- **🎯 Aviation Callsign URLs**: Cool session URLs like `ghost-whiskey.wingman.dev` and `maverick-alpha.wingman.dev`
- **🖥️ Beautiful PM Interface**: Gorgeous gradient UI with real-time connection status  
- **🔄 WebSocket Support**: Real-time communication for connection updates
- **💾 Session Management**: Create, track, and expire tunnel sessions (24-hour TTL)
- **🩺 Health Monitoring**: Built-in health checks and automatic session cleanup
- **☁️ Fly.io Ready**: Production-ready with Docker and health checks

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server runs on http://localhost:9876
```

## 📡 API Endpoints

### Create Session
```bash
POST /api/sessions
Content-Type: application/json

{
  "developerId": "your-dev-id",
  "targetPort": 3000
}
```

**Response:**
```json
{
  "sessionId": "phantom-delta",
  "session": {
    "id": "phantom-delta",
    "developerId": "your-dev-id",
    "targetPort": 3000,
    "createdAt": "2025-08-21T02:33:25.814Z",
    "expiresAt": "2025-08-22T02:33:25.814Z",
    "status": "pending"
  },
  "tunnelUrl": "https://phantom-delta.wingman.dev"
}
```

### Get Session Details
```bash
GET /api/sessions/{sessionId}
```

### PM Access Page
```bash
GET /sessions/{sessionId}
```

Beautiful HTML page for product managers with:
- Real-time connection status with animated indicators
- Modern gradient design with glassmorphism effects
- Responsive layout for desktop and mobile
- WebSocket client for live updates

### Health Check
```bash
GET /health
```

Returns server status and active session count.

## 🎨 Session URL Format

Sessions use aviation callsigns + NATO phonetic alphabet:

- **Callsigns**: `maverick`, `iceman`, `ghost`, `phantom`, `viper`, `lightning`, etc.
- **Phonetic**: `alpha`, `bravo`, `charlie`, `delta`, `echo`, `foxtrot`, etc.
- **Format**: `{callsign}-{phonetic}.wingman.dev`

**Examples:**
- `https://maverick-alpha.wingman.dev`
- `https://ghost-whiskey.wingman.dev`  
- `https://lightning-oscar.wingman.dev`
- `https://phantom-tango.wingman.dev`

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 🧪 Testing

### Test Suites

The tunnel server includes comprehensive test coverage with both local unit tests and production integration tests:

#### Local Tests
- **Unit tests**: Session manager CRUD operations
- **API Integration tests**: Express endpoints and WebSocket connections  
- **Static file tests**: CSS/JS serving verification

#### Production Tests
- **Health checks**: Server availability and monitoring
- **Session persistence**: Cross-request session storage
- **WebSocket connectivity**: Real-time connection testing
- **Error handling**: Malformed requests and edge cases
- **Performance benchmarks**: Response time validation

### Running Tests

```bash
# Run ALL tests (local + production)
npm test

# Run ONLY local unit tests (fast, no network)
npm run test:local

# Run ONLY production integration tests (requires deployed server)
npm run test:production

# Run tests in watch mode during development
npm run test:watch

# Run a specific test file
npx vitest src/__tests__/api.test.ts --run

# Run tests with coverage report
npm test -- --coverage
```

### Test Configuration

Tests use Vitest as the test runner with the following setup:
- **Test files**: Located in `src/__tests__/`
- **Test environment**: Node.js
- **Assertion library**: Vitest's built-in expect
- **HTTP testing**: Supertest for API integration tests
- **WebSocket testing**: ws library for real-time testing

### Production Test Environment

Production tests run against the deployed Fly.io instance by default. To test against a different server:

```bash
# Test against a custom URL
TEST_URL=https://your-server.com npm run test:production
```

### Test Results

Current test status (as of 2025-08-22):
- **Local tests**: 25/25 passing ✅
- **Production tests**: 25/25 passing ✅
- **Total tests**: 50/50 passing ✅
- **Test coverage**: ~96% of critical paths

All tests include:
- Session CRUD operations
- WebSocket connectivity
- Error handling (including malformed JSON)
- Static file serving
- Performance benchmarks

### CI/CD Integration

To run tests in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run local tests
  run: npm run test:local
  
- name: Run production tests
  run: npm run test:production
  env:
    TEST_URL: ${{ secrets.PRODUCTION_URL }}
```

## 📋 Session Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CREATED   │───▶│   PENDING   │───▶│   ACTIVE    │───▶│   EXPIRED   │
│             │    │             │    │             │    │             │
│ Session     │    │ Waiting for │    │ Tunnel      │    │ 24hr TTL    │
│ record      │    │ developer   │    │ connected   │    │ cleanup     │
│ created     │    │ connection  │    │ PM can view │    │ automatic   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Developer     │    │ Tunnel Server   │    │ Product Manager │
│                 │    │                 │    │                 │
│ 1. POST /api/   │───▶│ 2. Create       │    │                 │
│    sessions     │    │    Session      │    │                 │
│                 │    │    (callsign)   │    │                 │
│ 3. Get tunnel   │◀───│ 4. Return       │    │                 │
│    URL          │    │    cool URL     │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 5. PM visits    │◀───│ 6. Open         │
│                 │    │    session URL  │    │    ghost-alpha  │
│                 │    │                 │    │    .wingman.dev │
│                 │    │                 │    │                 │
│ 7. Connect via  │◀──▶│ 8. WebSocket    │◀──▶│ 9. Real-time    │
│    WebSocket    │    │    signaling    │    │    status       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ☁️ Deployment

### Fly.io Deployment

```bash
# Login to Fly.io
fly auth login

# Deploy (first time)
fly launch --copy-config --name wingman-tunnel

# Subsequent deploys
fly deploy

# Check status
fly status
fly logs
```

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `PORT`: Server port (default: 9876)

### DNS Setup

Configure wildcard DNS for session URLs:
- Point `*.wingman.dev` to your Fly.io app
- Session URLs like `phantom-delta.wingman.dev` will route to the server

## 🐳 Docker

```bash
# Build image
docker build -t wingman-tunnel .

# Run container
docker run -p 9876:9876 wingman-tunnel

# Health check
curl http://localhost:9876/health
```

## 📊 Monitoring

The server includes built-in monitoring:

- **Health endpoint**: `/health` returns status and session count
- **Session cleanup**: Automatic removal of expired sessions every minute
- **Request logging**: Development mode logs all requests
- **Error handling**: Structured error responses with codes

## 🔐 Security Considerations

- **CORS enabled**: For browser access from different origins
- **Input validation**: All API endpoints validate required fields
- **Session expiry**: 24-hour TTL prevents indefinite resource usage
- **No authentication**: Phase 1 implementation (add auth in Phase 2+)

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js for HTTP server
- **WebSocket**: `ws` library for real-time communication
- **Testing**: Vitest with Supertest for integration tests
- **Build**: TypeScript compiler with strict configuration
- **Deployment**: Docker + Fly.io with health checks

## 📈 Performance

- **Memory efficient**: In-memory session storage for Phase 1
- **Fast responses**: Minimal middleware stack
- **Health checks**: Built-in monitoring for uptime
- **Session cleanup**: Automatic garbage collection
- **Static files**: Optimized CSS/JS serving

## 🔮 Future Enhancements

- **Persistent storage**: Redis/PostgreSQL for session data
- **Authentication**: Developer API keys and PM access control  
- **Rate limiting**: Prevent abuse of session creation
- **Metrics**: Prometheus/StatsD integration
- **Scaling**: Multiple server instances with shared storage

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :9876

# Kill the process or use different port
PORT=8765 npm run dev
```

**WebSocket connection fails:**
```bash
# Check server logs
npm run dev

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:9876/ws
```

**Session not found:**
- Sessions expire after 24 hours
- Check session ID format: `{callsign}-{phonetic}`
- Verify session exists: `GET /api/sessions/{id}`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## 📄 License

Part of the Wingman project - see root LICENSE file.

---

Made with ❤️ for seamless developer-PM collaboration. Fly high! 🛩️