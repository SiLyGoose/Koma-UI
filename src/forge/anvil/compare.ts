
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

/** One row under the anvil: an effect as it is now, and the numbers in it that change (each with its place among them), as it will be (or it's new, or it goes). */
export interface EffectRow {
  line: string;
  changes: { from: string; to: string; at: number }[];
  next?: string;
  state: 'same' | 'changed' | 'new' | 'gone';
}

/**
 * A line as its words and its numbers, each number with its place among them (to mark those that change); null: one with
 * markup (emoji, bold…), which is only shown whole.
 */
export function pieces(line: string): { text: string; at: number | null }[] | null {
  if (plain(line) !== line) return null;
  const out: { text: string; at: number | null }[] = [];
  let last = 0;
  let at = 0;
  for (const found of line.matchAll(NUMBER)) {
    if (found.index > last) out.push({ text: line.slice(last, found.index), at: null });
    out.push({ text: found[0], at: at++ });
    last = found.index + found[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), at: null });
  return out;
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
    const changes = from.flatMap((n, i) => (n === to[i] ? [] : [{ from: n, to: to[i] ?? '', at: i }]));
    rows.push({ line: old, changes, next: line, state: changes.length ? 'changed' : 'same' });
  }
  for (const line of unused) rows.push({ line, changes: [], state: 'gone' });
  return rows;
}
