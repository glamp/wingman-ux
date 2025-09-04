import { BaseComponent } from './Component';

export interface Template {
  id: string;
  name: string;
  content: string;
  builtin: boolean;
  icon?: string;
}

export interface SettingsConfig {
  relayUrl: string;
  showPreviewUrl: boolean;
  selectedTemplateId: string;
  customTemplates: Template[];
}

export class SettingsTab extends BaseComponent {
  private settings: SettingsConfig;
  private onSettingsChange: (settings: Partial<SettingsConfig>) => void;
  private builtinTemplates: Template[];

  constructor(
    container: HTMLElement,
    initialSettings: SettingsConfig,
    onSettingsChange: (settings: Partial<SettingsConfig>) => void
  ) {
    super(container);
    this.settings = { ...initialSettings };
    this.onSettingsChange = onSettingsChange;
    this.builtinTemplates = this.getBuiltinTemplates();
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
                <label class="setting-label" for="templateSelect">Template Format</label>
                <div class="custom-select" id="templateSelect">
                  <div class="select-trigger" tabindex="0">
                    <span class="select-value">
                      <span class="format-icon">${this.getSelectedTemplateIcon()}</span>
                      <span class="format-text">${this.getSelectedTemplateName()}</span>
                    </span>
                    <span class="select-arrow">▼</span>
                  </div>
                  <div class="select-options">
                    ${this.generateTemplateOptions()}
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
    const templateSelect = this.element.querySelector('#templateSelect') as HTMLElement;
    const selectTrigger = templateSelect?.querySelector('.select-trigger') as HTMLElement;
    const selectOptions = templateSelect?.querySelector('.select-options') as HTMLElement;

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

    // Template select dropdown
    selectTrigger?.addEventListener('click', () => {
      const isOpen = templateSelect.classList.contains('open');
      templateSelect.classList.toggle('open', !isOpen);
    });

    selectTrigger?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        templateSelect.classList.toggle('open');
      }
    });

    selectOptions?.addEventListener('click', (e) => {
      const option = (e.target as HTMLElement).closest('.select-option') as HTMLElement;
      if (option) {
        const templateId = option.dataset.value;
        if (templateId) {
          this.updateSelectedTemplate(templateId);
          templateSelect.classList.remove('open');
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (templateSelect && !templateSelect.contains(e.target as Node)) {
        templateSelect.classList.remove('open');
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

  private updateSelectedTemplate(templateId: string): void {
    this.settings.selectedTemplateId = templateId;
    
    const selectValue = this.element.querySelector('.select-value') as HTMLElement;
    if (selectValue) {
      const icon = selectValue.querySelector('.format-icon') as HTMLElement;
      const text = selectValue.querySelector('.format-text') as HTMLElement;
      
      icon.textContent = this.getSelectedTemplateIcon();
      text.textContent = this.getSelectedTemplateName();
    }

    // Update selected state in options
    this.element.querySelectorAll('.select-option').forEach(option => {
      option.classList.toggle('selected', (option as HTMLElement).dataset.value === templateId);
    });

    // Load the selected template into the editor
    this.loadTemplateIntoEditor(templateId);

    this.onSettingsChange({ selectedTemplateId: templateId });
  }

  private loadTemplateIntoEditor(templateId: string): void {
    const template = this.getTemplateById(templateId);
    const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
    
    if (template && templateEditor) {
      templateEditor.value = template.content;
      templateEditor.disabled = template.builtin; // Disable editing for built-in templates
      
      // Update save button state
      const saveBtn = this.element.querySelector('#saveTemplateBtn') as HTMLButtonElement;
      if (saveBtn) {
        saveBtn.style.display = template.builtin ? 'none' : 'block';
      }
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

    if (settings.selectedTemplateId) {
      this.updateSelectedTemplate(settings.selectedTemplateId);
    }

    if (settings.customTemplates) {
      // Refresh template options when custom templates change
      this.refreshTemplateOptions();
    }
  }

  private refreshTemplateOptions(): void {
    const selectOptions = this.element.querySelector('.select-options') as HTMLElement;
    if (selectOptions) {
      selectOptions.innerHTML = this.generateTemplateOptions();
    }
  }

  private async loadTemplate(): Promise<void> {
    // Load the currently selected template into the editor
    this.loadTemplateIntoEditor(this.settings.selectedTemplateId);
  }

  private async saveTemplate(): Promise<void> {
    try {
      const templateEditor = this.element.querySelector('#templateEditor') as HTMLTextAreaElement;
      const selectedTemplate = this.getSelectedTemplate();
      
      if (templateEditor && templateEditor.value.trim() && !selectedTemplate.builtin) {
        // Update the existing custom template
        const updatedTemplate: Template = {
          ...selectedTemplate,
          content: templateEditor.value.trim()
        };
        
        // Update in settings
        const updatedCustomTemplates = this.settings.customTemplates.map(t => 
          t.id === selectedTemplate.id ? updatedTemplate : t
        );
        
        this.settings.customTemplates = updatedCustomTemplates;
        this.onSettingsChange({ customTemplates: updatedCustomTemplates });
        
        // Save to storage
        await chrome.storage.local.set({ 
          customTemplates: updatedCustomTemplates 
        });
        
        this.showToast('Template saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      this.showToast('Failed to save template', 'error');
    }
  }

  private async resetTemplate(): Promise<void> {
    try {
      const selectedTemplate = this.getSelectedTemplate();
      
      if (selectedTemplate.builtin) {
        // For built-in templates, just reload the original content
        this.loadTemplateIntoEditor(selectedTemplate.id);
        this.showToast('Template reset to original', 'success');
      } else {
        // For custom templates, switch back to Claude Code template
        this.updateSelectedTemplate('claude-code');
        this.showToast('Switched to Claude Code template', 'success');
      }
    } catch (error) {
      console.error('Failed to reset template:', error);
      this.showToast('Failed to reset template', 'error');
    }
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

  private getBuiltinTemplates(): Template[] {
    return [
      {
        id: 'claude-code',
        name: 'Claude Code',
        icon: '🤖',
        builtin: true,
        content: `# 🎯 UI Feedback Request

![Screenshot]({{screenshotUrl}})

{{#if userNote}}
**User Feedback**: {{userNote}}
{{/if}}

Please analyze this UI screenshot and help improve the user experience. Focus on the highlighted element and provide specific, actionable recommendations.

---

## 🎨 Visual Context

{{#if targetRect}}
- **Selected Area:** {{targetRectWidth}}×{{targetRectHeight}} pixels at position ({{targetRectX}}, {{targetRectY}})
{{/if}}
- **Selection Mode:** {{selectionModeText}}
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}

## 🔧 Technical Context

<details>
<summary><strong>Page Information</strong></summary>

- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}} (DPR: {{viewportDpr}})
- **Captured:** {{capturedAt}}

</details>

{{#if hasReact}}
<details>
<summary><strong>React Component: {{reactComponentName}}</strong></summary>

**Props:** \`\`\`json
{{reactPropsJson}}
\`\`\`

**State:** \`\`\`json
{{reactStateJson}}
\`\`\`

</details>
{{/if}}

{{#if hasErrors}}
<details open>
<summary><strong>⚠️ JavaScript Errors ({{errorCount}})</strong></summary>

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
{{#if stack}}\`\`\`
{{stack}}
\`\`\`{{/if}}
{{/each}}

</details>
{{/if}}

{{#if hasConsole}}
<details>
<summary><strong>Console Logs ({{consoleCount}})</strong></summary>

{{#each consoleLogs}}
{{index}}. **[{{level}}]** {{timestamp}}: {{args}}
{{/each}}

</details>
{{/if}}

{{#if hasNetwork}}
<details>
<summary><strong>Network Activity ({{networkCount}} requests)</strong></summary>

{{#each networkRequests}}
{{index}}. **{{url}}** ({{status}} - {{duration}}ms)
{{/each}}

</details>
{{/if}}

---

**Task**: Based on the screenshot and user feedback, provide specific UI/UX improvements for the highlighted element.`
      },
      {
        id: 'cursor',
        name: 'Cursor',
        icon: '⚡',
        builtin: true,
        content: `## UI Issue Report

![Screenshot]({{screenshotUrl}})

{{#if userNote}}
### Issue Description
{{userNote}}
{{/if}}

### Element Details
{{#if targetSelector}}
- **Element:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Position:** {{targetRectX}},{{targetRectY}} ({{targetRectWidth}}×{{targetRectHeight}})
{{/if}}

### Page Context
- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}

{{#if hasReact}}
### Component Info
- **Component:** {{reactComponentName}}
- **Props:** \`{{reactPropsJson}}\`
- **State:** \`{{reactStateJson}}\`
{{/if}}

{{#if hasErrors}}
### Errors
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}

**Fix this UI issue with specific code changes.**`
      },
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        icon: '🐙',
        builtin: true,
        content: `# UI Issue Report

## Description
{{#if userNote}}
{{userNote}}
{{/if}}

## Screenshot
![UI Issue]({{screenshotUrl}})

## Technical Details

### Element Information
{{#if targetSelector}}
- **CSS Selector:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Dimensions:** {{targetRectWidth}} × {{targetRectHeight}}
- **Position:** ({{targetRectX}}, {{targetRectY}})
{{/if}}

### Page Information
- **URL:** \`{{pageUrl}}\`
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}} × {{viewportHeight}}

{{#if hasReact}}
### React Component
\`\`\`javascript
// Component: {{reactComponentName}}
// Props: {{reactPropsJson}}
// State: {{reactStateJson}}
\`\`\`
{{/if}}

{{#if hasErrors}}
### JavaScript Errors
\`\`\`
{{#each errors}}
{{message}}
{{stack}}
{{/each}}
\`\`\`
{{/if}}

## Expected Behavior
<!-- Describe what should happen -->

## Actual Behavior
<!-- Describe what currently happens -->

## Reproduction Steps
1. Navigate to {{pageUrl}}
2. <!-- Add steps to reproduce -->

---
**Environment:** {{userAgent}}
**Timestamp:** {{capturedAt}}`
      },
      {
        id: 'short',
        name: 'Short',
        icon: '📝',
        builtin: true,
        content: `{{#if userNote}}
**Feedback:** {{userNote}}
{{/if}}

![Screenshot]({{screenshotUrl}})`
      },
      {
        id: 'medium',
        name: 'Medium',
        icon: '📊',
        builtin: true,
        content: `# UI Feedback

{{#if userNote}}
**User Comment:** {{userNote}}
{{/if}}

![Screenshot]({{screenshotUrl}})

## Element Details
{{#if targetSelector}}
- **Selector:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Size:** {{targetRectWidth}}×{{targetRectHeight}}
{{/if}}

{{#if hasReact}}
## React Component: {{reactComponentName}}
**Props:** \`{{reactPropsJson}}\`
**State:** \`{{reactStateJson}}\`
{{/if}}

## Page Info
- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}
- **Viewport:** {{viewportWidth}}×{{viewportHeight}}
- **Browser:** {{userAgent}}

{{#if hasErrors}}
## Errors ({{errorCount}})
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}`
      }
    ];
  }

  private getAllTemplates(): Template[] {
    return [...this.builtinTemplates, ...this.settings.customTemplates];
  }

  private getTemplateById(id: string): Template | undefined {
    return this.getAllTemplates().find(t => t.id === id);
  }

  private getSelectedTemplate(): Template {
    const template = this.getTemplateById(this.settings.selectedTemplateId);
    return template || this.builtinTemplates[0]; // Default to first builtin if not found
  }

  private getSelectedTemplateIcon(): string {
    return this.getSelectedTemplate().icon || '🤖';
  }

  private getSelectedTemplateName(): string {
    return this.getSelectedTemplate().name;
  }

  private generateTemplateOptions(): string {
    const allTemplates = this.getAllTemplates();
    return allTemplates.map(template => `
      <div class="select-option" data-value="${template.id}">
        <span class="format-icon">${template.icon || '📄'}</span>
        <div class="format-info">
          <span class="format-text">${template.name}</span>
          <span class="format-desc">${template.builtin ? 'Built-in template' : 'Custom template'}</span>
        </div>
      </div>
    `).join('');
  }
}