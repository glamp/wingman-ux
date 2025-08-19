import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { WingmanConfig } from './types';
import { setupMessageHandler } from './message-handler';
import { ReactIntrospector } from './react-introspector';

interface WingmanContextValue {
  config: WingmanConfig;
  introspector: ReactIntrospector | null;
}

const WingmanContext = createContext<WingmanContextValue | null>(null);

export interface WingmanProviderProps {
  config?: WingmanConfig;
  children: React.ReactNode;
}

export function WingmanProvider({ config = {}, children }: WingmanProviderProps) {
  const { enabled = false, debug = false } = config;
  const introspectorRef = useRef<ReactIntrospector | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (debug) {
      console.log('[Wingman] Initializing Web SDK');
    }

    // Initialize React introspector
    introspectorRef.current = new ReactIntrospector(debug);

    // Setup message handler for Chrome extension communication
    const cleanup = setupMessageHandler(introspectorRef.current, debug);

    return () => {
      if (debug) {
        console.log('[Wingman] Cleaning up Web SDK');
      }
      cleanup();
      introspectorRef.current = null;
    };
  }, [enabled, debug]);

  const value: WingmanContextValue = {
    config: { enabled, debug },
    introspector: introspectorRef.current,
  };

  return <WingmanContext.Provider value={value}>{children}</WingmanContext.Provider>;
}

export function useWingmanContext() {
  const context = useContext(WingmanContext);
  if (!context) {
    throw new Error('useWingmanContext must be used within WingmanProvider');
  }
  return context;
}