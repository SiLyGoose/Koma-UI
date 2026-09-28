import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The front page (log in, pick a server and a game) is index.html. Each game is served at
// /games/<name>/: its page lives at games/<name>/index.html, and the build keeps that path
// (dist/games/<name>/index.html), with the shared assets under /assets.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        mines: resolve(import.meta.dirname, 'games/mines/index.html'),
        pinecraft: resolve(import.meta.dirname, 'games/pinecraft/index.html'),
        baccarat: resolve(import.meta.dirname, 'games/baccarat/index.html'),
      },
    },
  },
});
