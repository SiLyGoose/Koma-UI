# Performance notes (2026-10-16)

## Status

Most of these are fixed on `feat/unique-treasures`, in both repos. The audit below is kept as it was written.

| Note | Status |
| --- | --- |
| 1 Databank reply | **Done.** Shared lines sent once (733 KB → 266 KB JSON, 33 KB brotli); made once per settings on the bot; ETag + no-cache, so a repeat visit downloads nothing while it's unchanged |
| 2a Item pictures | **Done.** Lazy in long lists; WebP made at build (`scripts/pictures.mjs`) |
| 2b Missing pictures | **Done.** A build-time list (`virtual:pictures`); no 404s |
| 2c Tab faces | **Done.** 96px cut (about 5 KB) |
| 2d Stage portraits | **Done.** WebP (13.6 MB → 2.8 MB for all) |
| 2e TM fight portraits | **Done.** WebP, decoded once for both cuts (not cut at build) |
| 2f Front page covers | **Done.** WebP (685 KB → 56 KB for the two big ones) |
| 2g TM textures | **Done.** Pairs merged at build, exact alpha (135 MB → 10 MB); the backdrop jpg and effects are not converted |
| 3a Armory grid | **Done.** Cards kept by copy id; ResizeObserver |
| 3b Heroes page | **Done.** Pick, search (debounced) and perk redraw only their parts; tab switches still redraw all, since hidden tabs keep the row's height |
| 3c Databank pick | **Done** |
| 3d Who's online | **Done.** Paused in a background tab; list drawn only when open and changed |
| 4 TM HUD bars | **Done.** scaleX. Damage numbers were already fine (placed once, animated by transform) |
| 5a Prefetch | **Done.** Each page's data asked for during the wipe; modules read on link hover. The wipe itself is unchanged, by choice |
| 5b Databank and the TM sim | **Not done.** The sim is used across the databank (hub, item details, bosses), not only its Heroes section |
| 5c Fonts | **Done.** Self-hosted (300 kept: the site title uses it) |
| 5d Front page CSS | Left as it is |
| 6 Gem sound | **Done.** 600 KB → 18 KB |
| 7 Bot | **Done.** Compression, Max-Age 7200; the databank stays `no-store` (cached per session in the page) |
| 8 Small things | Sub-treasure tap area done. Hero-cuts are not made immutable: their names don't change when a portrait's picture does. Cursor loop, glow animations and keys.png left as they are |

Also, at the user's request: baccarat, roulette and the TM room keep an away player's seat or place for 60 s.

---

Things that make the site slower than it needs to be. Ordered by how much players would feel it, against how much
work it is.

Rechecked after the unique treasure commits (`5669083` sim, `e9d3b5a` UI) and the bot's `2e11635`. Every finding below
was checked against that code. Sizes were measured on the files in `public/`, on a production build (`vite build`),
and on the bot's `databankView()` run locally.

---

## 1. The databank's reply is 733 KB, downloaded on every visit (new with the unique treasures)

- `GET /api/databank` comes to **733 KB of JSON**. Gzip makes it 47 KB and brotli 35 KB, but nothing compresses it (see 7).
  It's sent `no-store`, and `src/databank/page.ts:83` asks for it again on every visit to the databank, even within the same session.
- **517 KB of it is the 100 unique treasures**. Each one carries its own copy of the option pool: 5 lists of 28 lines,
  about 5 KB per treasure, nearly the same for all of them. The 21 TM items repeat one identical effects list, about 4 KB each (84 KB).
- Fixes, from least to most work:
  1. Compression on the bot (7): 733 KB becomes 47 KB on the wire.
  2. Keep the reply for the rest of the session in `src/databank/page.ts` (one module-level promise, as `loadMe` does). It
     only changes when the bot is updated.
  3. Send each shared pool once (a top-level `utOptions` / `tmPotentials`) and have each item point at it. That turns about
     600 KB into a few KB, and makes the phone parse less JSON too. It needs a bot change and a change to `databank/detail.ts`.

---

## 2. Pictures

### 2a. Item pictures: no lazy loading, and PNG
- `art()` in `src/shared/items/items.ts` makes every item `<img>` with no `loading="lazy"` and no `decoding="async"`.
  The databank's item list now draws all 202 items at once, including the new UT tier of 100. An armory with many copies
  does the same. So every picture is fetched at once.
