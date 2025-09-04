import { TabNavigation, TabId } from './components/TabNavigation';
import { MainTab } from './components/MainTab';
import { LiveShareTab, TunnelState } from './components/LiveShareTab';
import { SettingsTab, SettingsConfig } from './components/SettingsTab';
import QRCode from 'qrcode';

export class ModernPopup {
  private tabNavigation: TabNavigation;
  private mainTab: MainTab;
  private liveShareTab: LiveShareTab;
  private settingsTab: SettingsTab;
  
  private container: HTMLElement;
  private tabPanels: HTMLElement;
  
  private settings: SettingsConfig = {
    relayUrl: 'http://localhost:8787',
    showPreviewUrl: true,
    selectedTemplateId: 'claude-code',
    customTemplates: []
  };

  private activeTunnel: TunnelState | null = null;
  private activeShareToken: string | null = null;

  constructor() {
    this.container = document.getElementById('modern-popup-container')!;
    this.tabPanels = document.getElementById('tab-panels')!;
    
    this.initializeComponents();
    this.loadSettings();
    this.checkConnectionStatus();
  }

  private initializeComponents(): void {
    // Initialize tab navigation
    const navContainer = document.getElementById('tab-navigation')!;
    this.tabNavigation = new TabNavigation(navContainer, (tabId) => {
      this.switchTab(tabId);
    });

    // Initialize main tab
    this.mainTab = new MainTab(
      this.tabPanels,
      () => this.activateCapture(),
      () => this.showHelp()
    );

    // Initialize live share tab
    this.liveShareTab = new LiveShareTab(
      this.tabPanels,
      (port) => this.toggleTunnel(port),
      () => this.createShareLink(),
      (url) => this.copyToClipboard(url),
      (url) => this.showQRCode(url)
    );

    // Initialize settings tab
    this.settingsTab = new SettingsTab(
      this.tabPanels,
      this.settings,
      (newSettings) => this.updateSettings(newSettings)
    );

    // Render all components
    this.tabNavigation.render();
    this.mainTab.render();
    this.liveShareTab.render();
    this.settingsTab.render();

    // Show main tab by default
    this.mainTab.show();
  }

  private switchTab(tabId: TabId): void {
    // Hide all tabs
    this.mainTab.hide();
    this.liveShareTab.hide();
    this.settingsTab.hide();

    // Show selected tab
    switch (tabId) {
      case 'main':
        this.mainTab.show();
        break;
      case 'live-share':
        this.liveShareTab.show();
        this.checkTunnelStatus(); // Refresh tunnel status when switching to live share
        break;
      case 'settings':
        this.settingsTab.show();
        break;
    }
  }

  private async activateCapture(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      this.showStatus('No active tab found', 'error');
      return;
    }

    if (!tab.url) {
      this.showStatus('Cannot access this page', 'error');
      return;
    }

    // Check if it's a restricted page
    if (this.isRestrictedPage(tab.url)) {
      this.showStatus('Wingman cannot run on Chrome system pages. Please navigate to a regular website.', 'error');
      return;
    }

