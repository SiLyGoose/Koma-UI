import type { PinecraftOre } from './protocol';

/*
 * Pinecraft's sounds, from public/pinecraft/sfx. Played through Web Audio so they start at once
 * and can overlap (footsteps, hits). A browser keeps sound off until the player first touches or
 * presses something, so the first input wakes it. The frame's sound button mutes it (setMuted).
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

let muted = false;

const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
const audio = Ctx ? new Ctx() : null;
const buffers = new Map<string, AudioBuffer>();
/** The take each sound played last, so the same one doesn't play twice running. */
const lastTake = new Map<Sound, number>();

async function loadOne(name: string): Promise<void> {
  if (!audio) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}pinecraft/sfx/${name}.mp3`);
    if (!res.ok) return;
    buffers.set(name, await audio.decodeAudioData(await res.arrayBuffer()));
  } catch {
    // A sound that won't load just doesn't play.
  }
}

/** Loads every sound, and wakes sound up on the first touch or key. */
export function loadSounds(): void {
  if (!audio) return;
  for (const takes of Object.values(FILES)) for (const name of takes) void loadOne(name);
  const wake = (): void => {
    void audio.resume().then(() => {
      if (audio.state === 'running') for (const type of ['pointerdown', 'keydown'] as const) window.removeEventListener(type, wake, true);
    });
  };
  for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, wake, true);
}

export function play(sound: Sound, volume = 0.2): void {
  if (!audio || muted || audio.state !== 'running') return;
  const takes = FILES[sound];
  let k = Math.floor(Math.random() * takes.length);
  if (takes.length > 1 && k === lastTake.get(sound)) k = (k + 1) % takes.length;
  lastTake.set(sound, k);
  const name = takes[k];
  const buffer = name === undefined ? undefined : buffers.get(name);
  if (!buffer) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(audio.destination);
  source.start();
}

export function setMuted(on: boolean): void {
  muted = on;
}
