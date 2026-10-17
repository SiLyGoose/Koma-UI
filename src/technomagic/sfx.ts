import { setClickSound, sound } from '../shared/audio';

/*
 * The TechnoMagic Raid's sounds (and the Dragon Raid's, the same page), from public/technomagic/sfx: King's Raid's
 * own, out of its APK. Played through the shared ../shared/audio/sfx.ts (its volume, and the frame's sound button):
 * Start Battle pressed (Ready_04), and a click on anything else pressable on the page (UI_Button_02, in place of the
 * site's generic_select; things with a sound of their own, such as items, keep it).
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}technomagic/sfx/${file}.mp3`;

/** Each sound, and how loud it plays (a share of the shared volume). */
const SOUNDS = {
  start: { play: sound(SFX('ready_04')), volume: 0.3 },
};

export type Sound = keyof typeof SOUNDS;

export function play(sound: Sound): void {
  SOUNDS[sound].play(SOUNDS[sound].volume);
}

/** Every click on the page plays King's Raid's button sound, at half volume. */
export function installSounds(): void {
  setClickSound(SFX('ui_button_02'), 0.2);
}
