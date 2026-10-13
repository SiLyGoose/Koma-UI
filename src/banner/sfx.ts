import { sound, track, type Stop } from '../shared/audio';

/*
 * The wish's sounds, through the shared ../shared/audio/sfx.ts. Its own (public/banner/sfx): the
 * star's fall, the first item out of the flash, and each thing shown after it. And
 * the items' (public/shared/sfx/items): the wish closing.
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}banner/sfx/${file}.mp3`;
/** Where the fall's sound starts in its file, in seconds: the recording has a click before it. */
const FALL_FROM = 0.3;
/** How long the fall's sound takes to fade when it's cut short (skipped, or the item is out), in seconds. */
const FALL_FADE = 0.6;
const fall = track(SFX('gacha_animation'), FALL_FROM);
const first = sound(SFX('gacha_item_show'));
const latter = sound(SFX('gacha_item_show_latter'));
const popupClose = sound(`${import.meta.env.BASE_URL}shared/sfx/items/item_modal_popup_close.mp3`);

/** The star's fall, from the star coming onto the screen. Gives back what fades it out (once: no harm asking again, or after it has ended). */
export const falling = (): (() => void) => {
  let stop: Stop | null = fall();
  return () => {
    stop?.(FALL_FADE);
    stop = null;
  };
};
/** Something shown (an item, or a multi pull's together), the first out of the flash or one after it: louder for a better one. */
export const revealed = (stars: number, isFirst: boolean): void => (isFirst ? first : latter)(0.6 + 0.1 * stars);
export const wishClosed = (): void => popupClose();
