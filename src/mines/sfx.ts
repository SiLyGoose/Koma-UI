import { sound } from '../sfx';

/*
 * Mines' sounds, from public/mines/sfx, played through the shared ../sfx.ts: a tile turned over,
 * a gem or a mine. Each plays over the last if they come fast.
 */

const SOUNDS = {
  gem: sound(`${import.meta.env.BASE_URL}mines/sfx/gem-select.mp3`),
  boom: sound(`${import.meta.env.BASE_URL}mines/sfx/mine-select.mp3`),
};

export type Sound = keyof typeof SOUNDS;

export function play(sound: Sound): void {
  SOUNDS[sound]();
}
