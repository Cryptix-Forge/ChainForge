// Docker-specific Vite config — only used inside the container.
// Identical to vite.config.ts except the proxy target points to the
// backend service name instead of localhost.
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    // Bind to all interfaces so Docker can expose the port
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // In Docker, use the backend service name — not localhost
        target: 'http://backend:5000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
