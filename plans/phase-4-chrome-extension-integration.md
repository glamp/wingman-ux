# Phase 4: Chrome Extension Integration

## Objective
Integrate tunnel functionality into the Chrome extension UI, providing developers with seamless tunnel creation and management directly from the extension overlay.

## Deliverables

### 1. Tunnel UI Components
- "Share Live" button in extension overlay
- Tunnel URL display and sharing controls
- Connection status indicators
- QR code generation for mobile testing

### 2. Auto-Detection Features
- Detect local development server automatically
- Smart port detection for common frameworks
- Framework-specific optimization hints

### 3. User Experience Enhancements
- One-click tunnel creation
- Copy/share tunnel URL
- Session management and history
- Error handling and user feedback

## File Structure

```
packages/chrome-extension/src/
├── content/
│   ├── tunnel-ui.ts          # Tunnel controls in overlay
│   ├── tunnel-status.ts      # Connection status display
│   └── auto-detect.ts        # Framework/port detection
├── background/
│   ├── tunnel-manager.ts     # Manage tunnel lifecycle
│   └── tunnel-storage.ts     # Session persistence
├── popup/
│   ├── tunnel-panel.ts       # Tunnel management panel
│   └── tunnel-history.ts     # Previous sessions
└── components/
    ├── qr-generator.ts       # QR code generation
    └── share-controls.ts     # URL sharing widgets
```

## Implementation Details

### Tunnel UI Integration
```typescript
class TunnelUI {
  private tunnelStatus: 'inactive' | 'starting' | 'active' | 'error' = 'inactive';
  private currentTunnelUrl: string | null = null;
  
  // Add tunnel section to existing Wingman overlay
  renderTunnelControls(): HTMLElement {
    return html`
      <div class="wingman-tunnel-section">
        <div class="tunnel-header">
          <h3>Share Live Preview</h3>
          <span class="tunnel-status ${this.tunnelStatus}">${this.getStatusText()}</span>
        </div>
        
        ${this.tunnelStatus === 'inactive' ? this.renderStartButton() : ''}
        ${this.tunnelStatus === 'active' ? this.renderActiveControls() : ''}
        ${this.tunnelStatus === 'error' ? this.renderErrorState() : ''}
      </div>
    `;
  }
  
  private renderStartButton(): HTMLElement {
    return html`
      <div class="tunnel-start">
        <div class="detected-server">
          <span>📡 Detected: ${this.detectedFramework} on port ${this.detectedPort}</span>
        </div>
        <button id="start-tunnel" class="wingman-button primary">
          Start Live Sharing
        </button>
      </div>
    `;
  }
  
  private renderActiveControls(): HTMLElement {
    return html`
      <div class="tunnel-active">
        <div class="tunnel-url">
          <input readonly value="${this.currentTunnelUrl}" id="tunnel-url-input" />
          <div class="url-controls">
            <button id="copy-url" class="wingman-button secondary">📋 Copy</button>
            <button id="qr-code" class="wingman-button secondary">📱 QR</button>
            <button id="stop-tunnel" class="wingman-button danger">🔴 Stop</button>
          </div>
        </div>
        <div class="tunnel-stats">
          <span>👥 ${this.connectionCount} connected</span>
          <span>📊 ${this.requestCount} requests</span>
        </div>
      </div>
    `;
  }
}
```

