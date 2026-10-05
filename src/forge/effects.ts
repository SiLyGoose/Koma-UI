import { el, rich } from '../shared/items/items';
import type { EffectRow } from './compare';

/** Puts effect rows in `into`: each line, and the numbers in it that change as old » new (or New, or Removed). */
export function fillEffects(into: HTMLElement, rows: readonly EffectRow[]): void {
  into.textContent = '';
  for (const row of rows) {
    const li = el('li', `forge-row ${row.state}`);
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
