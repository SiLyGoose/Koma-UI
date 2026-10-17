import type { Mark } from '../sim/shown';
import { el } from './dom';

/*
 * The boss's health across the top of the field, a dragon's CC gauge in orange just under it, and under them what is the
 * matter with it (its marks: ../sim/shown.ts).
 */

export interface BossBar {
  /** Its health (0 to 1 of it), the marks under it, and how full its CC gauge is (0 to 1; null: it has none). */
  draw(share: number, marks: readonly Mark[], gauge: number | null): void;
}

/**
 * `root` holds the bar (its fill an <i>, its words a <b>), the gauge's (its fill an <i>) and the marks' row. `name` is the
 * boss's, and `deals` the kind of damage its blows are.
 */
export function makeBossBar(root: HTMLElement, name: string, deals: string): BossBar {
  const fill = root.querySelector('.tm-boss-bar i') as HTMLElement;
  const words = root.querySelector('.tm-boss-bar b') as HTMLElement;
  const meter = root.querySelector('.tm-boss-gauge') as HTMLElement;
  const gaugeFill = meter.querySelector('i') as HTMLElement;
  const row = root.querySelector('.tm-marks') as HTMLElement;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', `${name}: its blows are ${deals}`);
  meter.setAttribute('role', 'meter');
  meter.setAttribute('aria-label', 'CC Gauge');
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  let marked = '';
  return {
    draw(share, marks, gauge) {
      root.hidden = false;
      fill.style.transform = `scaleX(${Math.max(0, share)})`;
      const percent = `${Math.ceil(share * 100)}%`;
      if (words.textContent !== percent) words.textContent = percent;
      meter.hidden = gauge === null;
      if (gauge !== null) {
        gaugeFill.style.transform = `scaleX(${Math.max(0, gauge)})`;
        const full = String(Math.ceil(gauge * 100));
        if (meter.getAttribute('aria-valuenow') !== full) meter.setAttribute('aria-valuenow', full);
      }
      const said = marks.map(({ text }) => text).join('|');
      if (said === marked) return;
      marked = said;
      row.replaceChildren(...marks.map(({ text, tone }) => el('span', `tm-mark ${tone}`, text)));
    },
  };
}
