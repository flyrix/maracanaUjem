import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Maracana Petit Poteau',
        short_name: 'Petit Poteau',
        description: 'Tournoi Maracana : live, licences et table de marque hors-ligne.',
        theme_color: '#0B3B2E',
        background_color: '#0B3B2E',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html'
      }
    })
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: { port: 5173 }
})
