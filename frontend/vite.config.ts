import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
    // Proxy de desarrollo: redirige /api -> backend Laravel para evitar CORS
    // por completo (plan §3). El frontend solo adjunta el header Bearer.
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://web',
        changeOrigin: true,
      },
    },
  },
})
