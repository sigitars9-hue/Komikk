import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://gv-comics-api-2.vercel.app/api', // ganti domain FE/BE yg ada /api/submit
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
