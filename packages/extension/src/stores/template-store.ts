import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  builtInTemplates,
  DEFAULT_TEMPLATE_ID,
  type AnnotationTemplate
} from '@wingman/shared';

interface CustomTemplate extends AnnotationTemplate {
  builtIn: false;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStore {
  // State
  selectedTemplateId: string;
  customTemplates: CustomTemplate[];

  // Actions
  setSelectedTemplate: (id: string) => void;
  cycleTemplate: () => void;
  addCustomTemplate: (template: Omit<CustomTemplate, 'id' | 'builtIn' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomTemplate: (id: string, updates: Partial<Omit<CustomTemplate, 'id' | 'builtIn'>>) => void;
  deleteCustomTemplate: (id: string) => void;
  getSelectedTemplate: () => AnnotationTemplate | undefined;
  getAllTemplates: () => AnnotationTemplate[];
  getTemplateById: (id: string) => AnnotationTemplate | undefined;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedTemplateId: DEFAULT_TEMPLATE_ID,
      customTemplates: [],

      // Set selected template
      setSelectedTemplate: (id: string) => {
        const template = get().getTemplateById(id);
        if (template) {
          set({ selectedTemplateId: id });
        }
      },

      // Cycle through templates (for Cmd+Shift+P)
      cycleTemplate: () => {
        const allTemplates = get().getAllTemplates();
        const currentIndex = allTemplates.findIndex(t => t.id === get().selectedTemplateId);
        const nextIndex = (currentIndex + 1) % allTemplates.length;
        set({ selectedTemplateId: allTemplates[nextIndex].id });
      },

      // Add custom template
      addCustomTemplate: (template) => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const newTemplate: CustomTemplate = {
          ...template,
          id,
          builtIn: false,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          customTemplates: [...state.customTemplates, newTemplate],
          selectedTemplateId: id, // Auto-select new template
        }));
      },

      // Update custom template
      updateCustomTemplate: (id, updates) => {
        set(state => ({
          customTemplates: state.customTemplates.map(t =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      // Delete custom template
      deleteCustomTemplate: (id) => {
        set(state => {
          const newTemplates = state.customTemplates.filter(t => t.id !== id);
          const wasSelected = state.selectedTemplateId === id;

          return {
            customTemplates: newTemplates,
            // If deleted template was selected, switch to default
            selectedTemplateId: wasSelected ? DEFAULT_TEMPLATE_ID : state.selectedTemplateId,
          };
        });
      },

      // Get currently selected template
      getSelectedTemplate: () => {
        const state = get();
        return state.getTemplateById(state.selectedTemplateId);
      },

      // Get all templates (built-in + custom)
      getAllTemplates: () => {
        const state = get();
        return [...builtInTemplates, ...state.customTemplates];
      },

      // Get template by ID
      getTemplateById: (id: string) => {
        const state = get();
        // Check built-in templates first
        const builtIn = builtInTemplates.find(t => t.id === id);
        if (builtIn) return builtIn;

        // Then check custom templates
        return state.customTemplates.find(t => t.id === id);
      },
    }),
    {
      name: 'wingman-templates',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const result = await chrome.storage.local.get(name);
          return result[name] || null;
        },
        setItem: async (name: string, value: string) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name: string) => {
          await chrome.storage.local.remove(name);
        },
      })),
      partialize: (state) => ({
        selectedTemplateId: state.selectedTemplateId,
        customTemplates: state.customTemplates,
      }),
    }
  )
);