import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 3001,
    host: true,
    historyApiFallback: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.wingmanux.com', // Allow all Wingman tunnel subdomains
      '.wingman-tunnel.fly.dev' // Allow tunnel server subdomains
    ],
    // Only set HMR clientPort for tunnels, not local dev
    hmr: process.env.TUNNEL_MODE === 'tunnel' ? {
      clientPort: 443 // Configure HMR for HTTPS tunnels
    } : {},
    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
        changeOrigin: true,
      }
    }
  },
});