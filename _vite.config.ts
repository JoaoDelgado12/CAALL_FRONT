import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173, // Certifique-se de que a porta bate com o túnel
    strictPort: true, // Força o Vite a sempre usar essa porta exata
    allowedHosts: [
      'caall.stockmei.win' 
    ]
  },
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src', //onde estara as configurações
    filename: 'sw.ts', //o nome do precache Manifest
    registerType: 'autoUpdate', //atualização de versão automatica
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
      display: 'standalone',
      start_url: "/"
    },

    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },

    devOptions: {
      enabled: true, //no modo dev precisa ser true
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})