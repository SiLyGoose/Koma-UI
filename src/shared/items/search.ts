/*
 * Searching items (the gear page's armory, the databank): every word typed must be in the item somewhere, or, in
 * its name or id, be off by only a typo or two. Descriptions match only as typed, since there a typo's leeway
 * would turn up whole lists of near-miss words.
 */

/** What an item is searched by. */
export interface Searchable {
  name: string;
  id: string;
  description: string;
}

/** Whether every word of a search (already trimmed and lowercased; empty matches all) is in `item`, give or take a typo in its name or id. */
export function matchesSearch(query: string, item: Searchable): boolean {
  if (query === '') return true;
  const text = `${item.name} ${item.id} ${item.description}`.toLowerCase();
  const named = words(`${item.name} ${item.id}`);
  return query.split(/\s+/).every((typed) => {
    if (text.includes(typed)) return true;
    const max = typosAllowed(typed.length);
    return max > 0 && named.some((word) => typos(typed, word, max) <= max);
  });
}

/** How many typos a word searched for may have: none under 4 letters (one would match almost anything), one up to 6, then two. */
const typosAllowed = (length: number): number => (length < 4 ? 0 : length < 7 ? 1 : 2);

/** A name's words, lowercased ("Fire_Sword of Dawn" → fire, sword, of, dawn). */
const words = (text: string): string[] => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * How many typos turn `typed` into the start of `word` (so a word still being typed matches too): Levenshtein's
 * distance, a letter added, dropped or changed, with two letters swapped counted as one typo rather than two.
 * Anything over `max` comes back as `max + 1`, as soon as it's sure to be (no row of the table gets smaller).
 */
function typos(typed: string, word: string, max: number): number {
  // Row i: the typos between typed's first i letters and each start of word (word's first j letters, at j).
  let twoBack: number[] = [];
  let back = Array.from({ length: word.length + 1 }, (_, j) => j);
  for (let i = 1; i <= typed.length; i++) {
    const row = [i];
    for (let j = 1; j <= word.length; j++) {
      const changed = typed[i - 1] === word[j - 1] ? 0 : 1;
      let best = Math.min(at(back, j) + 1, at(row, j - 1) + 1, at(back, j - 1) + changed);
      const swapped = i > 1 && j > 1 && typed[i - 1] === word[j - 2] && typed[i - 2] === word[j - 1];
      if (swapped) best = Math.min(best, at(twoBack, j - 2) + 1);
      row.push(best);
    }
    if (Math.min(...row) > max) return max + 1;
    twoBack = back;
    back = row;
  }
  return Math.min(...back);
}

/** A table cell (always there: each row is as long as the word). */
const at = (row: number[], j: number): number => row[j] ?? Infinity;
