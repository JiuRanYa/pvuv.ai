import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
const resolve = path => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: resolve('./'),
  publicDir: resolve('../workers/console/public'),
  plugins: [{
    name: 'console-dev-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '/').split('?')[0];
        if (/^\/(?:site|sites|settings|login|visitor|public|health)(?:\.html)?\/?$|^\/(?:sites|share)\//.test(path)) {
          req.url = '/console.html';
        }
        next();
      });
    },
  }],
  css: { postcss: { plugins: [tailwind({ base: resolve('./src') })] } },
  esbuild: { jsx: 'automatic' },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    outDir: resolve('../workers/console/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve('console.html'),
      output: { manualChunks(id) { if (id.endsWith('/worldMapData.ts')) return 'world-map'; } },
    },
  },
});
