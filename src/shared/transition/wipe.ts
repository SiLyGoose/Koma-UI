import { WIPE_MS } from './timing';

/* The wipe itself: the attributes on <html> that transition/head.css animates. */

export type Direction = 'forward' | 'back';

export const root = document.documentElement;
export const lessMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts the panel wiping on, `dir`. The bounce keeps time with the clock (a bounce up and down a second), as the next page's does. */
export function wipeOn(dir: Direction): void {
  root.style.setProperty('--tx-phase', `${-(Date.now() % 1000)}ms`);
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-dir', dir);
  root.setAttribute('data-tx', 'in');
}

export async function wipeOff(): Promise<void> {
  root.setAttribute('data-tx', 'out');
  await wait(WIPE_MS);
  clear();
}

/** The sprite on the loading screen: this page's own, or the page before's while it's wiping off this one (transition/head.js). */
export const shownSprite = (): string => root.style.getPropertyValue('--tx-sprite-before') || root.style.getPropertyValue('--tx-sprite');

export function clear(): void {
  for (const name of ['data-tx', 'data-tx-dir', 'data-tx-live', 'data-tx-fast', 'data-tx-text']) root.removeAttribute(name);
  // Off this page: its own sprite from now on.
  root.style.removeProperty('--tx-sprite-before');
}
