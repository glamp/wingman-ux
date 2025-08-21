# Phase 5: Production Readiness

## Objective
Prepare the tunnel system for production use with monitoring, analytics, security hardening, and operational excellence features.

## Deliverables

### 1. Monitoring & Analytics
- Performance metrics collection
- Usage analytics and insights
- Error tracking and alerting
- Health monitoring dashboard

### 2. Security & Rate Limiting
- Session authentication and validation
- Rate limiting and abuse prevention
- Security headers and CORS policies
- Audit logging

### 3. Operational Excellence
- Automated deployment pipeline
- Health checks and auto-recovery
- Configuration management
- Documentation and runbooks

### 4. Advanced Features
- Custom domain support for enterprises
- Session sharing and collaboration
- Advanced tunnel configuration
- API for programmatic access

## File Structure

```
packages/tunnel-server/src/
├── middleware/
│   ├── rate-limiter.ts       # Rate limiting and abuse prevention
│   ├── security.ts           # Security headers and validation
│   ├── analytics.ts          # Usage tracking and metrics
│   └── cors.ts              # CORS policy management
├── monitoring/
│   ├── health-check.ts       # Health monitoring endpoints
│   ├── metrics.ts            # Performance metrics collection
│   └── alerts.ts             # Alert configuration
├── auth/
│   ├── session-auth.ts       # Session authentication
│   └── api-keys.ts           # API key management
└── deploy/
    ├── docker-compose.yml    # Local development stack
    ├── fly.toml              # Production deployment
    └── .github/workflows/    # CI/CD pipeline

packages/shared/src/
├── monitoring-types.ts       # Monitoring and metrics types
└── security-types.ts        # Security-related types

docs/
├── deployment.md            # Deployment guide
├── monitoring.md            # Monitoring setup
├── security.md              # Security best practices
└── api.md                   # API documentation
```

## Implementation Details

### Performance Monitoring
```typescript
interface TunnelMetrics {
  sessionCount: number;
  activeConnections: number;
  requestsPerSecond: number;
  p2pSuccessRate: number;
  averageLatency: number;
  errorRate: number;
  bandwidthUsage: number;
}

class MetricsCollector {
  private metrics: TunnelMetrics = {
    sessionCount: 0,
    activeConnections: 0,
    requestsPerSecond: 0,
    p2pSuccessRate: 0,
    averageLatency: 0,
    errorRate: 0,
    bandwidthUsage: 0
  };
  
  // Collect performance metrics
  recordRequest(duration: number, success: boolean): void {
    this.metrics.requestsPerSecond++;
    this.updateLatency(duration);
    if (!success) this.metrics.errorRate++;
  }
  
  recordP2PAttempt(successful: boolean): void {
    this.updateP2PSuccessRate(successful);
  }
  
  recordBandwidth(bytes: number): void {
    this.metrics.bandwidthUsage += bytes;
  }
  
  // Export metrics for monitoring systems
  getMetrics(): TunnelMetrics {
    return { ...this.metrics };
  }
  
  // Reset counters (called periodically)
  reset(): void {
    this.metrics.requestsPerSecond = 0;
    this.metrics.errorRate = 0;
  }
}
```

### Rate Limiting & Security
```typescript
class RateLimiter {
  private limits = {
    sessionCreation: { window: 3600000, max: 10 }, // 10 sessions per hour
    requests: { window: 60000, max: 1000 },        // 1000 requests per minute
    bandwidth: { window: 3600000, max: 1024 * 1024 * 1024 } // 1GB per hour
  };
  
  // Check if action is allowed
  async checkLimit(
    key: string, 
    action: 'sessionCreation' | 'requests' | 'bandwidth',
    amount: number = 1
  ): Promise<boolean> {
    const limit = this.limits[action];
    const current = await this.getCurrentUsage(key, action, limit.window);
    
    return (current + amount) <= limit.max;
  }
  
  // Record usage
  async recordUsage(
    key: string,
    action: 'sessionCreation' | 'requests' | 'bandwidth',
    amount: number = 1
  ): Promise<void> {
    // Store in Redis or in-memory store with TTL
    await this.incrementCounter(key, action, amount);
  }
}

class SecurityMiddleware {
  // Apply security headers
  applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', this.getCSPPolicy());
    next();
  }
  
  // Validate session tokens
  validateSession(req: Request, res: Response, next: NextFunction): void {
    const sessionId = req.params.sessionId;
    
    if (!this.isValidSessionFormat(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    if (this.isSessionExpired(sessionId)) {
      return res.status(410).json({ error: 'Session expired' });
    }
    
    next();
  }
}
```

