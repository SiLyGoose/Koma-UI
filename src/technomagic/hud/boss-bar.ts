import type { Mark } from '../sim/shown';
import { el } from './dom';

/* The boss's health across the top of the field, and under it what is the matter with it (its marks: ../sim/shown.ts). */

export interface BossBar {
  /** Its health (0 to 1 of it), and the marks under it. */
  draw(share: number, marks: readonly Mark[]): void;
}

/** `root` holds the bar (its fill an <i>, its words a <b>) and the marks' row. `name` is the boss's, and `deals` the kind of damage its blows are. */
export function makeBossBar(root: HTMLElement, name: string, deals: string): BossBar {
  const fill = root.querySelector('.tm-boss-bar i') as HTMLElement;
  const words = root.querySelector('.tm-boss-bar b') as HTMLElement;
  const row = root.querySelector('.tm-marks') as HTMLElement;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', `${name}: its blows are ${deals}`);
  let marked = '';
  return {
    draw(share, marks) {
      root.hidden = false;
      fill.style.transform = `scaleX(${Math.max(0, share)})`;
      const percent = `${Math.ceil(share * 100)}%`;
      if (words.textContent !== percent) words.textContent = percent;
      const said = marks.map(({ text }) => text).join('|');
      if (said === marked) return;
      marked = said;
      row.replaceChildren(...marks.map(({ text, tone }) => el('span', `tm-mark ${tone}`, text)));
    },
  };
}
