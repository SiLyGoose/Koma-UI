import { HAND_PRESSED } from './parts';
import { savePlace } from './place';

/**
 * The hand: the browser's own pointer with the hand's picture (cursor.css), not one drawn by the page. A
 * hand drawn by the page only moves when the page gets to move it: always a frame or two behind the mouse,
 * and stuck where it was whenever the page was busy (loading and drawing itself, most of all), then jumping
 * to the mouse. The browser's own never waits on the page.
 */
export function nativeHand(): void {
  const html = document.documentElement;
  html.classList.add('hand-on');
  // Loaded now, so the first press shows it straight away.
  new Image().src = HAND_PRESSED;

  /** Where the mouse is, and whether it's in the window. */
  let mx = 0;
  let my = 0;
  let inside = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      inside = true;
    },
    { capture: true, passive: true },
  );
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && !e.relatedTarget) inside = false;
  });
  // Where the mouse is as this page goes, for the next page's dot and brackets to start from (./place.ts).
  addEventListener('pagehide', () => {
    if (inside) savePlace(mx, my);
  });

  // The hand pressing, while a mouse button is held.
  const press = (on: boolean): void => {
    html.toggleAttribute('data-hand-pressed', on);
  };
  window.addEventListener('pointerdown', (e) => e.pointerType === 'mouse' && press(true), { capture: true });
  for (const type of ['pointerup', 'pointercancel'] as const) window.addEventListener(type, (e) => e.pointerType === 'mouse' && press(false), { capture: true });
  addEventListener('blur', () => press(false));
}
