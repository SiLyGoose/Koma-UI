import { playLoaded } from '../ui-sfx';
import { KEY, MAX_HOLD_MS, MAX_SETTLE_MS, SETTLE_FRAME_MS, SETTLE_FRAMES } from './timing';
import { clear, root, wait, wipeOff } from './wipe';

let holds = 0;
/** Waiting for every hold to be released. */
let waiting: (() => void)[] = [];

/** Done once nothing holds the reveal (at once when nothing does). */
export function drawn(): Promise<void> {
  if (holds === 0) return Promise.resolve();
  return new Promise((resolve) => waiting.push(resolve));
}

/**
 * Keeps this page under the loading screen until it has drawn itself: call it as the page starts,
 * and the function it returns once the page is drawn (or has given up). Calling that again does nothing.
 */
export function holdReveal(): () => void {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds > 0) return;
    for (const resolve of waiting) resolve();
    waiting = [];
  };
}

/** Wipes the loading screen off this page, if it started under it (transition-head.js). */
export async function reveal(): Promise<void> {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
  if (!root.hasAttribute('data-tx')) return;
  // Too late (the failsafe has let the page show already): don't cover it again.
  if (performance.now() > 3800) return clear();
  root.setAttribute('data-tx-live', '');
  // The page's own script runs after this one's (it imports it): give it the chance to hold the
  // reveal, then wait for what it holds.
  await wait(0);
  await Promise.race([drawn(), wait(MAX_HOLD_MS)]);
  await Promise.race([settled(), wait(MAX_SETTLE_MS)]);
  // The page is ready: its sound as the loading screen starts wiping off it.
  playLoaded();
  await wipeOff();
}

/** Done once frames come smoothly (SETTLE_FRAMES in a row, each within SETTLE_FRAME_MS of the last). */
function settled(): Promise<void> {
  return new Promise((resolve) => {
    let last = performance.now();
    const until = last + MAX_SETTLE_MS;
    let smooth = 0;
    const frame = (now: number): void => {
      smooth = now - last <= SETTLE_FRAME_MS ? smooth + 1 : 0;
      last = now;
      if (smooth >= SETTLE_FRAMES || now > until) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
