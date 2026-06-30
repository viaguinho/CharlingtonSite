import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
