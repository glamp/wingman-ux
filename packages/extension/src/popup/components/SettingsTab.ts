import { BaseComponent } from './Component';

export interface SettingsConfig {
  relayUrl: string;
  showPreviewUrl: boolean;
  copyFormat: 'claude' | 'json' | 'markdown';
}

export class SettingsTab extends BaseComponent {
  private settings: SettingsConfig;
  private onSettingsChange: (settings: Partial<SettingsConfig>) => void;

  constructor(
    container: HTMLElement,
    initialSettings: SettingsConfig,
    onSettingsChange: (settings: Partial<SettingsConfig>) => void
  ) {
    super(container);
    this.settings = { ...initialSettings };
    this.onSettingsChange = onSettingsChange;
  }

  protected createElement(): HTMLElement {
    const html = `
      <div class="tab-panel settings-tab" role="tabpanel" id="settings-panel" aria-labelledby="settings-tab" style="display: none;">
        <div class="settings-content">
          <div class="settings-sections">
            <div class="settings-section">
              <h4 class="section-title">Server Configuration</h4>
              <div class="setting-item">
                <label class="setting-label" for="relayUrlInput">Server URL</label>
                <div class="server-input-group">
                  <input 
                    type="text" 
                    id="relayUrlInput" 
                    class="setting-input url-input" 
                    placeholder="https://api.wingmanux.com"
                    value="${this.settings.relayUrl}"
                  />
                  <div class="preset-buttons">
                    <button class="preset-btn" data-url="https://api.wingmanux.com" title="Remote server">
                      <span class="preset-icon">🌐</span>
                      <span class="preset-text">Remote</span>
                    </button>
                    <button class="preset-btn" data-url="http://localhost:8787" title="Local development server">
                      <span class="preset-icon">🏠</span>
                      <span class="preset-text">Local</span>
                    </button>
                    <button class="preset-btn" data-url="clipboard" title="Copy to clipboard only">
                      <span class="preset-icon">📋</span>
                      <span class="preset-text">Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h4 class="section-title">Output Options</h4>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label class="setting-label" for="showPreviewToggle">Show Preview URL</label>
                    <span class="setting-description">Display preview link after submission</span>
                  </div>
                  <div class="toggle-switch">
                    <input type="checkbox" id="showPreviewToggle" ${this.settings.showPreviewUrl ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </div>
                </div>
              </div>

              <div class="setting-item">
                <label class="setting-label" for="copyFormatSelect">Copy Format</label>
                <div class="custom-select" id="copyFormatSelect">
                  <div class="select-trigger" tabindex="0">
                    <span class="select-value">
                      <span class="format-icon">${this.getFormatIcon(this.settings.copyFormat)}</span>
                      <span class="format-text">${this.getFormatText(this.settings.copyFormat)}</span>
                    </span>
                    <span class="select-arrow">▼</span>
                  </div>
                  <div class="select-options">
                    <div class="select-option" data-value="claude">
                      <span class="format-icon">🤖</span>
                      <div class="format-info">
                        <span class="format-text">Claude Code</span>
                        <span class="format-desc">Optimized for AI conversations</span>
                      </div>
                    </div>
                    <div class="select-option" data-value="json">
                      <span class="format-icon">📄</span>
                      <div class="format-info">
                        <span class="format-text">JSON</span>
                        <span class="format-desc">Raw structured data</span>
                      </div>
                    </div>
                    <div class="select-option" data-value="markdown">
                      <span class="format-icon">📝</span>
                      <div class="format-info">
                        <span class="format-text">Markdown</span>
                        <span class="format-desc">Human-readable format</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h4 class="section-title">Template Editor</h4>
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label class="setting-label" for="templateEditor">Custom Template</label>
                    <span class="setting-description">Customize how annotations are formatted for Claude Code</span>
                  </div>
                  <button class="icon-btn" id="showSampleDataBtn" title="Show sample data structure">
                    <span>ℹ️</span>
                  </button>
                </div>
                <div class="template-editor-container">
                  <textarea 
                    id="templateEditor" 
                    class="template-textarea"
                    placeholder="Enter your custom template here..."
                    rows="10"
                  ></textarea>
                  <div class="template-actions">
                    <button class="template-btn secondary" id="resetTemplateBtn">Reset to Default</button>
                    <button class="template-btn primary" id="saveTemplateBtn">Save Template</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h4 class="section-title">About</h4>
              <div class="about-content">
                <div class="about-item">
                  <span class="about-label">Version</span>
                  <span class="about-value" id="versionInfo">Loading...</span>
                </div>
                <div class="about-item">
                  <span class="about-label">Keyboard Shortcut</span>
                  <span class="about-value" id="keyboardShortcut">${navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘+Shift+K' : 'Alt+Shift+K'}</span>
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
    this.loadVersionInfo();
  }

  private attachEventListeners(): void {
    const relayUrlInput = this.element.querySelector('#relayUrlInput') as HTMLInputElement;
    const showPreviewToggle = this.element.querySelector('#showPreviewToggle') as HTMLInputElement;
    const copyFormatSelect = this.element.querySelector('#copyFormatSelect') as HTMLElement;
    const selectTrigger = copyFormatSelect?.querySelector('.select-trigger') as HTMLElement;
    const selectOptions = copyFormatSelect?.querySelector('.select-options') as HTMLElement;

    // URL input with debounced save
    let saveTimeout: number | null = null;
    relayUrlInput?.addEventListener('input', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.settings.relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
        this.onSettingsChange({ relayUrl: this.settings.relayUrl });
      }, 500);
    });

    relayUrlInput?.addEventListener('blur', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      this.settings.relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
      this.onSettingsChange({ relayUrl: this.settings.relayUrl });
    });

    // Preset buttons
    this.element.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = (btn as HTMLElement).dataset.url;
        if (url && relayUrlInput) {
          relayUrlInput.value = url;
          this.settings.relayUrl = url;
          this.onSettingsChange({ relayUrl: url });
        }
      });
    });

    // Preview URL toggle
    showPreviewToggle?.addEventListener('change', () => {
      this.settings.showPreviewUrl = showPreviewToggle.checked;
      this.onSettingsChange({ showPreviewUrl: this.settings.showPreviewUrl });
    });

    // Custom select dropdown
    selectTrigger?.addEventListener('click', () => {
      const isOpen = copyFormatSelect.classList.contains('open');
      copyFormatSelect.classList.toggle('open', !isOpen);
    });

    selectTrigger?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyFormatSelect.classList.toggle('open');
      }
    });

    selectOptions?.addEventListener('click', (e) => {
      const option = (e.target as HTMLElement).closest('.select-option') as HTMLElement;
      if (option) {
        const value = option.dataset.value as SettingsConfig['copyFormat'];
        this.updateCopyFormat(value);
        copyFormatSelect.classList.remove('open');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (copyFormatSelect && !copyFormatSelect.contains(e.target as Node)) {
        copyFormatSelect.classList.remove('open');
      }
    });

    // Template editor event listeners
    const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
    const showSampleDataBtn = this.element.querySelector('#showSampleDataBtn') as HTMLButtonElement;
    const resetTemplateBtn = this.element.querySelector('#resetTemplateBtn') as HTMLButtonElement;
    const saveTemplateBtn = this.element.querySelector('#saveTemplateBtn') as HTMLButtonElement;

    showSampleDataBtn?.addEventListener('click', () => {
      this.showSampleDataModal();
    });

    resetTemplateBtn?.addEventListener('click', async () => {
      await this.resetTemplate();
    });

    saveTemplateBtn?.addEventListener('click', async () => {
      await this.saveTemplate();
    });

    // Load saved template
    this.loadTemplate();
  }

  private updateCopyFormat(format: SettingsConfig['copyFormat']): void {
    this.settings.copyFormat = format;
    
    const selectValue = this.element.querySelector('.select-value') as HTMLElement;
    if (selectValue) {
      const icon = selectValue.querySelector('.format-icon') as HTMLElement;
      const text = selectValue.querySelector('.format-text') as HTMLElement;
      
      icon.textContent = this.getFormatIcon(format);
      text.textContent = this.getFormatText(format);
    }

    // Update selected state in options
    this.element.querySelectorAll('.select-option').forEach(option => {
      option.classList.toggle('selected', (option as HTMLElement).dataset.value === format);
    });

    this.onSettingsChange({ copyFormat: format });
  }

  private getFormatIcon(format: SettingsConfig['copyFormat']): string {
    switch (format) {
      case 'claude': return '🤖';
      case 'json': return '📄';
      case 'markdown': return '📝';
      default: return '🤖';
    }
  }

  private getFormatText(format: SettingsConfig['copyFormat']): string {
    switch (format) {
      case 'claude': return 'Claude Code';
      case 'json': return 'JSON';
      case 'markdown': return 'Markdown';
      default: return 'Claude Code';
    }
  }

  private async loadVersionInfo(): void {
    try {
      const versionInfo = this.element.querySelector('#versionInfo') as HTMLElement;
      if (versionInfo) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
          const manifest = chrome.runtime.getManifest();
          versionInfo.textContent = `v${manifest.version}`;
        } else {
          // Fallback for testing environment
          versionInfo.textContent = 'v1.0.0';
        }
      }
    } catch (error) {
      console.error('Failed to load version info:', error);
      // Fallback to default version
      const versionInfo = this.element.querySelector('#versionInfo') as HTMLElement;
      if (versionInfo) {
        versionInfo.textContent = 'v1.0.0';
      }
    }
  }

  updateSettings(settings: Partial<SettingsConfig>): void {
    this.settings = { ...this.settings, ...settings };

    // Update UI elements
    const relayUrlInput = this.element.querySelector('#relayUrlInput') as HTMLInputElement;
    const showPreviewToggle = this.element.querySelector('#showPreviewToggle') as HTMLInputElement;

    if (settings.relayUrl && relayUrlInput) {
      relayUrlInput.value = settings.relayUrl;
    }

    if (settings.showPreviewUrl !== undefined && showPreviewToggle) {
      showPreviewToggle.checked = settings.showPreviewUrl;
    }

    if (settings.copyFormat) {
      this.updateCopyFormat(settings.copyFormat);
    }
  }

  private async loadTemplate(): Promise<void> {
    const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
    if (!templateEditor) return;

    try {
      // Try to load from Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['customTemplate']);
        if (result.customTemplate) {
          templateEditor.value = result.customTemplate;
        } else {
          templateEditor.value = this.getDefaultTemplate();
        }
      } else {
        // Fallback for testing environment - show default template
        templateEditor.value = this.getDefaultTemplate();
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      // Fallback to default template
      templateEditor.value = this.getDefaultTemplate();
    }
  }

  private async saveTemplate(): Promise<void> {
    try {
      const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
      if (templateEditor && templateEditor.value.trim()) {
        await chrome.storage.local.set({ customTemplate: templateEditor.value.trim() });
        
        // Show success toast
        this.showToast('Template saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      this.showToast('Failed to save template', 'error');
    }
  }

  private async resetTemplate(): Promise<void> {
    try {
      const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
      if (templateEditor) {
        templateEditor.value = this.getDefaultTemplate();
        
        // Remove custom template from storage
        await chrome.storage.local.remove('customTemplate');
        
        this.showToast('Template reset to default', 'success');
      }
    } catch (error) {
      console.error('Failed to reset template:', error);
      this.showToast('Failed to reset template', 'error');
    }
  }

  private getDefaultTemplate(): string {
    return `# 🎯 UI Feedback Request

{{#if userNote}}
## 📝 User Feedback

> **{{userNote}}**

---

{{/if}}
## 🖼️ Screenshot Analysis Required

**IMPORTANT**: Please carefully examine the screenshot below to understand the visual context of the UI issue.

![Wingman Screenshot - Click to view full size]({{screenshotUrl}})

*The screenshot above shows the exact area where the user is reporting an issue.*

---

## 🎨 Visual Context

{{#if targetRect}}
- **Selected Area:** {{targetRectWidth}}×{{targetRectHeight}} pixels at position ({{targetRectX}}, {{targetRectY}})
{{/if}}
- **Selection Mode:** {{selectionModeText}}
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}

---

## 📍 Page Information

- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}} (DPR: {{viewportDpr}})
- **Captured:** {{capturedAt}}

## 🔧 Technical Details

{{#if hasReact}}
### React Component Info

- **Component:** {{reactComponentName}}
- **Data Source:** {{reactDataSource}}

**Props:**
\`\`\`json
{{reactPropsJson}}
\`\`\`

**State:**
\`\`\`json
{{reactStateJson}}
\`\`\`

{{/if}}
{{#if hasErrors}}
### ⚠️ JavaScript Errors ({{errorCount}})

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
{{#if stack}}
\`\`\`
{{stack}}
\`\`\`
{{/if}}
{{/each}}

{{/if}}
{{#if hasConsole}}
### Console Logs ({{consoleCount}})

{{#each consoleLogs}}
{{index}}. **[{{level}}]** {{timestamp}}: {{args}}
{{/each}}

{{/if}}
{{#if hasNetwork}}
### Network Activity ({{networkCount}} requests)

{{#each networkRequests}}
{{index}}. **{{url}}**
   - Status: {{status}}
   - Duration: {{duration}}ms
   - Type: {{initiatorType}}
{{/each}}

{{/if}}
### Browser Info

- **User Agent:** {{userAgent}}
- **Annotation ID:** {{annotationId}}

---

## 💡 Action Request

Please review the **screenshot** and **user feedback** above to understand and address the reported UI issue. Focus on the visual elements shown in the screenshot and how they relate to the user's feedback.`;
  }

  private showSampleDataModal(): void {
    // Create modal if it doesn't exist
    let modal = document.getElementById('sample-data-modal');
    if (!modal) {
      modal = this.createSampleDataModal();
      document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
  }

  private createSampleDataModal(): HTMLElement {
    const sampleData = {
      id: "abc123",
      note: "The submit button appears disabled even though all required fields are filled",
      target: {
        mode: "element",
        selector: "#submit-btn",
        rect: { x: 450, y: 320, width: 120, height: 40 }
      },
      page: {
        url: "https://example.com/contact",
        title: "Contact Us - Example Site",
        viewport: { w: 1920, h: 1080, dpr: 1 },
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."
      },
      react: {
        componentName: "ContactForm",
        obtainedVia: "devtools-hook",
        props: { isValid: true, isLoading: false },
        state: { submitted: false, errors: {} }
      },
      errors: [
        {
          message: "Cannot read property 'submit' of null",
          stack: "TypeError: Cannot read property 'submit' of null\\n    at ContactForm.handleSubmit...",
          ts: "2024-01-15T10:30:00.000Z"
        }
      ],
      console: [
        {
          level: "error",
          args: ["Form submission failed:", "Network error"],
          ts: "2024-01-15T10:29:58.000Z"
        }
      ],
      network: [
        {
          url: "https://api.example.com/contact",
          status: 500,
          duration: 1250,
          initiatorType: "fetch"
        }
      ],
      createdAt: "2024-01-15T10:30:00.000Z"
    };

    const html = `
      <div class="sample-data-modal" style="display: none;">
        <div class="sample-data-modal-content">
          <div class="sample-data-header">
            <h3>Sample Annotation Data Structure</h3>
            <button class="sample-data-close" id="closeSampleDataModal">&times;</button>
          </div>
          <div class="sample-data-body">
            <p>This is the structure of data available in your template:</p>
            <pre class="sample-data-json">${JSON.stringify(sampleData, null, 2)}</pre>
            <div class="sample-data-info">
              <p><strong>Usage:</strong> Use <code>{{propertyName}}</code> to insert values</p>
              <p><strong>Conditionals:</strong> Use <code>{{#if propertyName}}...{{/if}}</code></p>
              <p><strong>Arrays:</strong> Use <code>{{#each arrayName}}...{{/each}}</code></p>
            </div>
          </div>
        </div>
      </div>
    `;

    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const modal = template.content.firstElementChild as HTMLElement;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .sample-data-modal {
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
      .sample-data-modal-content {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .sample-data-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      .sample-data-header h3 {
        margin: 0;
        font-size: 16px;
        color: #1e293b;
      }
      .sample-data-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
      }
      .sample-data-close:hover {
        background: #f1f5f9;
      }
      .sample-data-body {
        padding: 20px;
        overflow-y: auto;
      }
      .sample-data-json {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        font-family: ui-monospace, 'SF Mono', Monaco, monospace;
        font-size: 11px;
        line-height: 1.5;
        overflow-x: auto;
        margin: 16px 0;
      }
      .sample-data-info {
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
      }
      .sample-data-info p {
        margin: 8px 0;
        font-size: 12px;
        color: #0c4a6e;
      }
      .sample-data-info code {
        background: #e0f2fe;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: ui-monospace, monospace;
        font-size: 11px;
      }
    `;
    modal.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('#closeSampleDataModal') as HTMLButtonElement;
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

  private showToast(message: string, type: 'success' | 'error'): void {
    // Create toast (reusing the toast system from modern-popup)
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    toastContent.textContent = message;
    
    toast.appendChild(toastContent);
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    const hideTimeout = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 3000);
    
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

  show(): void {
    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.style.display = 'none';
  }
}