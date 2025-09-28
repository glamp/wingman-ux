// Central exports for all Zustand stores
export * from './settings-store';
export * from './tunnel-store';
export * from './popup-store';
export * from './template-store';
export * from './chrome-storage';

// Setup function to initialize all stores in extension contexts
export const setupStores = () => {
  // Import and run setup for chrome storage sync
  import('./chrome-storage').then(({ setupStoreSync }) => {
    setupStoreSync();
  });

  // Load settings from chrome.storage
  import('./settings-store').then(({ useSettingsStore }) => {
    useSettingsStore.getState().loadSettings();
  });

  // Initialize template store
  import('./template-store').then(({ useTemplateStore }) => {
    // Just accessing the store will trigger the persist middleware to load from storage
    useTemplateStore.getState();
  });
};

// Call setup automatically when imported in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  setupStores();
}