import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        updates: resolve(__dirname, 'updates.html'),
        privacidade: resolve(__dirname, 'privacidade.html'),
        termos: resolve(__dirname, 'termos.html'),
        cookies: resolve(__dirname, 'cookies.html'),
      },
    },
  },
});
