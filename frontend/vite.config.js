import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // The dev server forwards API, admin, static and media requests to Django so the
      // browser sees a single origin (session + CSRF cookies just work).
      // changeOrigin stays off so Django sees the host the browser used: image URLs then
      // point back through this server, which a phone on the same Wi-Fi can reach.
      proxy: {
        '/api': { target: backendUrl, changeOrigin: false },
        '/admin': { target: backendUrl, changeOrigin: false },
        '/static': { target: backendUrl, changeOrigin: false },
        '/media': { target: backendUrl, changeOrigin: false },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: false,
      // Parallel jsdom workers time out on slower Windows machines.
      maxWorkers: 1,
    },
  }
})
