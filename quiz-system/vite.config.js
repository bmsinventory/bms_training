import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/bms_training/quiz/',
  server: { port: 5173, base: '/quiz/' },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'supabase':        ['@supabase/supabase-js'],
          'pdf':             ['jspdf', 'html2canvas'],
          'qrcode':          ['qrcode'],
          'xlsx':            ['xlsx'],
        },
      },
    },
  },
});
