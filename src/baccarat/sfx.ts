import { sound } from '../shared/sfx';

/*
 * Baccarat's own sound, from public/baccarat/sfx, played through the shared ../shared/sfx.ts: a card
 * placed as a round is dealt out. The chip sounds are the table's (../table/sfx.ts).
 */

const SOUNDS = {
  card: sound(`${import.meta.env.BASE_URL}baccarat/sfx/place-card.mp3`),
};

export type Sound = keyof typeof SOUNDS;

export function play(sound: Sound): void {
  SOUNDS[sound](0.3);
}
