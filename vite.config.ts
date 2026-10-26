/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' lets the static build work from any sub-path (GitHub Pages: /ExoMeal/).
// The app uses hash routing, so no server-side rewrites are needed.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte()],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  // Svelte must resolve its browser build when the interface is tested in jsdom.
  resolve: mode === 'test' ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
