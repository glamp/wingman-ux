import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Accept connections from any host
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.wingmanux.com', // Allow all Wingman tunnel subdomains
      '.wingman-tunnel.fly.dev' // Allow tunnel server subdomains
    ],
    cors: true, // Enable CORS for all origins
    hmr: {
      clientPort: 443 // Configure HMR for HTTPS tunnels
    }
  }
})
