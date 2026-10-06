import { DORMANT } from '../../shared/items';

/*
 * Now against after: an effect's lines before and after a refine or forge, paired up so each number
 * that changes can be shown as old » new.
 */

/** A number in an effect line, with its sign and % if it has them: "+12%", "3", "1,500", "-0.5%". */
const NUMBER = /[+-]?\d[\d,]*(?:\.\d+)?%?/g;
/** An effect line's words without its emoji (whose ids are numbers too) or Discord's markup. */
const plain = (line: string): string => line.replace(/<a?:\w+:\d+>/g, '').replace(/[*`]/g, '');
/** A line with its numbers blanked: two lines with the same shape are the same effect at different strengths. */
const shape = (line: string): string => plain(line).replace(NUMBER, '#');
const numbers = (line: string): string[] => plain(line).match(NUMBER) ?? [];

/** One row under the anvil: an effect as it is now, and the numbers in it that change (or it's new, or it goes). */
export interface EffectRow {
  line: string;
  changes: { from: string; to: string }[];
  state: 'same' | 'changed' | 'new' | 'gone';
}

/**
 * Pairs each line of `after` with the line of `before` for the same effect (same shape), to show each
 * number that changes; a line with no partner is new (or, from `before`, gone).
 */
export function compare(before: readonly string[], after: readonly string[]): EffectRow[] {
  const unused = [...before];
  const rows: EffectRow[] = [];
  for (const line of after) {
    const at = unused.findIndex((old) => shape(old) === shape(line));
    if (at < 0) {
      rows.push({ line, changes: [], state: 'new' });
      continue;
    }
    const [old] = unused.splice(at, 1) as [string];
    const from = numbers(old);
    const to = numbers(line);
    const changes = from.flatMap((n, i) => (n === to[i] ? [] : [{ from: n, to: to[i] ?? '' }]));
    rows.push({ line: old, changes, state: changes.length ? 'changed' : 'same' });
  }
  for (const line of unused) rows.push({ line, changes: [], state: 'gone' });
  return rows;
}

/** Effect lines without the one for a masterwork bonus still waiting to be forged. */
export const withoutDormant = (lines: readonly string[]): string[] => lines.filter((line) => !line.startsWith(DORMANT));
