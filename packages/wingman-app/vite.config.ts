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
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.wingmanux.com', // Allow all Wingman tunnel subdomains
      '.wingman-tunnel.fly.dev' // Allow tunnel server subdomains
    ],
    hmr: {
      clientPort: 443 // Configure HMR for HTTPS tunnels
    }
  },
});