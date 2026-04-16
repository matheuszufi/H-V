import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Encaminha /api/* para o servidor Vercel Dev (porta 3000) durante dev local
    // Para usar: rode `vercel dev` na raiz (não `npm run dev`)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
