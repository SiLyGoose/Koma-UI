import './button.css';

/*
 * The site's buttons (button.css): one look for each kind (.action.main, .secondary, .danger, .icon,
 * .choice, .large) and the same states for all. What's here is what a page draws
 * with them: a button working on a request, and something already done said in place of its button.
 */

/** How long a button waits for the bot before its spinner takes the place of its words. */
export const SLOW_MS = 3000;

/** A request under way: what started it (the page's own name for the button), and when. */
export interface Busy {
  action: string;
  since: number;
}

/** A request starting now, for `action`'s button. */
export const busyWith = (action: string): Busy => ({ action, since: performance.now() });

/**
 * Draws `button` working while `busy` is its request (`action`), as it is otherwise. Working, it looks
 * disabled at once (aria-disabled, so it keeps the focus) and, SLOW_MS after the request began, its
 * spinner takes the place of its words (.slow), the button staying the same size. A button drawn again
 * partway through (a page that redraws its buttons) picks up where the request is, not from the start.
 */
export function working(button: HTMLElement, busy: Busy | null, action: string): void {
  const on = busy?.action === action;
  button.classList.toggle('working', on);
  if (!on) {
    button.classList.remove('slow');
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
    delete button.dataset.since;
    return;
  }
  button.setAttribute('aria-busy', 'true');
  button.setAttribute('aria-disabled', 'true');
  const since = String(busy.since);
  button.dataset.since = since;
  const wait = busy.since + SLOW_MS - performance.now();
  if (wait <= 0) button.classList.add('slow');
  else {
    button.classList.remove('slow');
    // Still waiting on the same request by then (not a later one, or none).
    setTimeout(() => button.dataset.since === since && button.classList.add('slow'), wait);
  }
}

/** "✓ Equipped": something already done, said where its button would be, with nothing to press. */
export function doneMark(text: string): HTMLElement {
  const mark = document.createElement('span');
  mark.className = 'done-mark';
  const tick = document.createElement('span');
  tick.className = 'done-mark-tick';
  tick.setAttribute('aria-hidden', 'true');
  tick.textContent = '✓';
  mark.append(tick, text);
  return mark;
}
