import { defineConfig } from 'wxt';

// Get environment from WINGMAN_ENV or NODE_ENV, default to development
const environment = process.env.WINGMAN_ENV || process.env.NODE_ENV || 'development';
const isDev = environment === 'development';
const isStaging = environment === 'staging';
const isProd = environment === 'production';

export default defineConfig({
  // Enable React support
  modules: ['@wxt-dev/module-react'],

  // Extension mode - ensures proper extension context
  mode: isDev ? 'development' : 'production',

  // Configure source directory
  srcDir: './src',

  // Configure output directory (visible in Finder/Explorer)
  outDir: './dist-wxt',

  // Configure public directory for static assets
  publicDir: './src/public',

  // Configure manifest
  manifest: ({ browser, manifestVersion }) => {
    const baseManifest = {
      manifest_version: 3,
      version: "1.0.2",
      permissions: [
        "activeTab",
        "scripting",
        "tabs",
        "storage",
        "downloads",
        "downloads.ui"
      ],
      host_permissions: [
        "http://localhost:*/*",
        "https://*/*"
      ],
      web_accessible_resources: [
        {
          resources: ["page-console-injector.js", "assets/*"],
          matches: ["<all_urls>"]
        }
      ],
      commands: {
        "activate-overlay": {
          suggested_key: {
            default: "Alt+Shift+K",
            mac: "Command+Shift+K"
          },
          description: "Activate Wingman feedback (⌘⇧K on Mac)"
        }
      }
    };

    // Environment-specific overrides
    if (isDev) {
      return {
        ...baseManifest,
        name: "Wingman (Dev)",
        description: "Wingman Chrome Extension - Development Build",
        version_name: `${baseManifest.version}-dev-${new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-')}`,
        icons: {
          "16": "icons-dev/icon16.png",
          "48": "icons-dev/icon48.png",
          "128": "icons-dev/icon128.png"
        },
        action: {
          default_icon: {
            "16": "icons-dev/icon16.png",
            "48": "icons-dev/icon48.png",
            "128": "icons-dev/icon128.png"
          }
        }
      };
    }

    if (isStaging) {
      return {
        ...baseManifest,
        name: "Wingman (Staging)",
        description: "Wingman Chrome Extension - Staging Build",
        version_name: `${baseManifest.version}-staging`,
        icons: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        },
        action: {
          default_icon: {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
          }
        }
      };
    }

    // Production
    return {
      ...baseManifest,
      name: "Wingman",
      description: "Wingman Chrome Extension - Lightweight UX feedback assistant for web applications",
      icons: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      },
      action: {
        default_icon: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      }
    };
  },

  // Development configuration
  dev: {
    // Auto-reload the extension when files change
    reloadOnChange: true,
    // Server configuration for HMR
    server: {
      port: 3000,
      hostname: 'localhost'
    }
  },

  // Build configuration
  build: {
    sourcemap: !isProd,
    minify: isProd,
  },

  // Define environment variables
  define: {
    'process.env.WINGMAN_ENV': JSON.stringify(environment),
    'process.env.NODE_ENV': JSON.stringify(environment),
  },

  // Configure TypeScript
  typescript: {
    typeCheck: true,
  },
});