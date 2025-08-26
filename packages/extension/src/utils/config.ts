// Environment configuration utility

// Config is injected at build time via Vite's define plugin
declare global {
  const __WINGMAN_CONFIG__: EnvironmentConfig;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  // Return the build-time injected config
  if (typeof __WINGMAN_CONFIG__ !== 'undefined') {
    return __WINGMAN_CONFIG__;
  }
  
  // Fallback to development config if injection failed
  console.warn('[Wingman] Build-time config injection failed, using fallback');
  return {
    environment: 'development',
    environmentName: 'Development',
    relayUrl: 'http://localhost:8787',
    debug: true,
    badge: {
      text: 'DEV',
      color: '#0084ff'
    },
    features: {
      verboseLogging: true,
      hotReload: true,
      debugPanel: true
    },
    ui: {
      headerColor: '#0084ff',
      environmentLabel: 'DEV MODE',
      showEnvironmentBanner: true
    }
  };
}

export function isDebugMode(config: EnvironmentConfig): boolean {
  return config.debug || config.environment === 'development';
}

export function shouldShowLogs(config: EnvironmentConfig): boolean {
  return config.features.verboseLogging || isDebugMode(config);
}