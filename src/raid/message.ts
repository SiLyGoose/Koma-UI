import { showMessage as show } from '../shared/game/message';
import { holdReveal } from '../shared/transition';

/**
 * The loading screen stays over the page until its first screen is drawn, the boss's picture in it (the
 * frame's own hold lets go as soon as it connects, before the raid has been sent). Anything that stops
 * it drawing (no link, an error, the connection lost) lets go too; the transition gives up by itself after a while.
 */
export const firstPaint = holdReveal();

/** The box over the page saying why it can't go on (uncovering the page for it). */
export function showMessage(title: string, text: string): void {
  firstPaint();
  show(title, text);
}
