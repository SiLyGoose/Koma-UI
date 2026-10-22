import './popup.css';
import { el } from '../hud/dom';

/*
 * Manage, in a room: the heroes page over the raid (./manage.ts, in a frame of its own), so the player gears their
 * heroes without leaving the room (going to the site's heroes page would take them out of it). Its ✕, the dark
 * around it, or Escape (here or in the frame) close it; so does the fight beginning. Closed, `closed` is called (the
 * prep screen then has the bot read their heroes again: one may have been transcended meanwhile).
 */

/**
 * How big the frame is laid out, at least: the heroes page's computer layout (roster, hero, armory side by side)
 * needs about this much. Smaller popups (a phone on its side) show it scaled down.
 */
const LAYOUT_WIDTH = 1100;
const LAYOUT_HEIGHT = 640;

export interface ManagePopup {
  open(): void;
  close(): void;
}

/** The popup, put in `into`, for the room the link (`token`: its token as it is now, renewed as it goes; with the bot's socket `address`) plays in. */
export function managePopup(into: HTMLElement, token: () => string, address: string, closed: () => void): ManagePopup {
  const root = el('div', 'tm-manage');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Heroes');
  const box = el('div', 'tm-manage-box');
  const fit = el('div', 'tm-manage-fit');
  const frame = el('iframe', 'tm-manage-frame');
  frame.title = 'Heroes';
  fit.append(frame);
  const closer = el('button', 'tm-manage-close', '✕');
  closer.type = 'button';
  closer.setAttribute('aria-label', 'Close');
  box.append(fit, closer);
  root.append(box);
  into.append(root);

  /** Lays the frame out at least LAYOUT_WIDTH by LAYOUT_HEIGHT, scaled to the popup's size. */
  function layOut(): void {
    if (root.hidden) return;
    const width = fit.clientWidth;
    const height = fit.clientHeight;
    if (width === 0 || height === 0) return;
    const scale = Math.min(1, width / LAYOUT_WIDTH, height / LAYOUT_HEIGHT);
    frame.style.width = `${width / scale}px`;
    frame.style.height = `${height / scale}px`;
    frame.style.transform = scale < 1 ? `scale(${scale})` : '';
  }

  function close(): void {
    if (root.hidden) return;
    root.hidden = true;
    frame.src = 'about:blank';
    closed();
  }

  closer.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  // Escape inside the frame, with nothing open there (./manage.ts).
  window.addEventListener('message', (event) => {
    if (event.origin === location.origin && (event.data as { t?: string } | null)?.t === 'close-heroes') close();
  });
  window.addEventListener('resize', layOut);

  return {
    open() {
      const hash = new URLSearchParams({ t: token(), s: address });
      frame.src = `${import.meta.env.BASE_URL}games/technomagic/heroes/#${hash}`;
      root.hidden = false;
      layOut();
      closer.focus();
    },
    close,
  };
}
