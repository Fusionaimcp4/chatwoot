import { defineConfig } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lightweight Vitest config for widget unit tests.
 * Avoids loading vite-plugin-ruby (ESM/require issue on some Windows setups).
 */
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => ['ninja-keys'].includes(tag),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      widget: path.resolve(root, './app/javascript/widget'),
      shared: path.resolve(root, './app/javascript/shared'),
      dashboard: path.resolve(root, './app/javascript/dashboard'),
      helpers: path.resolve(root, './app/javascript/shared/helpers'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['fake-indexeddb/auto', 'vitest.setup.js'],
    mockReset: true,
    clearMocks: true,
  },
});
