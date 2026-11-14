import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(appDir, '..');

const publicPages = readdirSync(rootDir)
  .filter((name) => name.endsWith('.html'))
  .map((name) => resolve(rootDir, name));

export default defineConfig({
  root: rootDir,
  envDir: appDir,

  plugins: [
    react(),
    {
      name: 'stockflow-app-spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const pathname = (req.url ?? '/').split('?')[0];
          const acceptsHtml =
            (req.headers.accept ?? '').includes('text/html');

          const isAppNavigation =
            pathname === '/app' ||
            pathname === '/app/' ||
            (
              pathname.startsWith('/app/') &&
              !pathname.split('/').pop()?.includes('.')
            );

          if (acceptsHtml && isAppNavigation) {
            req.url = '/app/index.html';
          }

          next();
        });
      },
    },
  ],

  // Los archivos estáticos se sirven desde la raíz.
  base: '/',

  server: {
    port: 5173,
    host: '127.0.0.1',
  },

  build: {
    // La salida se calcula desde rootDir.
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: [
        ...publicPages,
        resolve(rootDir, 'app/index.html'),
      ],
    },
  },
});
