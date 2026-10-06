import { sound } from '../shared/audio';

/*
 * The wish's sounds, from the items' (public/shared/sfx/items), through the shared ../shared/audio/sfx.ts:
 * each item as it's shown, and the wish closing.
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}shared/sfx/items/${file}.mp3`;
const popup = sound(SFX('item_modal_popup'));
const popupClose = sound(SFX('item_modal_popup_close'));

/** An item shown: louder for a better one. */
export const revealed = (stars: number): void => popup(0.35 + 0.15 * stars);
export const wishClosed = (): void => popupClose();
