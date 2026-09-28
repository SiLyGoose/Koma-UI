import { sound } from '../sfx';
import type { PinecraftOre } from './protocol';

/*
 * Pinecraft's sounds, from public/pinecraft/sfx, played through the shared ../sfx.ts (which also
 * wakes sound up on the first input and mutes it).
 */

/** Each sound and its takes (one is picked at random each time). */
const FILES = {
  footstep: ['footstep_01', 'footstep_02', 'footstep_03', 'footstep_04'],
  hitStone: ['hit_stone_01', 'hit_stone_02', 'hit_stone_03'],
  hitGem: ['hit_gem_01', 'hit_gem_02', 'hit_gem_03'],
  breakDirt: ['break_dirt_01'],
  breakStone: ['break_stone_01'],
  breakGem: ['break_gem_01'],
  collectGem: ['collect_gem_01'],
  cancel: ['button_cancel_01'],
} as const;

export type Sound = keyof typeof FILES;

/** What a block sounds like: dirt, stone (coal and iron too), or gem (the other ores). */
export type Material = 'dirt' | 'stone' | 'gem';

export function materialOf(ground: 'dirt' | 'stone' | 'grass', ore: PinecraftOre | null): Material {
  if (ore) return ore === 'coal' || ore === 'iron' ? 'stone' : 'gem';
  return ground === 'stone' ? 'stone' : 'dirt';
}

/** Each take ready to play, once loadSounds has run. */
const players = new Map<string, (volume?: number) => void>();
/** The take each sound played last, so the same one doesn't play twice running. */
const lastTake = new Map<Sound, number>();

/** Loads every sound. */
export function loadSounds(): void {
  for (const takes of Object.values(FILES)) for (const name of takes) players.set(name, sound(`${import.meta.env.BASE_URL}pinecraft/sfx/${name}.mp3`));
}

/** Plays one of a sound's takes, at a fifth of the master volume unless told otherwise. */
export function play(sound: Sound, volume = 0.2): void {
  const takes = FILES[sound];
  let k = Math.floor(Math.random() * takes.length);
  if (takes.length > 1 && k === lastTake.get(sound)) k = (k + 1) % takes.length;
  lastTake.set(sound, k);
  const name = takes[k];
  if (name !== undefined) players.get(name)?.(volume);
}
