import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { fileURLToPath } from 'url'
import path from 'path'

export default defineConfig({
  // Mirror the production vite.config AutoImport so modules that rely on
  // auto-imported `ref`/`computed`/etc. (e.g. anything reachable through the
  // `@/utils` barrel) transform correctly under vitest. Without this, importing
  // real app modules (MenuProcessor, stores, …) fails with "ref is not defined".
  plugins: [
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      dts: false // dts is owned by vite.config (src/types/import/auto-imports.d.ts); don't emit a stray root file
    }),
    vue()
  ],
  // `__APP_VERSION__` is injected by vite's `define` in production; vitest
  // doesn't run that, so define a stable test value (modules like
  // storage-config read it at class-init time when pulled via `@/utils`).
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test')
  },
  test: {
    environment: 'jsdom',
    globals: false,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@locales': path.resolve(__dirname, './locales'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@imgs': path.resolve(__dirname, 'src/assets/images'),
      '@icons': path.resolve(__dirname, 'src/assets/icons'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@stores': path.resolve(__dirname, 'src/store'),
      '@styles': path.resolve(__dirname, 'src/assets/styles')
    }
  }
})
