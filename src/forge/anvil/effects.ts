import { el, rich } from '../../shared/items';
import { type EffectRow, pieces } from './compare';

/** An effect line this long (a unique weapon's or treasure's, an artifact's) is read whole: as it is, and under it as it will be. */
const LONG = 60;

/** A line with the numbers in it that change (by their places) marked in `tone`; null: one that can only be shown whole. */
function marked(line: string, changed: ReadonlySet<number>, tone: string): HTMLElement | null {
  const parts = pieces(line);
  if (!parts) return null;
  const text = el('span', 'forge-line');
  for (const { text: part, at } of parts) text.append(at !== null && changed.has(at) ? el('span', tone, part) : part);
  return text;
}

/**
 * Puts effect rows in `into`: each line, and the numbers in it that change as old » new (or New, or Removed). A long one
 * that changes: the line as it is, its changing numbers marked, and under it the line as it will be, theirs marked.
 */
export function fillEffects(into: HTMLElement, rows: readonly EffectRow[]): void {
  into.textContent = '';
  for (const row of rows) {
    const li = el('li', `forge-row ${row.state}`);
    if (row.state === 'changed' && row.next && row.line.length > LONG) {
      const changed = new Set(row.changes.map((change) => change.at));
      const was = marked(row.line, changed, 'forge-from');
      const next = marked(row.next, changed, 'forge-to');
      if (was && next) {
        li.classList.add('long');
        was.classList.add('forge-was');
        next.classList.add('forge-next');
        next.prepend(el('span', 'forge-arrow', '»'));
        li.append(was, next);
        into.append(li);
        continue;
      }
    }
    const text = el('span', 'forge-line');
    text.append(rich(row.line));
    li.append(text);
    if (row.state === 'changed') {
      const change = el('span', 'forge-change');
      for (const { from, to } of row.changes) {
        const pair = el('span', 'forge-pair');
        pair.append(el('span', 'forge-from', from), el('span', 'forge-arrow', '»'), el('span', 'forge-to', to));
        change.append(pair);
      }
      li.append(change);
    } else if (row.state === 'new') li.append(el('span', 'forge-change forge-to', 'New'));
    else if (row.state === 'gone') li.append(el('span', 'forge-change forge-from', 'Removed'));
    into.append(li);
  }
  if (rows.length === 0) into.append(el('li', 'forge-row muted', 'No effects.'));
}
