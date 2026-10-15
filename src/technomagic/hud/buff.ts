import { skillText } from '../../shared/heroes';
import { el } from './dom';

/** Something a hero has on it, shown as a small square over its health: a passive it always has, or what a skill has given it for a while. */
export interface Buff {
  name: string;
  /** What it does, for whoever points at it. */
  about?: string;
  icon: string;
  image?: string;
  /** Seconds it has left (a passive has none). */
  left?: number;
  /** How many of it are stacked up: shown in place of the seconds it has left. */
  count?: number;
  /** Something the boss has left on it, not something good: its square is edged in red. */
  harmful?: boolean;
}

/** What each square drawn is of, for its popup. */
const OF = new WeakMap<Element, Buff>();

/** A buff's square. */
export function square(buff: Buff): HTMLElement {
  const made = el('span', buff.harmful ? 'tm-buff harmful' : 'tm-buff');
  OF.set(made, buff);
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', buff.about ? `${buff.name}: ${buff.about}` : buff.name);
  made.textContent = buff.icon;
  // The number in its corner: how many are stacked, or else the seconds it has left.
  const number = buff.count ?? (buff.left === undefined ? undefined : Math.ceil(buff.left));
  if (buff.image) {
    const picture = el('img', '');
    picture.alt = '';
    picture.draggable = false;
    // Not there: its icon stays.
    picture.addEventListener('load', () => made.replaceChildren(picture, ...(number === undefined ? [] : [el('b', '', String(number))])));
    picture.src = buff.image;
    if (picture.complete && picture.naturalWidth > 0) made.replaceChildren(picture);
  }
  if (number !== undefined) made.append(el('b', '', String(number)));
  return made;
}

/** What a square's popup says (../hud/tip.ts): its picture (or its icon) and its name, how long it has left or how many are stacked, and what it does. */
export function buffTip(made: Element): Node[] | null {
  const buff = OF.get(made);
  if (!buff) return null;
  const head = el('div', buff.harmful ? 'tm-tip-head harmful' : 'tm-tip-head');
  const picture = el('span', 'tm-tip-mini', buff.icon);
  if (buff.image) {
    const art = el('img', '');
    art.alt = '';
    art.draggable = false;
    art.addEventListener('load', () => picture.replaceChildren(art));
    art.src = buff.image;
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