    try {
      this.mainTab.updateCaptureButton('activating');
      
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' });
      
      if (response?.success) {
        this.mainTab.updateCaptureButton('success');
        // Close popup immediately for better UX
        window.close();
      } else if (response?.reason === 'already_active') {
        this.mainTab.updateCaptureButton('error');
        this.showStatus('Overlay is already active', 'error');
        setTimeout(() => this.mainTab.updateCaptureButton('idle'), 2000);
      } else {
        this.mainTab.updateCaptureButton('error');
        this.showStatus('Failed to activate overlay', 'error');
        setTimeout(() => this.mainTab.updateCaptureButton('idle'), 2000);
      }
    } catch (error) {
      console.error('[Modern Popup] Error:', error);
      this.mainTab.updateCaptureButton('error');
      this.showStatus('Failed to activate. Make sure you\'re on a regular webpage.', 'error');
      setTimeout(() => this.mainTab.updateCaptureButton('idle'), 2000);
    }
  }

  private showHelp(): void {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘+Shift+K' : 'Alt+Shift+K';
    this.showStatus(`Activate: ${shortcut} | Cancel overlay: Esc`, 'success');
  }

  private async toggleTunnel(port: number): Promise<void> {
    if (this.activeTunnel?.status === 'active') {
      await this.stopTunnel();
    } else {
      await this.startTunnel(port);
    }
  }

  private async startTunnel(port: number): Promise<void> {
    this.liveShareTab.updateTunnelState({ status: 'connecting' });

    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'TUNNEL_CREATE', targetPort: port },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.success && response.tunnel) {
        this.activeTunnel = {
          sessionId: response.tunnel.sessionId,
          tunnelUrl: response.tunnel.tunnelUrl,
          targetPort: response.tunnel.targetPort,
          status: 'active'
        };

        this.liveShareTab.updateTunnelState(this.activeTunnel);
        await chrome.storage.local.set({ activeTunnel: this.activeTunnel });
        this.showStatus('Live sharing started! 🚀', 'success');
      } else {
        throw new Error(response.error || 'Failed to create tunnel');
      }
    } catch (error: any) {
      console.error('Failed to create tunnel:', error);
      this.liveShareTab.updateTunnelState({ status: 'error' });
      
      let errorMessage = 'Failed to start live sharing';
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Cannot connect to tunnel server. Check your internet connection';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showStatus(errorMessage, 'error');
    }
  }

  private async stopTunnel(): Promise<void> {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'TUNNEL_STOP' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.success) {
        this.activeTunnel = null;
        this.activeShareToken = null;
        this.liveShareTab.updateTunnelState({ status: 'inactive' });
        this.liveShareTab.hideShareInfo();
        
        await chrome.storage.local.remove(['activeTunnel', 'activeShareToken']);
        this.showStatus('Live sharing stopped', 'success');
      } else {
        throw new Error('Failed to stop tunnel');
      }
    } catch (error: any) {
      console.error('Failed to stop tunnel:', error);
      
      // Clear state anyway since background script handles cleanup
      this.activeTunnel = null;
      this.activeShareToken = null;
      this.liveShareTab.updateTunnelState({ status: 'inactive' });
      this.liveShareTab.hideShareInfo();
      await chrome.storage.local.remove(['activeTunnel', 'activeShareToken']);
      
      this.showStatus('Tunnel stopped (connection lost)', 'success');
    }
  }

  private async createShareLink(): Promise<void> {
    if (!this.activeTunnel) {
      this.showStatus('No active tunnel', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.settings.relayUrl}/tunnel/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.activeTunnel.sessionId,
          label: `Chrome Extension Share - ${new Date().toLocaleString()}`,
          expiresIn: 24 // 24 hours
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create share link');
      }
      
      const data = await response.json();
      this.activeShareToken = data.shareToken;
      
      this.liveShareTab.showShareInfo(data.shareUrl);
      await chrome.storage.local.set({ activeShareToken: this.activeShareToken });
      
      this.showStatus('Shareable link created!', 'success');
    } catch (error) {
      console.error('Failed to create share link:', error);
      this.showStatus('Failed to create share link', 'error');
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showStatus('Failed to copy to clipboard', 'error');
    }
  }

  private async showQRCode(url: string): Promise<void> {
    try {
      // Create modal if it doesn't exist
      let modal = document.getElementById('qr-modal');
      if (!modal) {
        modal = this.createQRModal();
        document.body.appendChild(modal);
      }

      const qrContainer = modal.querySelector('#qr-container') as HTMLElement;
      const qrText = modal.querySelector('#qr-text') as HTMLElement;
      
      qrContainer.innerHTML = '';
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      qrContainer.appendChild(canvas);
      qrText.textContent = url;
      
      modal.style.display = 'flex';
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      this.showStatus('Failed to generate QR code', 'error');
    }
  }

  private createQRModal(): HTMLElement {
    const html = `
      <div id="qr-modal" class="qr-modal" style="display: none;">
        <div class="qr-modal-content">
          <div class="qr-modal-header">
            <h3>Scan to Test on Mobile</h3>
            <button class="qr-close-btn" id="qr-close">&times;</button>
          </div>
          <div id="qr-container" class="qr-container"></div>
          <div id="qr-text" class="qr-text"></div>
        </div>
      </div>
    `;
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const modal = template.content.firstElementChild as HTMLElement;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .qr-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }
      .qr-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 300px;
      }
      .qr-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .qr-modal-header h3 {
        margin: 0;
        font-size: 16px;
      }
      .qr-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b;
      }
      .qr-container {
        margin: 16px 0;
      }
      .qr-text {
        font-family: monospace;
        font-size: 11px;
        color: #64748b;
        word-break: break-all;
        margin-top: 16px;
      }
    `;
    modal.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('#qr-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    return modal;
  }

  private async checkTunnelStatus(): Promise<void> {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'TUNNEL_STATUS' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.tunnel) {
        this.activeTunnel = response.tunnel;
        this.liveShareTab.updateTunnelState(this.activeTunnel);
      } else {
        this.activeTunnel = null;
        this.liveShareTab.updateTunnelState({ status: 'inactive' });
      }
    } catch (error) {
      console.log('Error checking tunnel status:', error);
      this.activeTunnel = null;
      this.liveShareTab.updateTunnelState({ status: 'inactive' });
    }
  }

  private async updateSettings(newSettings: Partial<SettingsConfig>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(this.settings);
      }
      
      // Re-check connection if URL changed
      if (newSettings.relayUrl) {
        this.checkConnectionStatus();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['relayUrl', 'showPreviewUrl', 'selectedTemplateId', 'customTemplates', 'copyFormat']);
        
        // Migration: if old copyFormat exists but selectedTemplateId doesn't, migrate it
        let selectedTemplateId = stored.selectedTemplateId;
        if (!selectedTemplateId && stored.copyFormat) {
          const formatToTemplate: { [key: string]: string } = {
            'claude': 'claude-code',
            'json': 'short', // Simple fallback
            'markdown': 'medium'
          };
          selectedTemplateId = formatToTemplate[stored.copyFormat] || 'claude-code';
        }
        
        this.settings = {
          relayUrl: stored.relayUrl || 'http://localhost:8787',
          showPreviewUrl: stored.showPreviewUrl ?? true,
          selectedTemplateId: selectedTemplateId || 'claude-code',
          customTemplates: stored.customTemplates || []
        };
      } else {
        // Fallback for testing environment - use defaults
        this.settings = {
          relayUrl: 'http://localhost:8787',
          showPreviewUrl: true,
          selectedTemplateId: 'claude-code',
          customTemplates: []
        };
      }
      
      this.settingsTab.updateSettings(this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults on error
      this.settings = {
        relayUrl: 'http://localhost:8787',
        showPreviewUrl: true,
        selectedTemplateId: 'claude-code',
        customTemplates: []
      };
      this.settingsTab.updateSettings(this.settings);
    }
  }

  private async checkConnectionStatus(): Promise<void> {
    const relayUrl = this.settings.relayUrl;
    
    // Handle clipboard mode
    if (relayUrl === 'clipboard') {
      this.mainTab.updateConnectionStatus(true, 'Copy mode - clipboard ready');
      return;
    }
    
    this.mainTab.updateConnectionStatus(false, 'Checking connection...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const response = await fetch(`${relayUrl}/health`, { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (relayUrl.includes('localhost')) {
          const port = relayUrl.match(/:(\d+)/)?.[1] || '8787';
          this.mainTab.updateConnectionStatus(true, `Connected to local server :${port}`);
        } else {
          this.mainTab.updateConnectionStatus(true, 'Connected to remote server');
        }
      } else {
        this.mainTab.updateConnectionStatus(false, 'Server unavailable');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('[Modern Popup] Connection check failed:', error);
      
      if (relayUrl.includes('localhost')) {
        const port = relayUrl.match(/:(\d+)/)?.[1] || '8787';
        this.mainTab.updateConnectionStatus(true, `Local server :${port} (assumed)`);
      } else {
        this.mainTab.updateConnectionStatus(false, 'Cannot verify server');
      }
    }
  }

  private isRestrictedPage(url: string): boolean {
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') ||
           url.startsWith('https://chrome.google.com/webstore') ||
           url === 'chrome://newtab/';
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    toastContent.textContent = message;
    
    toast.appendChild(toastContent);
    toastContainer.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Auto-hide toast
    const hideTimeout = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 3000);
    
    // Allow manual dismiss by clicking
    toast.addEventListener('click', () => {
      clearTimeout(hideTimeout);
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    });
  }
}

// Initialize the modern popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ModernPopup();
});