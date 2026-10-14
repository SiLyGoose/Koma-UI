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

/** A buff's square. */
export function square(buff: Buff): HTMLElement {
  const made = el('span', buff.harmful ? 'tm-buff harmful' : 'tm-buff');
  made.title = buff.about ? `${buff.name}: ${buff.about}` : buff.name;
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', made.title);
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
