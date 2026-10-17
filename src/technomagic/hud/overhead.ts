import type { Buff } from '../sim/shown';
import { square } from './buff';
import { el } from './dom';

/**
 * A hero's health over its head, while it is on the field: a row of small squares for what it has on
 * it, under them a bar, its fill an <i>; and under that, while the hero has a shield, a thin yellow
 * line on a dark track as wide as the bar, shorter as the shield wears away.
 */
export interface Overhead {
  /** Where on the field's picture its foot's middle goes (CSS pixels from its top left), how much health (0 to 1), the shield on it, and what it has on it. */
  draw(x: number, y: number, share: number, shield: number, buffs: readonly Buff[]): void;
  /** Off the field: not shown. */
  hide(): void;
}

/** A hero's health bar, put in `parent`: blue for an `ally`'s (another player's hero, in a room). */
export function makeOverhead(parent: HTMLElement, ally = false): Overhead {
  const root = el('div', 'tm-overhead-at');
  const buffs = el('div', 'tm-buffs');
  const bar = el('div', ally ? 'tm-overhead ally' : 'tm-overhead');
  const fill = el('i', '');
  bar.append(fill);
  const track = el('div', 'tm-shield');
  const line = el('i', '');
  track.append(line);
  track.hidden = true;
  root.hidden = true;
  root.append(buffs, bar, track);
  parent.append(root);
  /** The most shield on it since it last had none: the line's whole length. */
  let most = 0;
  /** The squares shown, as last drawn: drawn again only when they change. */
  let shown = '';
  return {
    draw(x, y, share, shield, on) {
      root.hidden = false;
      root.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      fill.style.transform = `scaleX(${Math.max(0, share)})`;
      most = shield > 0 ? Math.max(most, shield) : 0;
      track.hidden = most <= 0;
      if (most > 0) line.style.width = `${(shield / most) * 100}%`;
      const showing = on.map((buff) => `${buff.name}:${Math.ceil(buff.left ?? 0)}:${buff.count ?? ''}`).join('|');
      if (showing !== shown) {
        shown = showing;
        buffs.replaceChildren(...on.map(square));
      }
    },
    hide() {
      root.hidden = true;
    },
  };
}
