import { notes, sound } from '../shared/audio';

/*
 * Poker's sounds, through the shared ../shared/audio/sfx.ts: a card dealt (baccarat's, from
 * public/baccarat/sfx), chips going in (the table games', from public/shared/sfx/table), a tick when
 * it's this player's turn, and a chime when they win a pot.
 */

const card = sound(`${import.meta.env.BASE_URL}baccarat/sfx/place-card.mp3`);
const chips = sound(`${import.meta.env.BASE_URL}shared/sfx/table/place-poker-chip.mp3`);

export type Sound = 'card' | 'chips' | 'turn' | 'win';

export function play(which: Sound): void {
  if (which === 'card') return card(0.3);
  if (which === 'chips') return chips(0.3);
  if (which === 'turn') return notes([880, 1175], { type: 'triangle', volume: 0.12, length: 0.08, spacing: 0.08 });
  notes([660, 880, 1320], { type: 'sine', volume: 0.12, length: 0.18, spacing: 0.09 });
}
