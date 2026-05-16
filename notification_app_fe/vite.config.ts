import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/eval-api': {
        target: 'http://4.224.186.213',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eval-api/, '/evaluation-service'),
      },
    },
  },
})
