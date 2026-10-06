import { sound } from '../shared/audio';

/*
 * The raid's sounds, from public/raid/sfx, played through the shared ../shared/audio/sfx.ts (its volume,
 * and the frame's sound button): an action button hovered, an action picked (attack, guard, support,
 * again as it lands when the round resolves), a raider hovered in the heal picker, and a heal (the healer's, as they pick someone else; the one healed, as it lands).
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}raid/sfx/${file}.mp3`;

export type Sound = 'attack' | 'guard' | 'support' | 'heal' | 'hover' | 'actionHover';

/** Each sound, and how loud it plays (a share of the shared volume; 1 when not given). */
const SOUNDS: Record<Sound, [(volume?: number) => void, number?]> = {
  attack: [sound(SFX('hit_enemy')), 0.7],
  guard: [sound(SFX('guard_player'))],
  support: [sound(SFX('support_player'))],
  heal: [sound(SFX('heal_player'))],
  hover: [sound(SFX('select_player')), 0.6],
  actionHover: [sound(SFX('action_hover_player'))],
};

export function play(sound: Sound): void {
  const [playIt, volume] = SOUNDS[sound];
  playIt(volume);
}
