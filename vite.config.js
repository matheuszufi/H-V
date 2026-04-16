import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Encaminha /api/* para o servidor local de dev (dev-server.mjs)
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
})
