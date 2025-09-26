// Settings Store Types
export interface SettingsState {
  relayUrl: string;
  showPreviewUrl: boolean;
}

export interface SettingsActions {
  setRelayUrl: (url: string) => void;
  setShowPreviewUrl: (show: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export type SettingsStore = SettingsState & SettingsActions;

// Tunnel Store Types
export interface TunnelState {
  sessionId: string;
  tunnelUrl: string;
  publicUrl: string;
  isActive: boolean;
  connectedAt: number;
}

export interface TunnelStoreState {
  activeTunnel: TunnelState | null;
  activeShareToken: string | null;
  isConnecting: boolean;
  connectionError: string | null;
}

export interface TunnelActions {
  createTunnel: (targetPort: number) => Promise<void>;
  stopTunnel: () => Promise<void>;
  createShareLink: () => Promise<string>;
  clearShareLink: () => void;
  setConnectionError: (error: string | null) => void;
}

export type TunnelStore = TunnelStoreState & TunnelActions;

// Popup UI Store Types
export type TabId = 'main' | 'live-share' | 'settings';

export interface PopupUIState {
  activeTab: TabId;
  isLoading: boolean;
  error: string | null;
  lastAction: string | null;
}

export interface PopupUIActions {
  setActiveTab: (tab: TabId) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastAction: (action: string | null) => void;
  clearError: () => void;
}

export type PopupUIStore = PopupUIState & PopupUIActions;