import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8881,
    strictPort: true,
  },
  preview: {
    allowedHosts: [
      'download.obaika.fun'
    ]
  }
})
