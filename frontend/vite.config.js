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
        name: 'VIT Command Center',
        short_name: 'CommandCenter',
        description: 'Personal Student OS & Task Manager',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/vite.svg', // Temporary icon until you design a custom one
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})