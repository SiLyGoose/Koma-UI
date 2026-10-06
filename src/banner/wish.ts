import { art, el, SLOT_NAME, stars } from '../shared/items/items';
import { sleep } from '../shared/sleep';
import type { ApiResult } from '../site/session';
import type { BannerContext } from './context';
import { revealed, wishClosed } from './sfx';
import { startSky } from './sky';
import type { BannerPull, BannerResult, Stars } from './types';

/*
 * The wish, as Genshin's (about 6s): the screen goes to a night sky, a star comes in from the left
 * and falls across it, catching the colour of the best item pulled part way down (red for a unique
 * treasure), and where it lands a flash of that colour fills the screen. Under the white the first
 * item is already waiting, dark; the white clears off it from the middle out, and it comes out of
 * the light as a silhouette that fills with colour as its tier's light blooms behind it, then its
 * name and its stars one by one, and whether it's new. Each item after it does the same (a top-tier
 * one flashes again first), best first. A click (or
 * Enter, or Space) goes on to the next; a multi pull ends on all of them together. Skip (or Escape)
 * goes straight to that (a single pull's one item is still shown).
 */

/** How long the sky shows before the star falls, at the least (the pull is asked for meanwhile). */
const SKY_MS = 450;
/** How long the flash takes to fill the screen, and how long it holds there. */
const FLASH_IN_MS = 160;
const FLASH_HOLD_MS = 480;
/** How many small stars come along on a multi pull. */
const COMPANIONS = 3;
/** The top tier, whose items flash again before they're shown (as the bot's PITY_STARS). */
const TOP_TIER: Stars = 4;

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The tier's colour (the page's --star-N: items.css). */
const tierColor = (box: HTMLElement, tier: Stars): string => getComputedStyle(box).getPropertyValue(`--star-${tier}`).trim() || '#ffffff';

/** What a click, a key or Skip did, waiting on the member. */
type Step = 'next' | 'skip';

/**
 * Plays the wish for `request` (the pull, asked for as it starts): the sky while it's on its way, then
 * the star, the flash and the items. Done once the member has seen them and closed it, with what the
 * bot answered; a pull that didn't go through closes it at once.
 */
export async function playWish(ctx: BannerContext, request: Promise<ApiResult<BannerResult>>): Promise<ApiResult<BannerResult>> {
  const { ui } = ctx;
  const ended = new AbortController();
  const { signal } = ended;
  const sky = startSky(ui.sky);

  // What the member does, for whatever's waiting on them. Until the items show, only Skip counts.
  let waiting: ((step: Step) => void) | null = null;
  let showing = false;
  const step = (s: Step): void => {
    const resolve = waiting;
    waiting = null;
    resolve?.(s);
  };
  const next = (): Promise<Step> => (signal.aborted ? Promise.resolve<Step>('skip') : new Promise<Step>((resolve) => (waiting = resolve)));
  ui.stage.addEventListener('click', () => showing && step('next'), { signal });
  ui.skip.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      step('skip');
    },
    { signal },
  );
  ui.wish.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') step('skip');
      else if (e.key === 'Enter' || e.key === ' ') {
        if (showing) step('next');
      } else return;
      e.preventDefault();
    },
    { signal },
  );

  const close = (): void => {
    if (signal.aborted) return;
    ended.abort();
    step('skip');
    sky.stop();
    ctx.endWish = null;
    ui.wish.classList.remove('on', 'revealing');
    ui.flash.classList.remove('on');
    ui.stage.replaceChildren();
  };
  ctx.endWish = close;

  ui.stage.replaceChildren();
  ui.skip.hidden = true;
  ui.wish.classList.remove('revealing');
  ui.wish.classList.add('on');
  ui.wish.focus();

  const [res] = await Promise.all([request, sleep(SKY_MS)]);
  if (!res.ok || signal.aborted) {
    close();
    return res;
  }

  // Best first, as Genshin lines them up (in the order pulled within a tier).
  const pulls = [...res.data.pulls].sort((a, b) => b.stars - a.stars);
  const best = pulls[0]?.stars ?? 1;
  ui.wish.dataset.stars = String(best);

  ui.skip.hidden = false;
  let skipped = false;
  if (!reducedMotion()) {
    const falling = sky.fall(tierColor(ui.wish, best), pulls.length > 1 ? COMPANIONS : 0);
    skipped = (await Promise.race([falling.then(() => 'next' as const), next()])) === 'skip';
    waiting = null;
  }
  if (signal.aborted) return res;

  // The flash fills the screen. Under it the sky goes, the stage the items stand on comes, and the
  // first item is put in, held still (its silhouette, nothing else showing yet) until the white clears.
  // Skipping the star still shows a single pull's item; a multi pull's go straight to all of them.
  const shown = !skipped || pulls.length === 1 ? pulls : [];
  ui.flash.classList.add('on');
  await sleep(FLASH_IN_MS);
  if (signal.aborted) return res;
  sky.stop();
  ui.wish.classList.add('revealing');
  const first = shown[0] ? reveal(shown[0], 0, shown.length) : summary(pulls);
  first.classList.add('held');
  ui.stage.replaceChildren(first);
  if (!skipped) await sleep(FLASH_HOLD_MS);
  if (signal.aborted) return res;

  // The white clears from the middle out, and the item comes out of it.
  ui.flash.classList.remove('on');
  first.classList.remove('held');
  showing = true;

  for (const [i, pull] of shown.entries()) {
    if (i > 0) {
      // A top-tier item flashes again before it comes, as a 5-star does in Genshin.
      if (pull.stars === TOP_TIER) {
        ui.flash.classList.add('on');
        await sleep(FLASH_IN_MS);
        if (signal.aborted) break;
        ui.flash.classList.remove('on');
      }
      ui.stage.replaceChildren(reveal(pull, i, shown.length));
    }
    revealed(pull.stars);
    if ((await next()) === 'skip') break;
  }
  if (pulls.length > 1 && !signal.aborted) {
    ui.skip.hidden = true;
    // Straight here from skipping the star, the summary is already up.
    if (shown.length > 0) ui.stage.replaceChildren(summary(pulls));
    revealed(best);
    await next();
  }
  if (!signal.aborted) wishClosed();
  close();
  return res;
}

