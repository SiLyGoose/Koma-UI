import { playLoaded } from '../audio';
import { drawn } from './arriving';
import { FAST_WIPE_MS, MAX_HOLD_MS, MIN_SWAP_MS, WIPE_MS } from './timing';
import { clear, lessMotion, root, wait, wipeOff, wipeOn, type Direction } from './wipe';

/* Swapping a site page in place (src/site/main.ts), and the quick cover over a page while it works. */

let swapping = false;
/** The swap asked for while one was running: only the latest is kept, and runs once that one is done. */
let queued: { dir: Direction; change: () => void | Promise<void> } | null = null;

/**
 * Wipes the loading screen on, runs `change` under it (the router swapping the page), waits for the new
 * page to draw itself (holdReveal), and wipes it off. `back` runs it right to left. Without the motion,
 * just `change`.
 */
export async function swap(dir: Direction, change: () => void | Promise<void>): Promise<void> {
  if (lessMotion()) return change();
  if (swapping) {
    queued = { dir, change };
    return;
  }
  swapping = true;
  wipeOn(dir);
  await wait(WIPE_MS);
  root.setAttribute('data-tx', 'cover');
  try {
    await change();
  } finally {
    await Promise.all([wait(MIN_SWAP_MS), Promise.race([drawn(), wait(MAX_HOLD_MS)])]);
    // Another page asked for meanwhile: swap again under the same cover.
    while (queued) {
      const next = queued;
      queued = null;
      root.setAttribute('data-tx-dir', next.dir);
      await next.change();
      await Promise.race([drawn(), wait(MAX_HOLD_MS)]);
    }
    playLoaded();
    await wipeOff();
    swapping = false;
  }
}

/**
 * A quick cover over this page while `work` runs (a refine at the forge, say): the loading screen wipes
 * on at twice the page transition's speed, says `text` in place of "Loading…" for as long as `work`
 * takes, then wipes off the same way, uncovering whatever `work` put up under it. Without the motion
 * (or while a page is being swapped), just `work`.
 */
export async function curtain<T>(work: () => Promise<T>, text = 'Loading…'): Promise<T> {
  if (lessMotion() || swapping) return work();
  root.setAttribute('data-tx-fast', '');
  root.setAttribute('data-tx-text', text);
  wipeOn('forward');
  await wait(FAST_WIPE_MS);
  root.setAttribute('data-tx', 'cover');
  try {
    return await work();
  } finally {
    root.setAttribute('data-tx', 'out');
    await wait(FAST_WIPE_MS);
    clear();
  }
}
