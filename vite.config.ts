import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The mine is served at /games/mines/: its page lives at games/mines/index.html, and the build
// keeps that path (dist/games/mines/index.html), with the shared assets under /assets.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: { mines: resolve(import.meta.dirname, 'games/mines/index.html') },
    },
  },
});