- The page transition waits for **every** non-lazy `<img>` to decode before it uncovers the page (`pictures()` in
  `src/shared/transition/arriving.ts`, up to 1.5 s). So a long list holds the loading screen for pictures far below the fold.
  With `loading="lazy"` the transition only waits for the ones on screen (it already handles that case).
- The 104 treasure PNGs (124×124, the right size for the cards) come to 2.7 MB; as WebP (q82) they come to 0.55 MB. The weapons
  go from 610 KB to 168 KB. Either commit WebP, or convert at build time as `scripts/hero-cuts.mjs` does, then change the `.png` in `art()`.
- Fix: `img.loading = 'lazy'; img.decoding = 'async';` in `art()` (keep eager for the detail card and the hero slots, which are always on screen).

### 2b. 69 items have no picture, and each one costs a 404 per session
- 69 of the bot's 201 catalog items have no file under `public/gear/items/`: 29 weapons, all 10 armor, 9 treasures, and all 21
  TechnoMagic pieces. (Every unique weapon and unique treasure has one.) `art()` only finds out from the `error` event, and its
  `noArt` set resets on every page load, so opening the databank's item list sends 69 requests that 404.
- Fix: a build-time list of the pictures that exist (a generated `item-art.json`, or move the pictures into `src/` and use
  `import.meta.glob(..., { query: '?url' })`, which also gives hashed names that can be cached for good). Then `art()` goes straight to the slot icon.

### 2c. The UW/UT tab's hero face is a 256px cut shown at about 30px
- `uwMarks()` (`items.ts`), which `utMarks()` now uses too, asks for `heroCut(hero, FACE, 96)`. The built FACE cut is 256px
  (about 20 KB each) whatever is asked, and the tab is about 30% of a card's width (`styles/uw.css`). The databank's UW and UT tiers
  show all 25 heroes' faces, so about 500 KB for tabs, on top of the item pictures.
- Fix: a separate small frame (a copy of FACE) with its own BUILT_CUTS entry at 64–96px, used by `uwMarks()`.

### 2d. Full hero portraits on the heroes page stage
- `showWhole()` (`src/heroes/render.ts:90`) loads the hero's full portrait PNG (1024² or 700², **300–950 KB each**) every time a hero is picked.
- All 30 portraits come to 13.9 MB as PNG and 2.8 MB as WebP (q82). Fallen Frey alone goes from 954 KB to 124 KB.
- Fix: in `scripts/hero-cuts.mjs`, also write one WebP per portrait (the stage shows the whole picture, so a re-encode
  rather than a cut). Use it the same way `builtCut` does, falling back to the PNG in dev.

### 2e. The TM fight also loads full portraits, and decodes each twice
- `read()` (`src/technomagic/main.ts:203`) calls `cutFace()` and `cutHead()` (`hud/portrait.ts`) on the full portrait for every
  hero in the lineup. That is two full-size decodes of the same PNG, then a canvas cut. With 9 heroes that's several MB and
  about 18 large decodes on the main thread before the fight.
- Fix: add the card face and the 96px meter head to the build-time cuts. Short of that, decode once and share the image between the two cuts.

### 2f. Front page covers are huge PNGs
- `src/hub/hub.css:165` and `:170` use `/pinecraft/cover.png` (1319×961, **354 KB**) and `/raid/cover.png` (1076×604, **331 KB**) as backgrounds.
  As WebP they're **24 KB** and **22 KB**. Every visitor loads these on the first page they see.
- Fix: convert both and change the two `url()`s. (The other covers are already small.)

### 2g. TM scenery and textures
- `public/technomagic/scenery/wasteland/backdrop.jpg` (4080×1224) is 503 KB; as WebP it's 75 KB.
- Each model texture is two PNGs: `_D(RGB)` and `_D(AS)`. Only the AS file's red channel is used, yet it's stored as full RGBA
  (42 MB of AS files in `public/kr`). `texture()` in `src/technomagic/engine/models.ts` merges the pair on the main thread
  with `getImageData`, looping over every pixel.
  Merging each pair at build time into one RGBA WebP (q90, lossless alpha) turns Kirze's 2.0 MB into 0.2 MB and Klaus's 5.6 MB into 0.5 MB.
  It also halves the texture requests and removes the pixel loop. (The alpha must stay lossless because of `alphaTest: 0.5`.)

