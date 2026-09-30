import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * The page transitions' first half (src/shared/transition-head.*), inline at the end of every page's
 * <head>, so a page that was arrived at through a transition starts covered before anything else
 * loads. Read on every page, so editing them shows straight away in dev.
 */
function transitionHead(): Plugin {
  const read = (file: string): string => readFileSync(resolve(import.meta.dirname, 'src/shared', file), 'utf8');
  return {
    name: 'transition-head',
    transformIndexHtml: () => [
      { tag: 'style', children: read('transition-head.css'), injectTo: 'head' },
      { tag: 'script', children: read('transition-head.js'), injectTo: 'head' },
    ],
  };
}

// The front page (log in, pick a server and a game) is index.html. Each game is served at
// /games/<name>/: its page lives at games/<name>/index.html, and the build keeps that path
// (dist/games/<name>/index.html), with the shared assets under /assets. The site's own pages (the front page,
// /gear/, /forge/ and /databank/) are all index.html, which swaps between them (src/site/main.ts; vercel.json sends
// /gear/, /forge/ and /databank/ there).
export default defineConfig({
  plugins: [transitionHead()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        mines: resolve(import.meta.dirname, 'games/mines/index.html'),
        pinecraft: resolve(import.meta.dirname, 'games/pinecraft/index.html'),
        baccarat: resolve(import.meta.dirname, 'games/baccarat/index.html'),
        roulette: resolve(import.meta.dirname, 'games/roulette/index.html'),
        raid: resolve(import.meta.dirname, 'games/raid/index.html'),
        // The raid party's gear, in the raid page's popup.
        raidGear: resolve(import.meta.dirname, 'games/raid/gear/index.html'),
      },
    },
  },
});
