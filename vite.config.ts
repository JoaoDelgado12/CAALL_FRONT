import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173, // Certifique-se de que a porta bate com o túnel
    strictPort: true, // Força o Vite a sempre usar essa porta exata
    allowedHosts: [
      'caall.stockmei.win' 
    ]
  },
  plugins: [
    react(), 
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src', // onde estara as configurações
      filename: 'sw.ts', // o nome do precache Manifest
      registerType: 'autoUpdate', // atualização de versão automatica
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'CAALL',
        short_name: 'CAALL',
        description: 'APP de assistencia voltado a filosofia de uma comunicação aumentativa e alterantiva',
        theme_color: '#86007D',
        background_color: '#ffffff', // Required heuristic for PWA install prompts
        display: 'standalone',
        start_url: "/",
        scope: "/", // Explicitly define scope for offline routing
        icons: [
          // Explicit icon mapping is strictly required by Chromium/Safari to allow installation
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Supports adaptive icons on Android
          }
        ]
      },

      injectManifest: {
        // Broadened to include fonts and wasm/json chunks for offline Dexie/React dependencies
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2,wasm}'],
      },

      devOptions: {
        enabled: true, // no modo dev precisa ser true
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    })
  ],
})