import { BaseComponent } from './Component';

export interface TunnelState {
  sessionId?: string;
  tunnelUrl?: string;
  targetPort?: number;
  status: 'inactive' | 'connecting' | 'active' | 'error';
}

export class LiveShareTab extends BaseComponent {
  private tunnelState: TunnelState = { status: 'inactive' };
  private onTunnelToggle: (port: number) => void;
  private onCreateShare: () => void;
  private onCopyUrl: (url: string) => void;
  private onShowQR: (url: string) => void;

  constructor(
    container: HTMLElement,
    onTunnelToggle: (port: number) => void,
    onCreateShare: () => void,
    onCopyUrl: (url: string) => void,
    onShowQR: (url: string) => void
  ) {
    super(container);
    this.onTunnelToggle = onTunnelToggle;
    this.onCreateShare = onCreateShare;
    this.onCopyUrl = onCopyUrl;
    this.onShowQR = onShowQR;
  }

  protected createElement(): HTMLElement {
    const html = `
      <div class="tab-panel live-share-tab" role="tabpanel" id="live-share-panel" aria-labelledby="live-share-tab" style="display: none;">
        <div class="live-share-content">
          <div class="live-share-header">
            <div class="live-share-status" id="tunnelStatus">
              <span class="status-badge inactive">Inactive</span>
            </div>
          </div>

          <div class="server-config" id="serverConfig">
            <div class="config-section">
              <h4 class="config-label">Target Server</h4>
              <div class="detected-server" id="detectedServer">
                <div class="server-display">
                  <span class="server-url" id="detectedPort">localhost:3000</span>
                  <button class="change-btn" id="changePortBtn">Change</button>
                </div>
              </div>
              
              <div class="manual-input" id="manualInput" style="display: none;">
                <div class="input-group">
                  <input type="number" id="targetPortInput" placeholder="3000" min="1" max="65535" class="port-input">
                  <button class="detect-btn" id="detectBtn">Auto-detect</button>
                </div>
              </div>
            </div>
          </div>

          <div class="tunnel-actions">
            <button class="tunnel-toggle-btn" id="tunnelToggleBtn">
              <span class="btn-icon">🚀</span>
              <span class="btn-text">Start Live Sharing</span>
            </button>
          </div>

          <div class="tunnel-info" id="tunnelInfo" style="display: none;">
            <div class="info-section">
              <h4 class="info-label">Share URL</h4>
              <div class="url-display">
                <input type="text" id="tunnelUrlInput" readonly class="url-input">
                <div class="url-actions">
                  <button class="action-btn copy-btn" id="copyTunnelBtn" title="Copy URL">
                    <span class="btn-icon">📋</span>
                  </button>
                  <button class="action-btn share-btn" id="createShareBtn" title="Create Share Link">
                    <span class="btn-icon">🔗</span>
                  </button>
                  <button class="action-btn qr-btn" id="showQRBtn" title="Show QR Code">
                    <span class="btn-icon">📱</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="share-info" id="shareInfo" style="display: none;">
            <div class="info-section">
              <h4 class="info-label">
                <span class="label-icon">🔗</span>
                Shareable Link
                <span class="label-badge">Public</span>
              </h4>
              <div class="url-display">
                <input type="text" id="shareUrlInput" readonly class="url-input">
                <div class="url-actions">
                  <button class="action-btn copy-btn primary" id="copyShareBtn" title="Copy Share Link">
                    <span class="btn-icon">📋</span>
                    <span class="btn-text">Copy</span>
                  </button>
                  <button class="action-btn revoke-btn" id="revokeShareBtn" title="Revoke Link">
                    <span class="btn-icon">❌</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return this.createElementFromHTML(html);
  }

  render(): void {
    if (!this.container.contains(this.element)) {
      this.container.appendChild(this.element);
    }
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const changePortBtn = this.element.querySelector('#changePortBtn') as HTMLButtonElement;
    const detectBtn = this.element.querySelector('#detectBtn') as HTMLButtonElement;
    const tunnelToggleBtn = this.element.querySelector('#tunnelToggleBtn') as HTMLButtonElement;
    const copyTunnelBtn = this.element.querySelector('#copyTunnelBtn') as HTMLButtonElement;
    const createShareBtn = this.element.querySelector('#createShareBtn') as HTMLButtonElement;
    const showQRBtn = this.element.querySelector('#showQRBtn') as HTMLButtonElement;
    const copyShareBtn = this.element.querySelector('#copyShareBtn') as HTMLButtonElement;

    changePortBtn?.addEventListener('click', () => {
      this.togglePortInput(true);
    });

    detectBtn?.addEventListener('click', () => {
      this.detectPort();
    });

    tunnelToggleBtn?.addEventListener('click', () => {
      const port = this.getTargetPort();
      this.onTunnelToggle(port);
    });

    copyTunnelBtn?.addEventListener('click', () => {
      const tunnelUrl = (this.element.querySelector('#tunnelUrlInput') as HTMLInputElement)?.value;
      if (tunnelUrl) {
        this.onCopyUrl(tunnelUrl);
      }
    });

    createShareBtn?.addEventListener('click', () => {
      this.onCreateShare();
    });

    showQRBtn?.addEventListener('click', () => {
      const tunnelUrl = (this.element.querySelector('#tunnelUrlInput') as HTMLInputElement)?.value;
      if (tunnelUrl) {
        this.onShowQR(tunnelUrl);
      }
    });

    copyShareBtn?.addEventListener('click', () => {
      const shareUrl = (this.element.querySelector('#shareUrlInput') as HTMLInputElement)?.value;
      if (shareUrl) {
        this.onCopyUrl(shareUrl);
      }
    });
  }

  private togglePortInput(show: boolean): void {
    const detectedServer = this.element.querySelector('#detectedServer') as HTMLElement;
    const manualInput = this.element.querySelector('#manualInput') as HTMLElement;

    if (detectedServer && manualInput) {
      detectedServer.style.display = show ? 'none' : 'block';
      manualInput.style.display = show ? 'block' : 'none';
    }
  }

  private async detectPort(): Promise<void> {
    // Auto-detect port logic would go here
    // For now, try to get from current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          const port = parseInt(url.port, 10);
          if (port && port > 0 && port <= 65535) {
            this.updateDetectedPort(port);
            this.togglePortInput(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Port detection failed:', error);
    }

    // Default fallback
    this.updateDetectedPort(3000);
    this.togglePortInput(false);
  }

  private updateDetectedPort(port: number): void {
    const detectedPort = this.element.querySelector('#detectedPort') as HTMLElement;
    const targetPortInput = this.element.querySelector('#targetPortInput') as HTMLInputElement;

    if (detectedPort) {
      detectedPort.textContent = `localhost:${port}`;
    }
    if (targetPortInput) {
      targetPortInput.value = port.toString();
    }
  }

  private getTargetPort(): number {
    const manualInput = this.element.querySelector('#manualInput') as HTMLElement;
    const targetPortInput = this.element.querySelector('#targetPortInput') as HTMLInputElement;
    const detectedPort = this.element.querySelector('#detectedPort') as HTMLElement;

    if (manualInput.style.display !== 'none' && targetPortInput?.value) {
      return parseInt(targetPortInput.value, 10);
    }

    // Extract port from detected server display
    const match = detectedPort?.textContent?.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 3000;
  }

  updateTunnelState(state: TunnelState): void {
    this.tunnelState = state;

    const statusBadge = this.element.querySelector('#tunnelStatus .status-badge') as HTMLElement;
    const tunnelToggleBtn = this.element.querySelector('#tunnelToggleBtn') as HTMLButtonElement;
    const tunnelInfo = this.element.querySelector('#tunnelInfo') as HTMLElement;
    const tunnelUrlInput = this.element.querySelector('#tunnelUrlInput') as HTMLInputElement;

    if (!statusBadge || !tunnelToggleBtn || !tunnelInfo || !tunnelUrlInput) return;

    // Update status badge
    statusBadge.className = `status-badge ${state.status}`;
    statusBadge.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);

    // Update toggle button
    const btnIcon = tunnelToggleBtn.querySelector('.btn-icon') as HTMLElement;
    const btnText = tunnelToggleBtn.querySelector('.btn-text') as HTMLElement;

    switch (state.status) {
      case 'inactive':
        btnIcon.textContent = '🚀';
        btnText.textContent = 'Start Live Sharing';
        tunnelToggleBtn.className = 'tunnel-toggle-btn';
        tunnelToggleBtn.disabled = false;
        tunnelInfo.style.display = 'none';
        break;
      case 'connecting':
        btnIcon.textContent = '⏳';
        btnText.textContent = 'Starting...';
        tunnelToggleBtn.className = 'tunnel-toggle-btn connecting';
        tunnelToggleBtn.disabled = true;
        tunnelInfo.style.display = 'none';
        break;
      case 'active':
        btnIcon.textContent = '🛑';
        btnText.textContent = 'Stop Sharing';
        tunnelToggleBtn.className = 'tunnel-toggle-btn active';
        tunnelToggleBtn.disabled = false;
        tunnelInfo.style.display = 'block';
        if (state.tunnelUrl) {
          tunnelUrlInput.value = state.tunnelUrl;
        }
        break;
      case 'error':
        btnIcon.textContent = '🔄';
        btnText.textContent = 'Retry Sharing';
        tunnelToggleBtn.className = 'tunnel-toggle-btn error';
        tunnelToggleBtn.disabled = false;
        tunnelInfo.style.display = 'none';
        break;
    }

    // Update detected port if available
    if (state.targetPort) {
      this.updateDetectedPort(state.targetPort);
    }
  }

  showShareInfo(shareUrl: string): void {
    const shareInfo = this.element.querySelector('#shareInfo') as HTMLElement;
    const shareUrlInput = this.element.querySelector('#shareUrlInput') as HTMLInputElement;

    if (shareInfo && shareUrlInput) {
      shareUrlInput.value = shareUrl;
      shareInfo.style.display = 'block';
    }
  }

  hideShareInfo(): void {
    const shareInfo = this.element.querySelector('#shareInfo') as HTMLElement;
    if (shareInfo) {
      shareInfo.style.display = 'none';
    }
  }

  show(): void {
    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.style.display = 'none';
  }
}