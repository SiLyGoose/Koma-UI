import { sound } from '../shared/audio';

/*
 * Minesweeper's sounds, played through the shared ../shared/audio/sfx.ts: a board lost to a mine, and
 * one cleared. They're Mines' (public/mines/sfx): a mine and a gem turned over. Opening a tile has
 * the plain click every button has.
 */

const SOUNDS = {
  boom: sound(`${import.meta.env.BASE_URL}mines/sfx/mine-select.mp3`),
  win: sound(`${import.meta.env.BASE_URL}mines/sfx/gem-select.mp3`),
};

export type Sound = keyof typeof SOUNDS;

export function play(sound: Sound): void {
  SOUNDS[sound]();
}
