import { defineConfig } from 'vite';
import { resolve } from 'path';

// Get environment from WINGMAN_ENV or NODE_ENV, default to development
const environment = process.env.WINGMAN_ENV || process.env.NODE_ENV || 'development';
const isProd = environment === 'production';

console.log(`Building Chrome Extension Content Script for environment: ${environment}`);

export default defineConfig(async () => {
  // Dynamically import React plugin to avoid ESM issues
  const { default: react } = await import('@vitejs/plugin-react');
  
  return {
    build: {
      outDir: `dist/${environment}`,
      emptyOutDir: false,  // Don't empty the dir since main build already did
      minify: isProd ? 'terser' : false,
      sourcemap: !isProd,
      terserOptions: isProd ? {
        compress: {
          drop_console: false, // Keep console.error
          pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'], // Remove these
        },
      } : undefined,
      lib: {
        entry: resolve(__dirname, 'src/content/index.ts'),
        name: 'WingmanContent',
        fileName: () => 'content.js',
        formats: ['iife'],
      },
      rollupOptions: {
        output: {
          // Ensure no exports in IIFE
          exports: 'none',
        },
      },
    },
    define: {
      'process.env.WINGMAN_ENV': JSON.stringify(environment),
      'process.env.NODE_ENV': JSON.stringify(environment),
      'process.env': JSON.stringify({ WINGMAN_ENV: environment, NODE_ENV: environment }),
    },
    plugins: [
      // React plugin for JSX support
      react(),
    ],
  };
});