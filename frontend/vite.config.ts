import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/sw.js': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/manifest.json': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