---

## 3. Redrawing too much

### 3a. The armory grid is rebuilt from nothing on every draw
- `armoryGrid().draw()` (`src/shared/items/armory.ts:108`) empties the grid and builds every card again: button, spans, a new
  `<img>`, the UW/UT face `<img>` and hover listeners. It does this on every pick, every search keystroke and every filter change.
  With unique treasures adding many more copies, an armory with a few hundred cards rebuilds thousands of nodes per click.
- Fix: keep a `Map<copy.id, button>`. On each draw, reuse a card whose look hasn't changed (picked, to-sell, tag, inert,
  locked), just toggling its classes, and only build cards that are new or changed. At least, a pick that only moves the
  ring could toggle `.picked` on two cards without calling `draw()`.
- Its `resize` listener reads `getComputedStyle` on every resize event; a `ResizeObserver` on the grid only fires when it really changes.

### 3b. The heroes page redraws every section on every change
- `render(ctx, act)` in `src/heroes/render.ts` runs roster, stage, slots, totals, grid, detail, stats (which re-runs the sim's
  `heroStats`), ascend, skills and transcend. It runs on every card pick, every **search keystroke** (`wireSearch` → `render`
  in `view.ts`), every filter change and every tab switch, including for tabs that are hidden (`.off`).
  The roster, skills and perk rows already skip themselves when nothing changed; the rest don't.
- Fix: a pick only needs `renderGrid` (or 3a's class toggle) and `renderDetail`; a search only needs `renderGrid`; a tab switch
  only needs its tab. Only draw Stats/Ascend while the Stats tab is showing. Wait about 100 ms after the last keystroke
  before drawing a search.
- The gear page (`src/gear/view/render.ts`) and the forge do the same thing: one `render()` that redraws everything.

### 3c. Databank: picking an item rebuilds the whole list
- The card click handler (`src/databank/list.ts:71`) calls `renderList(ctx)`, which rebuilds all 202 item cards and their
  pictures only to move the `picked` ring.
- Fix: toggle `.picked` on the old and new card, then `renderDetail(ctx)`.

### 3d. Who's online redraws every 10 s, even with its panel closed or the tab in the background
- `refresh()` in `src/shared/ui/live/live.ts` polls `/api/live` every 10 s and rebuilds the whole panel, avatars included, each time.
- Fix: rebuild only when the reply differs from the last one, build the rows only while the panel is open, and stop polling
  while `document.hidden` (poll at once on `visibilitychange`). Check first whether stopping while hidden changes what "online" should mean.

---

## 4. The TM fight HUD

- Widths are set every frame: `fill.style.width` in `hud/overhead.ts` (each hero), `hud/boss-bar.ts`, `hud/card.ts` (HP and
  cooldown fills) and `hud/meter.ts`. Damage numbers are placed with `style.left/top` (`hud/numbers.ts`).
  Each of those makes the browser lay the page out again, every frame.
- Fix: draw the fills at full width and set `transform: scaleX(share)` with `transform-origin: left`, and place numbers with
  `transform: translate()`. Those are done on the graphics card, with no new layout.
- Skip writes that haven't changed (the boss bar's text already does this; the widths don't).
- The unique treasure work in the sim (`5669083`) only adds small lookups per blow; nothing there needs attention.

---

## 5. Loading and navigation

### 5a. Start a page's data before the wipe finishes
- Going to another site page takes at least ~1.9 s: 800 ms wipe on, at least 300 ms under cover, then 800 ms wipe off
  (`src/shared/transition/swap.ts`). The page module is already fetched during the wipe (`go()` in `src/site/main.ts`), but the
  bot's data (`/api/heroes`, `/api/gear`, `/api/databank`, …) is only asked for once `mount()` runs, after the wipe is on.
- Fix: give `Route` an optional `prefetch()` that `go()` calls along with `route.page()`, and have `mount()` take the request
  already in flight. That hides up to 800 ms of API time behind the wipe.
- Also warm the module on `pointerenter`/`focus` of a header link (`route.page()` only reads it).
- Worth a thought: the full 800 ms wipe both ways is a design choice. The 400 ms quick wipe (`curtain`) might feel snappier
  between site pages.

### 5b. The databank loads the TM sim even for Items
- In the build, the databank's chunk still pulls in `heroes-*.js` (the TM sim: 214 KB, 63 KB gzip) and the heroes page's
  `render-*.js` (19 KB), because `src/databank/heroes.ts` uses `skillRows`. Only the Heroes section needs them.
- Fix: `import()` the heroes section when it's first opened.

### 5c. Fonts
- `index.html` and the 10 game pages load Poppins from Google Fonts: a stylesheet on another domain that blocks rendering,
  then font files from a third domain. Hosting the woff2 files under `/assets` removes those round trips before the first paint,
  and lets them be cached for good.
- Weight 300 is used once and 900 twice (not loaded at all; the browser fakes it). Drop 300 from the request, or load 900 if it's meant.

### 5d. Front page CSS
- The front page links 143 KB of CSS (34 KB gzip). Most of it is every other page's styles, imported in `src/site/main.ts` so
  they're ready when a page is swapped in. Low priority, and splitting it runs into the CSS chunk-order problem (shared CSS
  linked after `main-*.css`), so leave it unless the front page is shown to be slow.

