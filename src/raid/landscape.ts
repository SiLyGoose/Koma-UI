import { $, ui } from './ui';

/*
 * Phones play the raid sideways, filling the screen like a game. Held upright, a cover asks them to
 * turn it (raid.css). Where the browser allows it (Android), its button goes full screen and locks the
 * screen to landscape, which turns it for them; held sideways, the first tap goes full screen. Where
 * it doesn't (every browser on an iPhone: no full screen for the page, no orientation lock), turning
 * the phone by hand works unless its rotation lock is on, so the button turns the page itself instead
 * (.rd-sideways in raid.css): laid out in landscape and drawn a quarter turn round.
 */

const root = document.documentElement;
const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
// iOS 16.4+ has screen.orientation.lock, but it always turns the request down: full screen tells them apart.
const canLock = document.fullscreenEnabled === true && typeof root.requestFullscreen === 'function' && typeof orientation?.lock === 'function';

/** Full screen and locked to landscape. False when the browser turned it down. */
async function playLandscape(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) await root.requestFullscreen({ navigationUI: 'hide' });
    await orientation?.lock?.('landscape');
    return true;
  } catch {
    return false;
  }
}

/** Turns the page itself sideways (see .rd-sideways). */
function turnSideways(): void {
  root.classList.add('rd-sideways');
  window.dispatchEvent(new Event('rd-screen'));
  ui.logPanel.open = false;
}

/** On a touch screen: the rotate cover's button, and (where it can) full screen on the first tap held sideways. */
export function setUpLandscape(): void {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const go = $<HTMLButtonElement>('rotate-go');
  go.hidden = false;
  go.textContent = canLock ? 'Play in landscape' : 'Play sideways';
  $('rotate-hint').hidden = canLock;
  go.addEventListener('click', () => {
    void (async () => {
      if (!canLock || !(await playLandscape())) turnSideways();
    })();
  });
  if (canLock) {
    document.addEventListener(
      'pointerdown',
      () => {
        if (window.matchMedia('(orientation: landscape)').matches && !document.fullscreenElement) void playLandscape();
      },
      { once: true },
    );
  }
}
