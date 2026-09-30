import { notes, sound } from '../shared/sfx';

/*
 * The table's sounds, for every table game (baccarat, roulette), played through the shared
 * ../shared/sfx.ts: a chip put on a spot, and chips slid off a spot (taken back or cleared) or picked from
 * the rack (public/shared/sfx), and, made here, a click for an even round, a chime for a win and a
 * low pair of notes for a loss. A game's own sounds (like a card placed) are in its own sfx.ts.
 */

const placeSound = sound(`${import.meta.env.BASE_URL}shared/sfx/table/place-poker-chip.mp3`);
const moveSound = sound(`${import.meta.env.BASE_URL}shared/sfx/table/move-poker-chip.mp3`);

export type Sound = 'place' | 'move' | 'even' | 'win' | 'lose';

export function play(sound: Sound): void {
  if (sound === 'place') return placeSound();
  if (sound === 'move') return moveSound();
  if (sound === 'even') return notes([2600], { type: 'triangle', volume: 0.18, length: 0.05 });
  notes(sound === 'win' ? [660, 880, 1320] : [300, 220], { type: 'sine', volume: 0.12, length: 0.18, spacing: 0.09 });
}
