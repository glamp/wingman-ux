import { BaseComponent } from './Component';

export type TabId = 'main' | 'live-share' | 'settings';

export class TabNavigation extends BaseComponent {
  private activeTab: TabId = 'main';
  private onTabChange: (tabId: TabId) => void;

  constructor(container: HTMLElement, onTabChange: (tabId: TabId) => void) {
    super(container);
    this.onTabChange = onTabChange;
  }

  protected createElement(): HTMLElement {
    const html = `
      <nav class="tab-navigation">
        <div class="tab-list" role="tablist">
          <button 
            class="tab-button active" 
            role="tab" 
            aria-selected="true" 
            aria-controls="main-panel"
            data-tab="main"
          >
            <span class="tab-icon">🎯</span>
            <span class="tab-label">Capture</span>
          </button>
          <button 
            class="tab-button" 
            role="tab" 
            aria-selected="false" 
            aria-controls="live-share-panel"
            data-tab="live-share"
          >
            <span class="tab-icon">🚀</span>
            <span class="tab-label">Live Share</span>
          </button>
          <button 
            class="tab-button" 
            role="tab" 
            aria-selected="false" 
            aria-controls="settings-panel"
            data-tab="settings"
          >
            <span class="tab-icon">⚙️</span>
            <span class="tab-label">Settings</span>
          </button>
        </div>
      </nav>
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
    const tabButtons = this.element.querySelectorAll('.tab-button');
    
    tabButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = (button as HTMLElement).dataset.tab as TabId;
        this.switchTab(tabId);
      });
    });

    // Keyboard navigation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIndex = Array.from(tabButtons).findIndex(
          (btn) => btn.classList.contains('active')
        );
        
        let nextIndex: number;
        if (e.key === 'ArrowRight') {
          nextIndex = currentIndex < tabButtons.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabButtons.length - 1;
        }
        
        const nextTab = (tabButtons[nextIndex] as HTMLElement).dataset.tab as TabId;
        this.switchTab(nextTab);
        (tabButtons[nextIndex] as HTMLElement).focus();
      }
    });
  }

  switchTab(tabId: TabId): void {
    if (tabId === this.activeTab) return;

    const tabButtons = this.element.querySelectorAll('.tab-button');
    
    // Update button states
    tabButtons.forEach((button) => {
      const isActive = (button as HTMLElement).dataset.tab === tabId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive.toString());
    });

    this.activeTab = tabId;
    this.onTabChange(tabId);
  }

  getActiveTab(): TabId {
    return this.activeTab;
  }
}