### Auto-Detection System
```typescript
class FrameworkDetector {
  private readonly frameworks = {
    'Next.js': { port: 3000, indicators: ['next.config.js', '.next/'] },
    'React': { port: 3000, indicators: ['react-scripts', 'src/App.js'] },
    'Vue.js': { port: 8080, indicators: ['vue.config.js', 'src/main.js'] },
    'Angular': { port: 4200, indicators: ['angular.json', 'src/main.ts'] },
    'Vite': { port: 5173, indicators: ['vite.config.js'] },
    'Express': { port: 3000, indicators: ['package.json:express'] },
    'Rails': { port: 3000, indicators: ['Gemfile', 'config/routes.rb'] },
    'Django': { port: 8000, indicators: ['manage.py', 'settings.py'] }
  };
  
  // Detect what framework is running
  async detectFramework(): Promise<DetectedFramework | null> {
    const currentUrl = window.location.href;
    const probablePort = this.extractPortFromUrl(currentUrl);
    
    // Check for framework indicators in the page
    const detectedFramework = await this.scanForIndicators();
    
    return {
      framework: detectedFramework?.name || 'Unknown',
      port: probablePort || detectedFramework?.port || 3000,
      confidence: this.calculateConfidence()
    };
  }
  
  // Scan common development server ports
  async scanCommonPorts(): Promise<number[]> {
    const commonPorts = [3000, 3001, 8080, 8000, 4200, 5173, 8787];
    const activePorts = [];
    
    for (const port of commonPorts) {
      try {
        await fetch(`http://localhost:${port}`, { mode: 'no-cors' });
        activePorts.push(port);
      } catch {
        // Port not active
      }
    }
    
    return activePorts;
  }
}
```

### Tunnel Manager (Background Script)
```typescript
class TunnelManager {
  private activeTunnels = new Map<string, TunnelSession>();
  
  // Start tunnel and manage lifecycle
  async startTunnel(port: number): Promise<TunnelResult> {
    try {
      // Call relay server to start tunnel
      const response = await fetch('http://localhost:8787/tunnel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start tunnel: ${response.statusText}`);
      }
      
      const { tunnelUrl, sessionId } = await response.json();
      
      // Store session
      const session: TunnelSession = {
        id: sessionId,
        url: tunnelUrl,
        port,
        startedAt: new Date(),
        status: 'active'
      };
      
      this.activeTunnels.set(sessionId, session);
      await this.saveTunnelHistory(session);
      
      // Monitor tunnel health
      this.startHealthMonitoring(sessionId);
      
      return { success: true, url: tunnelUrl, sessionId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Monitor tunnel connection health
  private startHealthMonitoring(sessionId: string): void {
    const healthCheck = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8787/tunnel/status');
        const status = await response.json();
        
        if (!status.active) {
          this.handleTunnelDisconnection(sessionId);
          clearInterval(healthCheck);
        }
      } catch {
        this.handleTunnelDisconnection(sessionId);
        clearInterval(healthCheck);
      }
    }, 10000); // Check every 10 seconds
  }
}
```

### QR Code Generation
```typescript
class QRGenerator {
  // Generate QR code for mobile testing
  async generateQR(url: string): Promise<string> {
    // Use a simple QR code library or API
    const qrData = await this.createQRCode(url, {
      width: 200,
      height: 200,
      errorCorrectionLevel: 'M'
    });
    
    return qrData; // Base64 image data
  }
  
  // Show QR modal
  showQRModal(url: string): void {
    const modal = this.createModal(`
      <div class="qr-modal">
        <h3>Scan with Mobile Device</h3>
        <div class="qr-code">
          <img src="${this.generateQR(url)}" alt="QR Code" />
        </div>
        <p>Scan this code to test on mobile devices</p>
        <div class="url-display">${url}</div>
      </div>
    `);
    
    document.body.appendChild(modal);
  }
}
```

## User Interface Design

### Tunnel Controls Placement
```css
.wingman-tunnel-section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #f8fafc;
}

.tunnel-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.tunnel-status.active {
  background: #dcfce7;
  color: #166534;
}

.tunnel-status.starting {
  background: #fef3c7;
  color: #92400e;
}

