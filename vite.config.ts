import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import  svgSfc  from  "vite-plugin-svg-sfc" ; 
import vue from '@vitejs/plugin-vue'

import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  base: '/sitemap/',
  plugins: [vue(), basicSsl(), svgSfc ( {  mark : "component"  } )],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',

    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    // https: true,
    strictPort: true, // 重要！如果 Port 被佔用，直接報錯，不要自動跳到 5174
  },
})