### Health Monitoring
```typescript
class HealthMonitor {
  private healthChecks = new Map<string, HealthCheck>();
  
  // Register health checks
  registerCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }
  
  // Run all health checks
  async runHealthChecks(): Promise<HealthStatus> {
    const results: Record<string, CheckResult> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    for (const [name, check] of this.healthChecks) {
      try {
        const result = await Promise.race([
          check.run(),
          this.timeout(5000) // 5 second timeout
        ]);
        
        results[name] = { status: 'pass', ...result };
      } catch (error) {
        results[name] = { 
          status: 'fail', 
          error: error.message 
        };
        overallStatus = 'unhealthy';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      version: process.env.npm_package_version
    };
  }
}

// Health check implementations
const databaseCheck: HealthCheck = {
  async run() {
    // Check database connectivity
    const start = Date.now();
    await db.ping();
    return { responseTime: Date.now() - start };
  }
};

const tunnelCapacityCheck: HealthCheck = {
  async run() {
    const activeConnections = sessionManager.getActiveConnectionCount();
    const maxConnections = parseInt(process.env.MAX_CONNECTIONS || '100');
    
    if (activeConnections >= maxConnections * 0.9) {
      throw new Error(`High connection usage: ${activeConnections}/${maxConnections}`);
    }
    
    return { activeConnections, maxConnections };
  }
};
```

### Analytics & Insights
```typescript
class AnalyticsCollector {
  // Track usage patterns
  trackSessionCreated(session: TunnelSession): void {
    this.recordEvent('session_created', {
      sessionId: session.id,
      port: session.targetPort,
      timestamp: session.createdAt,
      userAgent: session.userAgent,
      country: session.geoLocation?.country
    });
  }
  
  trackConnectionAttempt(sessionId: string, type: 'p2p' | 'relay', success: boolean): void {
    this.recordEvent('connection_attempt', {
      sessionId,
      connectionType: type,
      success,
      timestamp: new Date()
    });
  }
  
  trackRequest(sessionId: string, method: string, path: string, duration: number): void {
    this.recordEvent('request', {
      sessionId,
      method,
      path: this.sanitizePath(path),
      duration,
      timestamp: new Date()
    });
  }
  
  // Generate usage insights
  async generateInsights(timeframe: 'day' | 'week' | 'month'): Promise<UsageInsights> {
    const events = await this.getEvents(timeframe);
    
    return {
      totalSessions: this.countEvents(events, 'session_created'),
      p2pSuccessRate: this.calculateP2PSuccessRate(events),
      averageSessionDuration: this.calculateAverageSessionDuration(events),
      popularFrameworks: this.getPopularFrameworks(events),
      peakUsageHours: this.getPeakUsageHours(events),
      errorRate: this.calculateErrorRate(events)
    };
  }
}
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Tunnel Server

on:
  push:
    branches: [main]
    paths: ['packages/tunnel-server/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: packages/tunnel-server
      
      - name: Run tests
        run: npm test
        working-directory: packages/tunnel-server
      
      - name: Run security audit
        run: npm audit --audit-level moderate
        working-directory: packages/tunnel-server

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Fly
        uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        working-directory: packages/tunnel-server
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      
      - name: Health check
        run: |
          sleep 30
          curl -f https://wingman-tunnel.fly.dev/health || exit 1
```

### Configuration Management
```typescript
// Environment-based configuration
class Config {
  static get server() {
    return {
      port: parseInt(process.env.PORT || '8080'),
      host: process.env.HOST || '0.0.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  static get tunnel() {
    return {
      maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
      p2pEnabled: process.env.P2P_ENABLED === 'true',
      stunServers: (process.env.STUN_SERVERS || '').split(',').filter(Boolean)
    };
  }
  
  static get security() {
    return {
      rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
      sessionSecretKey: process.env.SESSION_SECRET_KEY || 'dev-secret'
    };
  }
  
  static get monitoring() {
    return {
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
      analyticsEnabled: process.env.ANALYTICS_ENABLED !== 'false',
      logLevel: process.env.LOG_LEVEL || 'info'
    };
  }
}
```

## Advanced Features

### Custom Domain Support
```typescript
class DomainManager {
  private customDomains = new Map<string, CustomerConfig>();
  
  // Allow enterprise customers to use custom domains
  registerCustomDomain(domain: string, config: CustomerConfig): void {
    this.customDomains.set(domain, config);
  }
  
  // Route requests based on domain
  routeRequest(req: Request): RoutingResult {
    const host = req.headers.host;
    
    if (this.customDomains.has(host)) {
      return {
        type: 'custom_domain',
        config: this.customDomains.get(host),
        sessionId: this.extractSessionFromSubdomain(host)
      };
    }
    
    return {
      type: 'standard',
      sessionId: this.extractSessionFromPath(req.path)
    };
  }
}
```

