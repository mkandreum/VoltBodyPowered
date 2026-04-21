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
          theme_color: '#000000',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globIgnores: ['**/index.html', '**/manifest.webmanifest', '**/*.map'],
          runtimeCaching: [
            {
              urlPattern: /index\.html/,
              handler: 'NetworkFirst',
            }
          ]
        }
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
