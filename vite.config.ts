import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
// @ts-expect-error: a plain script (no types), shared with scripts/pictures.mjs.
import { BUILT_DIR, builtPath, FOLDERS, pictures as builtPictures } from './scripts/built.mjs';

/**
 * The page transitions' first half (src/shared/transition/head.*), inline at the end of every page's
 * <head>, so a page that was arrived at through a transition starts covered before anything else
 * loads. Read on every page, so editing them shows straight away in dev.
 */
function transitionHead(): Plugin {
  const read = (file: string): string => readFileSync(resolve(import.meta.dirname, 'src/shared', file), 'utf8');
  return {
    name: 'transition-head',
    transformIndexHtml: () => [
      { tag: 'style', children: read('transition/head.css'), injectTo: 'head' },
      { tag: 'script', children: read('transition/head.js'), injectTo: 'head' },
    ],
  };
}

/**
 * `virtual:pictures` (src/shared/built.ts reads it): which items have a picture (public/gear/items/<folder>/<id>.png, so
 * none is asked for that isn't there), and, in a build, which pictures were made as WebP (scripts/pictures.mjs runs
 * before it): the folders they're made for, and any of those that couldn't be made. In `yarn dev`, none (the PNGs).
 */
function pictures(): Plugin {
  const id = 'virtual:pictures';
  const resolved = `\0${id}`;
  const pub = resolve(import.meta.dirname, 'public');
  let building = false;
  const names = (dir: string): string[] =>
    existsSync(resolve(pub, dir)) ? readdirSync(resolve(pub, dir)).filter((file) => file.endsWith('.png')).map((file) => file.slice(0, -'.png'.length)) : [];
  return {
    name: 'pictures',
    configResolved: (config) => void (building = config.command === 'build'),
    resolveId: (source) => (source === id ? resolved : null),
    load(loaded) {
      if (loaded !== resolved) return null;
      const art = { weapons: names('gear/items/weapons'), armor: names('gear/items/armor'), treasures: names('gear/items/treasures') };
      const missing = building ? (builtPictures(pub) as string[]).filter((path) => !existsSync(resolve(pub, builtPath(path) as string))).map((path) => `/${path}`) : [];
      return [
        `export const ITEM_ART = ${JSON.stringify(art)};`,
        `export const BUILT = ${building ? JSON.stringify({ dir: `/${BUILT_DIR}`, folders: (FOLDERS as string[]).map((folder) => `/${folder}`), missing }) : 'null'};`,
      ].join('\n');
    },
  };
}

// The front page (log in, pick a server and a game) is index.html. Each game is served at
// /games/<name>/: its page lives at games/<name>/index.html, and the build keeps that path
// (dist/games/<name>/index.html), with the shared assets under /assets. The site's own pages (the front page,
// /gear/, /heroes/, /forge/, /shop/ with its tabs, /dressing-room/, /databank/ with its sections and /admin/) are all index.html, which swaps between them
// (src/site/main.ts; vercel.json sends /gear/, /heroes/, /forge/, /shop/…, /dressing-room/, /databank/… and /admin/ there, and the old
// /banner/ to /shop/wish/).
export default defineConfig({
  plugins: [transitionHead(), pictures()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        mines: resolve(import.meta.dirname, 'games/mines/index.html'),
        pinecraft: resolve(import.meta.dirname, 'games/pinecraft/index.html'),
        baccarat: resolve(import.meta.dirname, 'games/baccarat/index.html'),
        roulette: resolve(import.meta.dirname, 'games/roulette/index.html'),
        poker: resolve(import.meta.dirname, 'games/poker/index.html'),
        raid: resolve(import.meta.dirname, 'games/raid/index.html'),
        minesweeper: resolve(import.meta.dirname, 'games/minesweeper/index.html'),
        technomagic: resolve(import.meta.dirname, 'games/technomagic/index.html'),
        // The heroes page, in the TechnoMagic Raid's Manage popup.
        technomagicHeroes: resolve(import.meta.dirname, 'games/technomagic/heroes/index.html'),
        // The raid party's gear, in the raid page's popup.
        raidGear: resolve(import.meta.dirname, 'games/raid/gear/index.html'),
      },
    },
  },
});
