import { el, rich } from '../../shared/items';
import { type EffectRow, NUMBER } from './compare';

/** An effect line this long (a unique weapon's or treasure's, an artifact's) is read whole: as it is, and under it as it will be. */
const LONG = 60;

/**
 * A line in Discord's way (its emphasis, emoji…) with the numbers in it that change (by their places) marked in `tone`: its
 * words' numbers counted in order, as compare() counts them (an emoji's id is a picture here, not words).
 */
function marked(line: string, changed: ReadonlySet<number>, tone: string): HTMLElement {
  const text = el('span', 'forge-line');
  text.append(rich(line));
  const words = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (words.nextNode()) nodes.push(words.currentNode as Text);
  let at = 0;
  for (const node of nodes) {
    const value = node.data;
    const parts: (string | HTMLElement)[] = [];
    let last = 0;
    for (const found of value.matchAll(NUMBER)) {
      if (!changed.has(at++)) continue;
      parts.push(value.slice(last, found.index), el('span', tone, found[0]));
      last = found.index + found[0].length;
    }
    if (last > 0) node.replaceWith(...parts, value.slice(last));
  }
  return text;
}

/**
 * Puts effect rows in `into`: each line, and the number in it that changes as old » new (or New, or Removed). One that
 * changes more than one number, or a long one: the whole line as it is, its changing numbers marked, and under it the
 * whole line as it will be, theirs marked.
 */
export function fillEffects(into: HTMLElement, rows: readonly EffectRow[]): void {
  into.textContent = '';
  for (const row of rows) {
    const li = el('li', `forge-row ${row.state}`);
    if (row.state === 'changed' && row.next && (row.changes.length > 1 || row.line.length > LONG)) {
      const changed = new Set(row.changes.map((change) => change.at));
      const was = marked(row.line, changed, 'forge-from');
      const next = marked(row.next, changed, 'forge-to');
      li.classList.add('long');
      was.classList.add('forge-was');
      next.classList.add('forge-next');
      next.prepend(el('span', 'forge-arrow', '»'));
      li.append(was, next);
      into.append(li);
      continue;
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
