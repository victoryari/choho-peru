import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Permitir tuneles publicos como Cloudflare Tunnel (*.trycloudflare.com), ngrok o dominios externos
      allowedHosts: true as const,
      // Configuración de HMR compatible con túneles HTTPS (Cloudflare, ngrok)
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443 },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
