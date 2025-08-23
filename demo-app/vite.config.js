import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Accept connections from any host
    allowedHosts: 'all', // Disable host header check
    cors: true // Enable CORS for all origins
  }
})
