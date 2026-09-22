import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev, o Vite repassa /api e /uploads para a API .NET.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5080',
      '/uploads': 'http://localhost:5080',
    },
  },
})
