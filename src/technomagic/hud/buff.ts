import { skillText } from '../../shared/heroes';
import { artPicture } from '../art';
import type { Buff } from '../sim/shown';
import { el } from './dom';

/*
 * A Buff (../sim/shown.ts) as a small square over a hero's health: one stacked up has how many in its corner; one that runs
 * out has its sweep over it (King's Raid's cooldown wipe): from its middle a line goes round clockwise from the top as its time
 * runs, the part it has passed darkened.
 */

/** What each square drawn is of, for its popup (the latest it was drawn as). */
const OF = new WeakMap<Element, Buff>();

/** A square's sweep, over its picture (its --done the share of its time run: card.css .tm-sweep). */
export const sweepLayer = (): HTMLElement => el('i', 'tm-sweep');

/** Turns a square's sweep to `done` (0 to 1) of its time run. */
export function setSweep(made: Element, done: number): void {
  const layer = made.querySelector<HTMLElement>('.tm-sweep');
  const turn = `${(Math.min(1, Math.max(0, done)) * 360).toFixed(1)}deg`;
  if (layer && layer.style.getPropertyValue('--done') !== turn) layer.style.setProperty('--done', turn);
}

/**
 * How much of their time the timed squares have run (0 to 1), each by its key. Their whole time isn't said, so it's the most
 * one had left since it came on, or since it was put on again (more left than it had).
 */
export function sweepTimes(): (key: string, left: number) => number {
  const seen = new Map<string, { full: number; last: number }>();
  return (key, left) => {
    const had = seen.get(key);
    const full = !had || left > had.last + 0.05 ? Math.max(left, 0.001) : had.full;
    seen.set(key, { full, last: left });
    return 1 - left / full;
  };
}

/** A buff's square. */
export function square(buff: Buff): HTMLElement {
  const made = el('span', buff.harmful ? 'tm-buff harmful' : 'tm-buff');
  OF.set(made, buff);
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', buff.about ? `${buff.name}: ${buff.about}` : buff.name);
  const glyph = document.createTextNode(buff.icon);
  made.append(glyph);
  const image = artPicture(buff.art);
  if (image) {
    const picture = el('img', '');
    picture.alt = '';
    picture.draggable = false;
    // Not there: its icon stays.
    picture.addEventListener('load', () => glyph.isConnected && glyph.replaceWith(picture));
    picture.src = image;
    if (picture.complete && picture.naturalWidth > 0) glyph.replaceWith(picture);
  }
  // How many are stacked up in its corner; else, one that runs out, its sweep.
  if (buff.count !== undefined) made.append(el('b', '', String(buff.count)));
  else if (buff.left !== undefined) made.append(sweepLayer());
  return made;
}

/**
 * A row of buffs' squares in `box`: drawn again only when which are on (or how many are stacked) changes (`after`: then),
 * and each time every timed one's sweep turned, and what its popup says brought up to date.
 */
export function buffRow(box: HTMLElement, after?: () => void): (effects: readonly Buff[]) => void {
  let shown = '';
  let squares: HTMLElement[] = [];
  const times = sweepTimes();
  return (effects) => {
    const showing = effects.map((buff) => `${buff.name}:${buff.count ?? ''}:${buff.left === undefined ? '' : 'timed'}`).join('|');
    if (showing !== shown) {
      shown = showing;
      squares = effects.map(square);
      box.replaceChildren(...squares);
      after?.();
    }
    effects.forEach((buff, i) => {
      const made = squares[i];
      if (!made) return;
      OF.set(made, buff);
      if (buff.count === undefined && buff.left !== undefined) setSweep(made, times(buff.name, buff.left));
    });
  };
}

/** What a square's popup says (../hud/tip.ts): its picture (or its icon) and its name, how long it has left or how many are stacked, and what it does. */
export function buffTip(made: Element): Node[] | null {
  const buff = OF.get(made);
  if (!buff) return null;
  const head = el('div', buff.harmful ? 'tm-tip-head harmful' : 'tm-tip-head');
  const picture = el('span', 'tm-tip-mini', buff.icon);
  const image = artPicture(buff.art);
  if (image) {
    const art = el('img', '');
    art.alt = '';
    art.draggable = false;
    art.addEventListener('load', () => picture.replaceChildren(art));
    art.src = image;
    if (art.complete && art.naturalWidth > 0) picture.replaceChildren(art);
  }
  head.append(picture, el('strong', '', buff.name));
  const left = buff.count !== undefined ? `×${buff.count}` : buff.left !== undefined ? `${Math.ceil(buff.left)}s left` : '';
  if (left) head.append(el('small', '', left));
  return buff.about ? [head, about(buff.about)] : [head];
}

/** What a popup says something does, its numbers and effects marked as the heroes page's Skills tab marks them. */
export function about(text: string): HTMLElement {
  const made = el('p', 'tm-tip-about');
  made.append(...skillText(text));
  return made;
}
