import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { WingmanConfig } from './types';
import { setupMessageHandler } from './message-handler';
import { ReactIntrospector } from './react-introspector';
import { createOAuthHandler } from './oauth-handler';
import { WingmanAnnotation, createLogger } from '@wingman/shared';

interface WingmanContextValue {
  config: WingmanConfig;
  introspector: ReactIntrospector | null;
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  sendFeedback: (data: FeedbackData) => Promise<any>;
}

interface FeedbackData {
  note: string;
  screenshot: string;
  metadata?: any;
  element?: HTMLElement;
}

const WingmanContext = createContext<WingmanContextValue | null>(null);

// Logger will be initialized in component with debug flag

export interface WingmanProviderProps {
  config?: WingmanConfig;
  endpoint?: string;
  debug?: boolean;
  children: React.ReactNode;
}

export function WingmanProvider({ 
  config = {}, 
  endpoint = 'http://localhost:8787/annotations',
  debug = false,
  children 
}: WingmanProviderProps) {
  const { enabled = true } = config;
  const [isActive, setIsActive] = useState(false);
  const introspectorRef = useRef<ReactIntrospector | null>(null);
  
  // Create logger with debug flag
  const logger = useRef(createLogger('Wingman:Provider', debug ? { 
    level: 'debug' 
  } : {})).current;

  useEffect(() => {
    if (!enabled) return;

    if (debug) {
      logger.info('Initializing Web SDK');
    }

    // Initialize React introspector
    introspectorRef.current = new ReactIntrospector(debug);

    // Initialize OAuth handler if configured
    if (config.oauth) {
      if (debug) {
        logger.info('Initializing OAuth handler with routes:', config.oauth.routes);
      }
      
      const oauthHandler = createOAuthHandler(config.oauth);
      // Setup OAuth tunnel detection
      oauthHandler.setupTunnelOAuth();
    }

    // Setup message handler for Chrome extension communication
    const cleanup = setupMessageHandler(introspectorRef.current, debug);

    return () => {
      if (debug) {
        logger.debug('Cleaning up Web SDK');
      }
      cleanup();
      introspectorRef.current = null;
    };
  }, [enabled, debug, config.oauth]);

  const activate = useCallback(() => {
    setIsActive(true);
    if (debug) {
      logger.info('SDK Activated');
      logger.debug('Activated with debug mode');
    }
  }, [debug, logger]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    if (debug) {
      logger.debug('Deactivated');
    }
  }, [debug, logger]);

  const sendFeedback = useCallback(async (data: FeedbackData) => {
    try {
      // Extract React metadata if element is provided
      let reactMetadata: any = null;
      if (data.element && introspectorRef.current) {
        const metadata = introspectorRef.current.getReactData(data.element);
        if (metadata && metadata.obtainedVia !== 'none') {
          reactMetadata = metadata;
        }
      }

      // Build annotation payload
      const annotation: WingmanAnnotation = {
        id: `web-sdk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        note: data.note,
        page: {
          url: window.location.href,
          title: document.title,
          ua: navigator.userAgent,
          viewport: {
            w: window.innerWidth,
            h: window.innerHeight,
            dpr: window.devicePixelRatio || 1
          }
        },
        target: {
          mode: 'element',
          rect: data.element ? {
            x: data.element.getBoundingClientRect().x,
            y: data.element.getBoundingClientRect().y,
            width: data.element.getBoundingClientRect().width,
            height: data.element.getBoundingClientRect().height
          } : { x: 0, y: 0, width: 100, height: 100 },
          ...(data.element ? { selector: getSelector(data.element) } : {})
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: data.screenshot
          }
        },
        console: [],
        errors: [],
        network: [],
        ...(reactMetadata ? { react: reactMetadata } : {})
      };

      // Merge additional metadata
      if (data.metadata && reactMetadata) {
        annotation.react = { ...reactMetadata, ...data.metadata };
      } else if (data.metadata && !reactMetadata) {
        // Only add metadata if it has the required obtainedVia field
        if (data.metadata.obtainedVia) {
          annotation.react = data.metadata;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(annotation)
      });

      if (!response.ok) {
        if (debug) {
          logger.error('Failed to send feedback:', response.status, response.statusText);
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      if (debug) {
        logger.error('Error sending feedback:', error);
      }
      return null;
    }
  }, [endpoint, debug]);

  const value: WingmanContextValue = {
    config: { ...config, enabled, debug },
    introspector: introspectorRef.current,
    isActive,
    activate,
    deactivate,
    sendFeedback
  };

  return <WingmanContext.Provider value={value}>{children}</WingmanContext.Provider>;
}

export function useWingman() {
  const context = useContext(WingmanContext);
  
  if (!context) {
    throw new Error('useWingman must be used within WingmanProvider');
  }
  
  return context;
}

// Helper function to generate CSS selector
function getSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c).join('.');
    if (classes) {
      return `.${classes}`;
    }
  }
  
  // Fallback to tag name with index
  const parent = element.parentElement;
  if (!parent) {
    return element.tagName.toLowerCase();
  }
  
  const siblings = Array.from(parent.children);
  const index = siblings.indexOf(element);
  
  return `${getSelector(parent as HTMLElement)} > ${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
}