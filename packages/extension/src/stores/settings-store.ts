import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsStore, Template } from '@/types/stores';
import { createPersistOptions, broadcastStoreChange } from './chrome-storage';

// Default settings based on current popup implementation
const defaultSettings = {
  relayUrl: 'clipboard',
  showPreviewUrl: true,
  selectedTemplateId: 'claude-code',
  customTemplates: [] as Template[],
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

      setSelectedTemplateId: (selectedTemplateId: string) => {
        set({ selectedTemplateId });
        broadcastStoreChange('settings', get());
      },

      addCustomTemplate: (template: Template) => {
        const { customTemplates } = get();
        const updatedTemplates = [...customTemplates, template];
        set({ customTemplates: updatedTemplates });
        broadcastStoreChange('settings', get());
      },

      removeCustomTemplate: (id: string) => {
        const { customTemplates } = get();
        const updatedTemplates = customTemplates.filter(t => t.id !== id);
        set({ customTemplates: updatedTemplates });
        broadcastStoreChange('settings', get());
      },

      loadSettings: async () => {
        try {
          // Migration from old popup storage format
          const result = await chrome.storage.local.get([
            'relayUrl',
            'showPreviewUrl',
            'selectedTemplateId',
            'copyFormat', // Old format that needs migration
            'customTemplates'
          ]);

          const updates: Partial<SettingsStore> = {};

          if (result.relayUrl) {
            updates.relayUrl = result.relayUrl;
          }

          if (typeof result.showPreviewUrl === 'boolean') {
            updates.showPreviewUrl = result.showPreviewUrl;
          }

          if (result.selectedTemplateId) {
            updates.selectedTemplateId = result.selectedTemplateId;
          } else if (result.copyFormat) {
            // Migrate old copyFormat to templateId
            const formatToTemplate: Record<string, string> = {
              'claude': 'claude-code',
              'cursor': 'cursor',
              'json': 'short',
              'markdown': 'medium'
            };
            updates.selectedTemplateId = formatToTemplate[result.copyFormat] || 'claude-code';
          }

          if (result.customTemplates && Array.isArray(result.customTemplates)) {
            updates.customTemplates = result.customTemplates;
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
            selectedTemplateId: state.selectedTemplateId,
            customTemplates: state.customTemplates,
          });
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      },
    }),
    createPersistOptions('wingman-settings', 1)
  )
);

// Built-in templates (matching current implementation)
export const getBuiltInTemplates = (): Template[] => [
  {
    id: 'claude-code',
    name: 'Claude Code',
    content: 'Detailed format optimized for Claude Code with comprehensive context',
    builtin: true,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    content: 'Concise format for Cursor AI',
    builtin: true,
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    content: 'GitHub issue format for Copilot',
    builtin: true,
  },
  {
    id: 'short',
    name: 'Short',
    content: 'Minimal format - just feedback and screenshot',
    builtin: true,
  },
  {
    id: 'medium',
    name: 'Medium',
    content: 'Balanced format with essential details',
    builtin: true,
  },
];

// Selector hooks for specific settings
export const useRelayUrl = () => useSettingsStore(state => state.relayUrl);
export const useSelectedTemplate = () => useSettingsStore(state => state.selectedTemplateId);
export const useCustomTemplates = () => useSettingsStore(state => state.customTemplates);

// Helper to get all available templates (built-in + custom)
export const useAllTemplates = () => {
  const customTemplates = useCustomTemplates();
  return [...getBuiltInTemplates(), ...customTemplates];
};