### API for Programmatic Access
```typescript
// REST API for tunnel management
app.post('/api/v1/tunnels', async (req, res) => {
  const { port, duration, customDomain } = req.body;
  
  try {
    const session = await tunnelManager.createSession({
      port,
      duration: duration || 3600, // 1 hour default
      customDomain
    });
    
    res.json({
      sessionId: session.id,
      url: session.url,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/tunnels/:sessionId', async (req, res) => {
  const session = await tunnelManager.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId: session.id,
    status: session.status,
    createdAt: session.createdAt,
    connections: session.connectionCount,
    bytesTransferred: session.bytesTransferred
  });
});
```

## Deployment Strategy

### Blue-Green Deployment
```typescript
// Health check endpoint for load balancer
app.get('/health', async (req, res) => {
  const health = await healthMonitor.runHealthChecks();
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  
  // Stop accepting new connections
  server.close();
  
  // Wait for existing connections to finish
  await tunnelManager.gracefulShutdown(30000); // 30 second timeout
  
  process.exit(0);
});
```

### Database Migration Strategy
```typescript
// For when we add persistent storage
class MigrationRunner {
  async runMigrations(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    
    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}`);
      await migration.run();
      await this.markMigrationComplete(migration);
    }
  }
}
```

## Monitoring Dashboard

### Key Metrics Display
- Real-time connection count
- P2P vs relay usage ratio
- Error rates and response times
- Bandwidth utilization
- Geographic distribution of users

### Alerting Rules
- High error rate (>5%)
- High connection usage (>80% capacity)
- P2P success rate drop (<50%)
- High response times (>500ms p95)
- Service health check failures

## Security Hardening

### Input Validation
```typescript
const sessionIdSchema = {
  type: 'string',
  pattern: '^[a-zA-Z0-9]{8,32}$'
};

const createSessionSchema = {
  type: 'object',
  properties: {
    port: { type: 'number', minimum: 1000, maximum: 65535 },
    duration: { type: 'number', minimum: 60, maximum: 86400 }
  },
  required: ['port']
};
```

### Audit Logging
```typescript
class AuditLogger {
  logSecurityEvent(event: SecurityEvent): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'security_event',
      event: event.type,
      sessionId: event.sessionId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details
    }));
  }
}
```

## Testing Strategy

### Load Testing
```typescript
// Load test with artillery.io
module.exports = {
  config: {
    target: 'https://wingman-tunnel.fly.dev',
    phases: [
      { duration: 60, arrivalRate: 10 }, // Ramp up
      { duration: 300, arrivalRate: 50 }, // Sustained load
      { duration: 60, arrivalRate: 100 } // Peak load
    ]
  },
  scenarios: [
    {
      name: 'Create and use tunnel',
      weight: 100,
      flow: [
        { post: { url: '/api/v1/tunnels', json: { port: 3000 } } },
        { get: { url: '/session/{{ sessionId }}' } },
        { get: { url: '/session/{{ sessionId }}/api/health' } }
      ]
    }
  ]
};
```

### Security Testing
- OWASP ZAP automated security scanning
- Penetration testing for session management
- Rate limiting verification
- Input validation testing

## Documentation

### API Documentation
- OpenAPI/Swagger specification
- SDK examples in multiple languages
- Rate limiting and authentication docs
- Error codes and troubleshooting

### Operational Runbooks
- Deployment procedures
- Incident response playbooks
- Scaling guidelines
- Backup and recovery procedures

## Acceptance Criteria

✅ Comprehensive monitoring and alerting in place  
✅ Security hardening and rate limiting implemented  
✅ CI/CD pipeline with automated testing  
✅ Health checks and graceful shutdown  
✅ Performance meets targets under load  
✅ Documentation complete and accurate  
✅ Security audit passed  
✅ Load testing validates capacity  
✅ Analytics and insights available  
✅ Production deployment successful  

## Performance Targets
- 99.9% uptime SLA
- <100ms p95 response time for tunnel requests
- Support 1000+ concurrent sessions
- <1% error rate under normal load
- P2P success rate >60% across network types

## Dependencies
- Monitoring platform (Fly.io metrics or external)
- Error tracking service (optional)
- Analytics storage (if persistent analytics needed)
- Security scanning tools

## Estimated Timeline
**3-4 weeks**

## Post-Launch
- Monitor usage patterns and optimize
- Collect user feedback and iterate
- Plan future enhancements based on data
- Scale infrastructure as needed