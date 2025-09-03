import { BaseComponent } from './Component';

export class MainTab extends BaseComponent {
  private onActivate: () => void;
  private onHelp: () => void;
  private isActive: boolean = false;

  constructor(container: HTMLElement, onActivate: () => void, onHelp: () => void) {
    super(container);
    this.onActivate = onActivate;
    this.onHelp = onHelp;
  }

  protected createElement(): HTMLElement {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘+Shift+K' : 'Alt+Shift+K';

    const html = `
      <div class="tab-panel main-tab" role="tabpanel" id="main-panel" aria-labelledby="main-tab">
        <div class="main-content">
          <div class="primary-action">
            <button class="capture-button" id="captureBtn">
              <div class="capture-icon">🎯</div>
              <div class="capture-text">
                <div class="capture-title">Start Capture</div>
                <div class="capture-shortcut">${shortcut}</div>
              </div>
            </button>
          </div>

          <div class="connection-status" id="connectionStatus">
            <div class="status-indicator">
              <div class="status-dot" id="statusDot"></div>
              <span class="status-text" id="statusText">Checking connection...</span>
            </div>
          </div>

          <div class="quick-help">
            <button class="help-button" id="helpBtn">
              <span class="help-icon">❓</span>
              <span class="help-text">Quick Help</span>
            </button>
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
    const captureBtn = this.element.querySelector('#captureBtn') as HTMLButtonElement;
    const helpBtn = this.element.querySelector('#helpBtn') as HTMLButtonElement;

    captureBtn?.addEventListener('click', () => {
      this.onActivate();
    });

    helpBtn?.addEventListener('click', () => {
      this.onHelp();
    });
  }

  updateConnectionStatus(isConnected: boolean, message: string): void {
    const statusDot = this.element.querySelector('#statusDot') as HTMLElement;
    const statusText = this.element.querySelector('#statusText') as HTMLElement;

    if (statusDot && statusText) {
      statusDot.className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
      statusText.textContent = message;
    }
  }

  updateCaptureButton(state: 'idle' | 'activating' | 'success' | 'error'): void {
    const captureBtn = this.element.querySelector('#captureBtn') as HTMLButtonElement;
    const captureIcon = this.element.querySelector('.capture-icon') as HTMLElement;
    const captureTitle = this.element.querySelector('.capture-title') as HTMLElement;

    if (!captureBtn || !captureIcon || !captureTitle) return;

    captureBtn.className = `capture-button ${state}`;

    switch (state) {
      case 'idle':
        captureIcon.textContent = '🎯';
        captureTitle.textContent = 'Start Capture';
        captureBtn.disabled = false;
        break;
      case 'activating':
        captureIcon.textContent = '⚡';
        captureTitle.textContent = 'Activating...';
        captureBtn.disabled = true;
        break;
      case 'success':
        captureIcon.textContent = '✅';
        captureTitle.textContent = 'Activated!';
        captureBtn.disabled = false;
        break;
      case 'error':
        captureIcon.textContent = '❌';
        captureTitle.textContent = 'Try Again';
        captureBtn.disabled = false;
        break;
    }
  }

  show(): void {
    this.element.style.display = 'block';
    this.isActive = true;
  }

  hide(): void {
    this.element.style.display = 'none';
    this.isActive = false;
  }
}