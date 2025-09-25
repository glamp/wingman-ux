import { create } from 'zustand';
import { TunnelStore } from '@/types/stores';
import { broadcastStoreChange } from './chrome-storage';

export const useTunnelStore = create<TunnelStore>()((set, get) => ({
  // Initial state
  activeTunnel: null,
  activeShareToken: null,
  isConnecting: false,
  connectionError: null,

  // Actions
  createTunnel: async (targetPort: number) => {
    const state = get();
    if (state.isConnecting) {
      return; // Already connecting
    }

    set({ isConnecting: true, connectionError: null });
    broadcastStoreChange('tunnel', get());

    try {
      // Send message to background script to create tunnel
      const response = await chrome.runtime.sendMessage({
        type: 'TUNNEL_CREATE',
        targetPort,
      });

      if (response?.success && response.tunnel) {
        set({
          activeTunnel: {
            sessionId: response.tunnel.sessionId,
            tunnelUrl: response.tunnel.tunnelUrl || response.tunnel.publicUrl,
            publicUrl: response.tunnel.tunnelUrl || response.tunnel.publicUrl,
            isActive: true,
            connectedAt: Date.now(),
          },
          isConnecting: false,
          connectionError: null,
        });
      } else {
        set({
          isConnecting: false,
          connectionError: response?.error || 'Failed to create tunnel',
        });
      }
    } catch (error) {
      set({
        isConnecting: false,
        connectionError: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    broadcastStoreChange('tunnel', get());
  },

  stopTunnel: async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'TUNNEL_STOP',
      });

      set({
        activeTunnel: null,
        activeShareToken: null,
        connectionError: null,
      });
    } catch (error) {
      set({
        connectionError: error instanceof Error ? error.message : 'Failed to stop tunnel',
      });
    }

    broadcastStoreChange('tunnel', get());
  },

  createShareLink: async () => {
    const state = get();

    if (!state.activeTunnel) {
      throw new Error('No active tunnel to share');
    }

    try {
      // Generate a shareable token (in real implementation, this would call backend)
      const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`;

      set({ activeShareToken: shareToken });
      broadcastStoreChange('tunnel', get());

      return `${state.activeTunnel.publicUrl}/share/${shareToken}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create share link';
      set({ connectionError: errorMessage });
      broadcastStoreChange('tunnel', get());
      throw new Error(errorMessage);
    }
  },

  clearShareLink: () => {
    set({ activeShareToken: null });
    broadcastStoreChange('tunnel', get());
  },

  setConnectionError: (connectionError: string | null) => {
    set({ connectionError });
    broadcastStoreChange('tunnel', get());
  },
}));

// Selector hooks for specific tunnel state
export const useActiveTunnel = () => useTunnelStore(state => state.activeTunnel);
export const useIsConnecting = () => useTunnelStore(state => state.isConnecting);
export const useConnectionError = () => useTunnelStore(state => state.connectionError);
export const useActiveShareToken = () => useTunnelStore(state => state.activeShareToken);

// Computed selectors
export const useIsConnected = () => useTunnelStore(state => !!state.activeTunnel?.isActive);
export const useTunnelStatus = () => useTunnelStore(state => {
  if (state.connectionError) return 'error';
  if (state.isConnecting) return 'connecting';
  if (state.activeTunnel?.isActive) return 'connected';
  return 'disconnected';
});