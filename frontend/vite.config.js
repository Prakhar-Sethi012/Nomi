import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push new code
      devOptions: {
        enabled: true // Allows us to test the service worker in localhost!
      },
      workbox: {
        // This tells the service worker to cache ALL static files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Ignore URL parameters for caching purposes
        ignoreURLParametersMatching: [/.*/] 
      },
      manifest: {
        // id pins the TWA/Play Store listing to this one stable identity —
        // without it, a future manifest edit (name, icons, ...) risks
        // Android treating the update as a different app instead of a
        // new version of this one.
        id: '/',
        name: 'Command Center',
        short_name: 'Command Center',
        description: 'Personal Student OS & Task Manager',
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})