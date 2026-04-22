import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'VoltBody Powered',
          short_name: 'VoltBody',
          description: 'Entrenamiento y nutricion con IA',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#050505',
          theme_color: '#050505',
          lang: 'es',
          icons: [
            {
              src: '/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: '/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globIgnores: ['**/index.html', '**/manifest.webmanifest', '**/*.map'],
          importScripts: ['/sw-notifications.js'],
          runtimeCaching: [
            {
              urlPattern: /index\.html/,
              handler: 'NetworkFirst',
            },
          ],
        },
      })
    ],
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser' as const,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'zustand'],
            '3d': ['three', '@react-three/fiber', '@react-three/drei'],
            'ui': ['motion', 'lucide-react', 'recharts', 'date-fns'],
          },
        },
      },
    },    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