---

## 6. Sounds

- `public/mines/sfx/gem-select.mp3` is **600 KB**, but it's 1.07 s of audio (about 17 KB). The rest is a 500×500 PNG cover picture
  embedded in its ID3 tag. Mines and Minesweeper both fetch and decode it.
  Fix: `ffmpeg -i gem-select.mp3 -map 0:a -c copy -map_metadata -1 out.mp3`. No other mp3 in `public/` has embedded art.

---

## 7. The bot (Koma repo)

- **No compression**: the Express app (`Koma/src/web/api.ts`) has no compression middleware, and Fly's proxy doesn't compress
  either, as far as I can tell. The databank's 733 KB (1) is the clearest case, but every JSON reply is affected: `/api/heroes`
  carries every hero's skills and every copy's effect lines, which unique treasures made longer. Check `Content-Encoding` on a
  response in devtools; if it's missing, `compression()` cuts these replies to roughly a fifteenth (733 KB → 47 KB for the databank).
- **CORS preflight**: every request sends `Authorization`, so the browser asks permission first (an extra round trip to `sjc`).
  It remembers the answer per URL for `Access-Control-Max-Age: 600` (`middleware/site.ts`). Raising it to 7200 (Chrome's cap)
  saves those trips for longer.
- `/api/databank` is `no-store` with ETags off. It only changes when the bot is updated, so it could be cached by version
  (or `private, max-age=300`). That goes with the client-side cache in 1.

---

## 8. Small things

- **The sub treasure boxes are hard to hit on a phone**: 13×13 px, and 11×11 px on narrow screens (`src/heroes/heroes.css`,
  `.hero-subs .sub-box`), stacked 2 px apart. Fingers need about 40 px. A larger invisible hit area (padding, or a `::before`
  bigger than the box) would keep the look.
- `vercel.json`: `/hero-cuts/` file names already contain a hash of what they're cut from, so they could be
  `max-age=31536000, immutable` instead of an hour.
- The custom cursor (`src/shared/cursor/index.ts`) runs its animation frame loop the whole time the mouse is in the window,
  even once everything has settled, and calls `getBoundingClientRect()` on the boxed element every frame. Stopping the loop once
  nothing moves (and starting it on `pointermove`/`pointerdown`) would save a little work while reading.
- Box-shadow glows animated forever make the browser repaint every frame: `banner-ring` (`banner/styles/page.css`) and `wish-tile-glow`
  (`banner/styles/wish.css`, one per 4★ tile). Animating the `opacity` of a pseudo-element that carries the glow is far cheaper.
- `public/pinecraft/keys.png` is 1536×1536 RGBA (292 KB) and gets trimmed at runtime (`pinecraft/draw/textures.ts`); it could be trimmed and resized once.

---

## Already in good shape (leave as is)
- Site pages lazy-loaded through ROUTES; the front page ships 17 KB `main` + 37 KB `ui` of JS (unchanged by the treasure work).
- TM reads only the lineup's heroes; hero faces and busts are cut at build time.
- The star chart backdrop steps at 8 fps; the cursor's spin runs as a Web Animation.
- Skills and perk rows on the heroes page are only rebuilt for another hero.
- The treasure pictures are 124×124, about right for the cards: they need a format change, not resizing.
