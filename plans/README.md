# Wingman Tunnel Implementation Plan

## Overview

This directory contains the phased implementation plan for adding tunnel functionality to Wingman. The tunnel feature enables developers to share their localhost development environment with product managers and team members via a secure, shareable URL.

## Architecture Summary

**Hybrid P2P + Relay System:**

- **P2P WebRTC** for direct browser-to-browser connections (70% of cases, zero cost)
- **Fly.io Relay** for fallback when P2P fails (30% of cases, minimal cost)
- **Custom Domain** (session-abc123.wingmanux.com) for professional user experience
- **Auth Preservation** to maintain login sessions and OAuth flows

## Implementation Phases

### [Phase 1: Tunnel Server Foundation](./phase-1-tunnel-server-foundation.md)

**Timeline: 1-2 weeks**

Create the basic tunnel server infrastructure that can accept session requests and serve PM access pages.

**Key Deliverables:**

- New `packages/tunnel-server` with Express server
- Session management system
- Basic PM access page at `session-{id}.wingmanux.com`
- Fly.io deployment configuration

**Testing:** Session creation, page serving, basic WebSocket connections

### [Phase 2: Relay Proxy](./phase-2-relay-proxy.md)

**Timeline: 2-3 weeks**

Implement HTTP/WebSocket relay functionality so PM can access developer's localhost through the tunnel server.

**Key Deliverables:**

- HTTP request forwarding with header preservation
- WebSocket proxy support
- Tunnel client integration in relay server
- End-to-end tunnel flow working

**Testing:** Full HTTP tunnel, auth flow preservation, WebSocket proxying

### [Phase 3: P2P WebRTC](./phase-3-p2p-webrtc.md)

**Timeline: 3-4 weeks**

Add peer-to-peer WebRTC functionality to enable direct browser-to-browser connections with automatic fallback to relay.

**Key Deliverables:**

- WebRTC signaling server
- P2P client (browser) and host (Node.js)
- Service Worker for request interception
- Automatic fallback to relay when P2P fails

**Testing:** P2P connection establishment, data channel tunneling, fallback scenarios

### [Phase 4: Chrome Extension Integration](./phase-4-chrome-extension-integration.md)

**Timeline: 2-3 weeks**

Integrate tunnel functionality into the Chrome extension UI with auto-detection and user-friendly controls.

**Key Deliverables:**

- "Share Live" button in extension overlay
- Auto-detection of development server and port
- Tunnel URL sharing and QR code generation
- Session management and status display

**Testing:** UI components, auto-detection accuracy, user experience flows

### [Phase 5: Production Readiness](./phase-5-production-readiness.md)

**Timeline: 3-4 weeks**

Prepare the tunnel system for production use with monitoring, security, and operational excellence.

**Key Deliverables:**

- Performance monitoring and analytics
- Security hardening and rate limiting
- CI/CD pipeline and health monitoring
- Advanced features (custom domains, APIs)

**Testing:** Load testing, security audit, monitoring validation

## Total Timeline

**11-16 weeks** for complete implementation

## Technology Stack

### Infrastructure

- **Tunnel Server:** Node.js + Express on Fly.io
- **Domain:** `*.wingmanux.com` wildcard DNS
- **WebSocket:** Native WebSocket for signaling
- **P2P:** WebRTC with STUN servers

### Development

- **Language:** TypeScript throughout
- **Testing:** Vitest for unit tests, Playwright for E2E
- **CI/CD:** GitHub Actions with Fly.io deployment
- **Monitoring:** Fly.io metrics + custom analytics

## Cost Projections

### Development Costs

- **Domain:** $12/year (wingmanux.com)
- **Fly.io:** $0-20/month (scales with usage)
- **Development Time:** ~3-4 months full-time equivalent

### Operational Costs (Monthly)

- **Small Scale (100 sessions/day):** $0 (under free tier)
- **Medium Scale (1,000 sessions/day):** $0-5
- **Large Scale (10,000 sessions/day):** $10-50

## Risk Mitigation

### Technical Risks

- **P2P Failure Rate:** Mitigated by automatic relay fallback
- **Auth Complexity:** Handled by header preservation and domain strategy
- **Scale Issues:** Addressed by Fly.io auto-scaling and monitoring

### Operational Risks

- **Abuse Prevention:** Rate limiting and session management
- **Privacy Concerns:** Sessions are temporary and expire automatically
- **Reliability:** Health monitoring and graceful degradation

## Success Metrics

### Technical Metrics

- P2P success rate >60%
- Tunnel creation time <5 seconds
- 99.9% uptime SLA
- <100ms additional latency

### User Metrics

- Tunnel usage adoption rate
- Session duration and engagement
- User feedback and satisfaction
- Integration with existing Wingman workflows

## Getting Started

1. **Start with Phase 1** to establish the foundation
2. **Each phase is independently testable** and provides value
3. **Phases can be adjusted** based on feedback and priorities
4. **Documentation and testing** are integral to each phase

## Dependencies

### External Services

- Fly.io account and configuration
- Domain registration (wingmanux.com)
- STUN servers (free: Google, Cloudflare)

### Internal Dependencies

- Existing Wingman relay server architecture
- Chrome extension framework
- Shared types package

## Future Enhancements

### Post-MVP Features

- **Enterprise Features:** Custom domains, SSO integration
- **Mobile Support:** Native mobile apps for testing
- **Collaboration:** Multi-user sessions and screen sharing
- **Analytics:** Detailed usage insights and optimization

### Scaling Considerations

- **Multi-region deployment** for global performance
- **Database backend** for persistent session management
- **CDN integration** for static asset delivery
- **Load balancing** for high-availability deployment

This phased approach ensures that each milestone delivers working functionality while building toward the complete tunnel system that will significantly enhance Wingman's value proposition for development teams.
