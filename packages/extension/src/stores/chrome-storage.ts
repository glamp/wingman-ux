import { StateStorage } from 'zustand/middleware';

// Chrome storage adapter for Zustand persistence
export const chromeStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get([name]);
      return result[name] || null;
    } catch (error) {
      console.error(`Error getting item ${name} from chrome.storage:`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch (error) {
      console.error(`Error setting item ${name} in chrome.storage:`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove([name]);
    } catch (error) {
      console.error(`Error removing item ${name} from chrome.storage:`, error);
    }
  },
};

// Utility function to create persisted store options
export const createPersistOptions = (name: string, version: number = 1) => ({
  name,
  storage: chromeStorageAdapter,
  version,
  // Migrate function for version changes
  migrate: (persistedState: any, version: number) => {
    console.log(`Migrating ${name} store from version ${version}`);
    return persistedState;
  },
  // Only persist in extension contexts (not in tests)
  skipHydration: typeof chrome === 'undefined',
});

// Message types for store synchronization across extension contexts
export interface StoreMessage<T = any> {
  type: 'STORE_SYNC';
  storeName: string;
  state: T;
}

// Utility to broadcast store changes to other extension contexts
export const broadcastStoreChange = <T>(storeName: string, state: T) => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const message: StoreMessage<T> = {
      type: 'STORE_SYNC',
      storeName,
      state,
    };

    // Try to send to all contexts, but don't fail if some are unavailable
    chrome.runtime.sendMessage(message).catch(() => {
      // Silently ignore - other contexts might not be listening
    });
  }
};

// Setup store sync listener (call this in each context that uses stores)
export const setupStoreSync = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message: StoreMessage, sender, sendResponse) => {
      if (message.type === 'STORE_SYNC') {
        // Dispatch custom event that stores can listen to
        window.dispatchEvent(new CustomEvent(`store-sync-${message.storeName}`, {
          detail: message.state
        }));
      }
      return false; // Don't send response
    });
  }
};