import './close.css';

/*
 * The site's X (close.css): what closes a popup or a sheet, or leaves a section for where it came from.
 * Four arms about a dot, bare, as on a game's menu; under the mouse (or the keyboard's focus) it turns
 * gold, the dot grows, and the arms move out to make it room.
 *
 * It is drawn on a button, or on a link where the way out is a page of its own. What it closes, and what
 * it is called for a screen reader (aria-label), are its page's.
 */

/** The drawing: the arms from the corners in, then the dot (close.css moves them by their order). */
const MARK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l4.8 4.8" /><path d="M20 4l-4.8 4.8" /><path d="M20 20l-4.8-4.8" /><path d="M4 20l4.8-4.8" /><circle cx="12" cy="12" r="1.3" /></svg>';

/** Draws `el`, a button or a link already in the page, as the X, in place of whatever it held. */
export function closeMark<T extends HTMLElement>(el: T): T {
  el.classList.add('close-x');
  el.innerHTML = MARK;
  return el;
}

/** A new X, a button called `label` for a screen reader. */
export function closeButton(label = 'Close'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  return closeMark(button);
}
