import { page, remember } from './leaving';
import { WIPE_MS } from './timing';
import { lessMotion, root, shownSprite, wait, wipeOn } from './wipe';

/**
 * The browser's back button, run through the wipe (right to left) as the page's own ← is, for a page
 * that is its own document (a game). Going back to another document happens at once, before any script
 * gets a say, so this puts a second history entry for this same page on top of the one it arrived at:
 * back then only steps down to that one (a popstate, here), and the wipe covers the page before going
 * back for real. With nothing to go back to (a game opened in a new tab), it goes to `fallback`.
 *
 * The entry is added on the member's first click or key press: browsers skip over entries a page adds
 * before anyone has touched it, which would send back past this page with no wipe (as it was before).
 */
export function catchBack(fallback: string): void {
  const TRAP = 'koma.backTrap';
  const trapped = (state: unknown): boolean => (state as Record<string, unknown> | null)?.[TRAP] === true;

  const arm = (): void => {
    removeEventListener('click', arm, true);
    removeEventListener('keydown', arm, true);
    if (!trapped(history.state)) history.pushState({ ...history.state, [TRAP]: true }, '');
  };
  const armOnTouch = (): void => {
    // Arrived back on the entry on top (forward, or back from a page gone to with ←): it's in place already.
    if (trapped(history.state)) return;
    addEventListener('click', arm, true);
    addEventListener('keydown', arm, true);
  };
  armOnTouch();
  // Shown again from the browser's cache (forward, onto the entry it arrived at): again.
  addEventListener('pageshow', (e) => {
    if (e.persisted) armOnTouch();
  });

  let fallbackTimer = 0;
  // Gone (back for real): don't fall back when this page is shown again from the browser's cache.
  addEventListener('pagehide', () => clearTimeout(fallbackTimer));

  const goBack = (): void => {
    history.back();
    // Still here after a moment: there was nothing before this page.
    fallbackTimer = window.setTimeout(() => location.replace(new URL(fallback, location.href).href), 400);
  };

  addEventListener('popstate', async (e) => {
    // Forward onto the entry on top again: nothing to do.
    if (trapped(e.state) || page.leaving) return;
    page.leaving = true;
    if (lessMotion()) return goBack();
    wipeOn('back');
    await wait(WIPE_MS);
    root.setAttribute('data-tx', 'cover');
    // The page gone back to starts under the loading screen (with this sprite on it) and wipes it off right to left
    // (transition/head.js for a page loaded afresh, the pageshow listener in ./index.ts for one the browser kept).
    remember({ dir: 'back', at: Date.now(), sprite: shownSprite() });
    goBack();
  });
}
