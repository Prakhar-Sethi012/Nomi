import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' // NEW IMPORT

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true  // <--- THIS IS THE MAGIC LINE
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'VIT Command Center',
        short_name: 'CommandCenter',
        description: 'Personal Student Dashboard for VIT',
        theme_color: '#0f172a', // This is Tailwind's slate-900 color!
        background_color: '#0f172a',
        display: 'standalone', // This is what hides the browser tabs/URL bar
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})