/** One item, out of the flash: its picture in a burst of its tier's colour, then its name and stars. */
function reveal(pull: BannerPull, index: number, of: number): HTMLElement {
  const box = el('div', 'wish-reveal');
  box.dataset.stars = String(pull.stars);

  const burst = el('div', 'wish-burst');
  burst.append(el('span', 'wish-rays'), el('span', 'wish-rays back'), el('span', 'wish-core'), card(pull));

  const text = el('div', 'wish-text');
  const row = stars(pull.stars);
  [...row.children].forEach((star, i) => (star as HTMLElement).style.setProperty('--i', String(i)));
  text.append(el('p', 'wish-slot', SLOT_NAME[pull.slot]), el('h2', 'wish-name', pull.name), row);
  text.append(pull.isNew ? el('p', 'wish-new', 'New!') : el('p', 'wish-owned', `You have ${pull.count}`));
  if (pull.borrowed !== null) text.append(el('p', 'wish-note', `Made for someone else: it works at ${Math.round(pull.borrowed * 100)}% for you.`));

  box.append(burst, text, el('p', 'wish-tap', of > 1 ? `${index + 1} / ${of} · Click to continue` : 'Click to continue'));
  return box;
}

/** A multi pull's items together, best first, coming in one after another. */
function summary(pulls: readonly BannerPull[]): HTMLElement {
  const box = el('div', 'wish-summary');
  const grid = el('ul', 'wish-grid');
  for (const [i, pull] of pulls.entries()) {
    const tile = el('li', 'wish-tile');
    tile.dataset.stars = String(pull.stars);
    tile.style.setProperty('--i', String(i));
    tile.append(card(pull), el('span', 'wish-tile-name', pull.name));
    if (pull.isNew) tile.append(el('span', 'wish-tile-new', 'New'));
    grid.append(tile);
  }
  box.append(el('h2', 'wish-summary-title', `Pulled ×${pulls.length}`), grid, el('p', 'wish-tap', 'Click anywhere to continue'));
  return box;
}

/** The item's card, as the armories draw it (../shared/items: its picture, stars and the parchment's curl). */
function card(pull: BannerPull): HTMLElement {
  const face = el('span', 'item wish-card');
  face.dataset.stars = String(pull.stars);
  face.append(art(pull.itemId, pull.slot), stars(pull.stars), el('span', 'item-curl'));
  return face;
}
