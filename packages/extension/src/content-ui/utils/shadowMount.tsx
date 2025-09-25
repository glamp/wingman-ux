import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createCache, { EmotionCache } from '@emotion/cache';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export interface ShadowMountOptions {
  hostId: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

export interface ShadowMountResult {
  root: Root;
  shadowRoot: ShadowRoot;
  emotionCache: EmotionCache;
  unmount: () => void;
}

/**
 * Mount a React component inside a Shadow DOM with Material-UI support
 */
export function mountReactInShadow({
  hostId,
  component: Component,
  props = {}
}: ShadowMountOptions): ShadowMountResult {
  // Remove existing host if it exists
  const existingHost = document.getElementById(hostId);
  if (existingHost) {
    existingHost.remove();
  }

  // Create host element
  const host = document.createElement('div');
  host.id = hostId;
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    pointer-events: none;
  `;
  
  // Ensure document.body exists before appending
  if (!document.body) {
    throw new Error('[Wingman] document.body not available yet');
  }
  
  document.body.appendChild(host);

  // Create shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create container for React app inside shadow root
  const reactContainer = document.createElement('div');
  reactContainer.id = 'wingman-react-root';
  reactContainer.style.cssText = `
    width: 100%;
    height: 100%;
    position: relative;
  `;
  shadowRoot.appendChild(reactContainer);

  // Create emotion cache for Shadow DOM
  const emotionCache = createCache({
    key: 'wingman-shadow',
    container: shadowRoot,
    prepend: true
  });

  // Create MUI theme
  const theme = createTheme({
    palette: {
      primary: {
        main: '#0084ff',
      },
      secondary: {
        main: '#64748b',
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    shape: {
      borderRadius: 8,
    },
  });

  // Reset styles for shadow DOM
  const resetStyles = document.createElement('style');
  resetStyles.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    /* Ensure our containers are full size */
    #wingman-react-root {
      width: 100%;
      height: 100%;
    }
  `;
  shadowRoot.appendChild(resetStyles);

  // Create React root and render
  const root = createRoot(reactContainer);

  // Render with MUI providers for proper styling
  root.render(
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...props} />
      </ThemeProvider>
    </CacheProvider>
  );

  // Unmount function
  const unmount = () => {
    root.unmount();
    host.remove();
  };

  return {
    root,
    shadowRoot,
    emotionCache,
    unmount
  };
}