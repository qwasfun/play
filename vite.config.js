import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const project = fileURLToPath(new URL('./', import.meta.url));
export default defineConfig({
  root: resolve(project, 'apps/arcade'),
  base: './',
  // Keep source development outside the offline preview's Service Worker origin.
  server: { host: '0.0.0.0', port: 4174 },
  build: {
    outDir: resolve(project, 'dist'),
    emptyOutDir: true,
    manifest: 'module-map.json',
    target: 'es2022',
    rolldownOptions: {
      input: {
        app: resolve(project, 'apps/arcade/index.html'),
        catalog: resolve(project, 'packages/game-registry/src/index.js'),
        core: resolve(project, 'packages/game-registry/src/core.js'),
      },
      preserveEntrySignatures: 'strict',
    },
  },
});
