import { create } from 'zustand';
import { PopupUIStore, TabId } from '@/types/stores';
import { broadcastStoreChange } from './chrome-storage';

export const usePopupStore = create<PopupUIStore>()((set, get) => ({
  // Initial state
  activeTab: 'main' as TabId,
  isLoading: false,
  error: null,
  lastAction: null,

  // Actions
  setActiveTab: (activeTab: TabId) => {
    set({ activeTab });
    broadcastStoreChange('popup-ui', get());
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
    broadcastStoreChange('popup-ui', get());
  },

  setError: (error: string | null) => {
    set({ error });
    broadcastStoreChange('popup-ui', get());
  },

  setLastAction: (lastAction: string | null) => {
    set({ lastAction });
    broadcastStoreChange('popup-ui', get());
  },

  clearError: () => {
    set({ error: null });
    broadcastStoreChange('popup-ui', get());
  },
}));

// Selector hooks for specific UI state
export const useActiveTab = () => usePopupStore(state => state.activeTab);
export const useIsLoading = () => usePopupStore(state => state.isLoading);
export const useError = () => usePopupStore(state => state.error);
export const useLastAction = () => usePopupStore(state => state.lastAction);

// Computed selectors
export const useHasError = () => usePopupStore(state => !!state.error);
export const useCanNavigate = () => usePopupStore(state => !state.isLoading);