import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: '127.0.0.1', // loopback IP richiesto da Spotify per http
    port: 5173,
    strictPort: true,
    // niente https: Vite serve in HTTP puro
  },
})
