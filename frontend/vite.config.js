import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/calculate': 'http://localhost:8000',
      '/calculate_two': 'http://localhost:8000',
    }
  },
  build: {
    outDir: '../static_react',
    emptyOutDir: true,
  }
})
