import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'vite.svg'],
      manifest: {
        name: 'Novel Reader',
        short_name: 'Reader',
        description: 'A fully offline-capable ebook and document reader',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB limit for large assets like PDF worker
      }
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    }
  },
  build: {
    target: 'es2022',
  },
  worker: {
    format: 'es'
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
});
