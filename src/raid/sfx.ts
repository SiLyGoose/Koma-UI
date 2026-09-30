import { sound } from '../shared/sfx';

/*
 * The raid's sounds, from public/raid/sfx, played through the shared ../shared/sfx.ts (its volume,
 * and the frame's sound button): an action button hovered, an action picked (attack, guard, support),
 * a raider hovered in the heal picker, and a heal (the healer's, as they pick someone else; the one healed, as it lands).
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}raid/sfx/${file}.mp3`;

const SOUNDS = {
  attack: sound(SFX('hit_enemy')),
  guard: sound(SFX('guard_player')),
  support: sound(SFX('support_player')),
  heal: sound(SFX('heal_player')),
  hover: sound(SFX('select_player')),
  actionHover: sound(SFX('action_hover_player')),
};

export type Sound = keyof typeof SOUNDS;

export function play(sound: Sound): void {
  SOUNDS[sound]();
}
