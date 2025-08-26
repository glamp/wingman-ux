/// <reference types="vite/client" />

interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  environmentName: string;
  relayUrl: string;
  debug: boolean;
  badge: {
    text: string;
    color: string;
  };
  features: {
    verboseLogging: boolean;
    hotReload: boolean;
    debugPanel: boolean;
  };
  ui: {
    headerColor: string;
    environmentLabel: string;
    showEnvironmentBanner: boolean;
  };
  dataCapture: {
    console: {
      maxEntries: number;
      templateLimit: number;
      description: string;
    };
    network: {
      maxEntries: number;
      templateLimit: number;
      description: string;
    };
    errors: {
      maxEntries: number;
      templateLimit: number;
      description: string;
    };
  };
}

declare global {
  interface ImportMetaEnv {
    readonly WINGMAN_ENV: 'development' | 'staging' | 'production';
    readonly WINGMAN_CONFIG: EnvironmentConfig;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};