.tunnel-url input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
```

### Extension Popup Panel
```typescript
class TunnelPanel {
  renderPopupView(): HTMLElement {
    return html`
      <div class="tunnel-popup-panel">
        <h2>Live Sharing</h2>
        
        ${this.hasActiveTunnel() ? this.renderActiveSession() : this.renderInactive()}
        
        <div class="tunnel-history">
          <h3>Recent Sessions</h3>
          ${this.renderTunnelHistory()}
        </div>
        
        <div class="tunnel-settings">
          <label>
            <input type="checkbox" ${this.settings.autoStart ? 'checked' : ''} />
            Auto-start tunnel when extension opens
          </label>
        </div>
      </div>
    `;
  }
}
```

## Integration with Existing Features

### Wingman Annotation Flow
```typescript
// Enhanced annotation flow with tunnel context
class WingmanAnnotation {
  captureWithTunnel(): WingmanAnnotationPayload {
    const basePayload = this.captureBasic();
    
    // Add tunnel context if active
    if (this.tunnelManager.isActive()) {
      basePayload.tunnel = {
        sessionId: this.tunnelManager.getSessionId(),
        url: this.tunnelManager.getTunnelUrl(),
        isP2P: this.tunnelManager.isP2PActive()
      };
    }
    
    return basePayload;
  }
}
```

### Copy for Claude Integration
```typescript
// Include tunnel URL in "Copy for Claude" output
function generateCopyForClaude(): string {
  const annotation = captureCurrentAnnotation();
  let output = generateStandardCopy(annotation);
  
  // Add tunnel information if available
  if (annotation.tunnel) {
    output += `\n\n## Live Preview\nAccess the live application: ${annotation.tunnel.url}\n`;
  }
  
  return output;
}
```

## Testing Strategy

### UI Component Tests
```typescript
describe('TunnelUI', () => {
  it('shows start button when tunnel inactive', () => {
    const ui = new TunnelUI();
    const element = ui.renderTunnelControls();
    expect(element.querySelector('#start-tunnel')).toBeTruthy();
  });
  
  it('shows URL controls when tunnel active', () => {
    const ui = new TunnelUI();
    ui.tunnelStatus = 'active';
    ui.currentTunnelUrl = 'https://session-123.wingman.dev';
    
    const element = ui.renderTunnelControls();
    expect(element.querySelector('#tunnel-url-input')).toBeTruthy();
    expect(element.querySelector('#copy-url')).toBeTruthy();
  });
});
```

### Auto-Detection Tests
- Test framework detection accuracy
- Verify port scanning functionality
- Test on various development setups

### Integration Tests
- Full tunnel creation flow
- Copy URL functionality
- QR code generation
- Session persistence

## Error Handling

### Common Error Scenarios
```typescript
class TunnelErrorHandler {
  handleError(error: TunnelError): void {
    switch (error.type) {
      case 'RELAY_SERVER_UNREACHABLE':
        this.showError('Cannot connect to Wingman relay server. Is it running?');
        break;
        
      case 'PORT_NOT_AVAILABLE':
        this.showError(`Port ${error.port} is not accessible. Check your dev server.`);
        break;
        
      case 'TUNNEL_SERVER_ERROR':
        this.showError('Tunnel service temporarily unavailable. Try again later.');
        break;
        
      default:
        this.showError('Failed to start tunnel. Please try again.');
    }
  }
  
  // User-friendly error messages
  private showError(message: string): void {
    // Show error in extension UI
    // Suggest troubleshooting steps
    // Provide fallback options
  }
}
```

## Accessibility

### Screen Reader Support
```typescript
// Add ARIA labels and descriptions
<button 
  id="start-tunnel" 
  aria-describedby="tunnel-description"
  aria-live="polite"
>
  Start Live Sharing
</button>
<div id="tunnel-description" class="sr-only">
  Creates a shareable link for others to access your local development server
</div>
```

### Keyboard Navigation
- Tab order through tunnel controls
- Enter/Space to activate buttons
- Escape to close modals
- Accessible focus management

## Performance Considerations

### Lazy Loading
- Load tunnel UI components only when needed
- Defer QR code generation until requested
- Minimize impact on extension startup time

### Memory Management
- Clean up event listeners on tunnel stop
- Remove DOM elements when not needed
- Limit tunnel history storage

## Acceptance Criteria

✅ "Share Live" button appears in Wingman overlay  
✅ Auto-detects development server and port  
✅ One-click tunnel creation works reliably  
✅ URL copying functionality works across browsers  
✅ QR code generation for mobile testing  
✅ Real-time connection status updates  
✅ Tunnel session persistence across browser restarts  
✅ Error handling with clear user feedback  
✅ Accessible UI components  
✅ Integration with existing Wingman features  

## User Experience Goals
- Tunnel creation in <3 clicks
- Clear visual feedback for all states
- Intuitive error messages and recovery
- Seamless integration with existing workflow

## Dependencies
- QR code generation library
- Chrome extension APIs for storage
- Integration with existing extension architecture

## Estimated Timeline
**2-3 weeks**

## Next Phase
Phase 5 will focus on production readiness, monitoring, and advanced features like analytics and user management.