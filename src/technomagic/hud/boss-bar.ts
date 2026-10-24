import { artPicture } from '../art';
import type { Mark } from '../sim/shown';
import { setSweep, sweepLayer, sweepTimes } from './buff';
import { el } from './dom';
import { pointTips } from './tip';

/*
 * The boss's health across the top of the field, a dragon's CC gauge in orange just under it, and under them what is the
 * matter with it (its marks: ../sim/shown.ts), as King's Raid shows them: a square of each one's icon, its sweep over it while
 * it runs out (./buff.ts) or how many are stacked up in its corner, what it is when pointed at; said in words where it has no picture.
 */

export interface BossBar {
  /** Its health (0 to 1 of it), the marks under it, and how full its CC gauge is (0 to 1; null: it has none). */
  draw(share: number, marks: readonly Mark[], gauge: number | null): void;
}

/** What each square drawn is of, for its popup (the latest it was drawn as). */
const OF = new WeakMap<Element, Mark>();

/** A mark, whatever its seconds and stacks are now: its tone and its words, their numbers left out. */
const markKey = (mark: Mark): string => `${mark.tone}:${mark.text.replace(/\d[\d.,]*/g, '#')}`;

/** A mark: its square (its picture edged in its tone, its sweep over it or its stacks in the corner), or its words. */
function markOf(mark: Mark): HTMLElement {
  const picture = artPicture(mark.art);
  if (!picture) return el('span', `tm-mark ${mark.tone}`, mark.text);
  const made = el('span', `tm-mark-square ${mark.tone}`);
  OF.set(made, mark);
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', mark.text);
  const image = el('img', '');
  image.alt = '';
  image.draggable = false;
  image.src = picture;
  made.append(image);
  if (mark.count) made.append(el('b', '', mark.count));
  else if (mark.left !== undefined) made.append(sweepLayer());
  return made;
}

/** What a square's popup says: all its words. */
function markTip(made: Element): Node[] | null {
  const mark = OF.get(made);
  if (!mark) return null;
  const head = el('div', 'tm-tip-head');
  head.append(el('strong', '', mark.text));
  return [head];
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
  // A square pointed at with a mouse: what it is, over it.
  const pointed = pointTips(row, '.tm-mark-square', markTip);
  let marked = '';
  let squares: HTMLElement[] = [];
  const times = sweepTimes();
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
      // (Drawn again only when which marks there are, or their stacks, change; their sweeps turned each time.)
      const said = marks.map((mark) => `${markKey(mark)}:${mark.count ?? ''}`).join('|');
      if (said !== marked) {
        marked = said;
        squares = marks.map(markOf);
        row.replaceChildren(...squares);
        pointed();
      }
      marks.forEach((mark, i) => {
        const made = squares[i];
        if (!made) return;
        if (OF.has(made)) OF.set(made, mark);
        if (!mark.count && mark.left !== undefined) setSweep(made, times(markKey(mark), mark.left));
      });
    },
  };
}
