import { notes } from '../shared/audio';

/*
 * The duck race's own sounds, made here (the chips' and a round's win or loss are the table's,
 * ../table/sfx.ts): a starter's three beeps, low low high, as the ducks go, and a whistle at the finish.
 */

export function play(sound: 'start' | 'finish'): void {
  if (sound === 'start') return notes([440, 440, 880], { type: 'square', volume: 0.06, length: 0.12, spacing: 0.25 });
  notes([1568, 2093], { type: 'triangle', volume: 0.09, length: 0.12, spacing: 0.08 });
}
