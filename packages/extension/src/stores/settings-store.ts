import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsStore } from '@/types/stores';
import { createPersistOptions, broadcastStoreChange } from './chrome-storage';

// Default settings based on current popup implementation
const defaultSettings = {
  relayUrl: 'clipboard',
  showPreviewUrl: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,

      // Actions
      setRelayUrl: (relayUrl: string) => {
        set({ relayUrl });
        broadcastStoreChange('settings', get());
      },

      setShowPreviewUrl: (showPreviewUrl: boolean) => {
        set({ showPreviewUrl });
        broadcastStoreChange('settings', get());
      },


      loadSettings: async () => {
        try {
          // Migration from old popup storage format
          const result = await chrome.storage.local.get([
            'relayUrl',
            'showPreviewUrl'
          ]);

          const updates: Partial<SettingsStore> = {};

          if (result.relayUrl) {
            updates.relayUrl = result.relayUrl;
          }

          if (typeof result.showPreviewUrl === 'boolean') {
            updates.showPreviewUrl = result.showPreviewUrl;
          }


          if (Object.keys(updates).length > 0) {
            set(updates);
            broadcastStoreChange('settings', get());
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      },

      saveSettings: async () => {
        try {
          const state = get();
          await chrome.storage.local.set({
            relayUrl: state.relayUrl,
            showPreviewUrl: state.showPreviewUrl,
          });
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      },
    }),
    createPersistOptions('wingman-settings', 1)
  )
);

// Selector hooks for specific settings
export const useRelayUrl = () => useSettingsStore(state => state.relayUrl);