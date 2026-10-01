import { sound } from '../sfx';

/*
 * The items' sounds (the gear page's armory and slots, the databank), from public/shared/sfx/items,
 * through the shared ../sfx.ts: an item hovered, an item clicked, and its details popping up after.
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}shared/sfx/items/${file}.mp3`;
const hover = sound(SFX('item_hover'));
const select = sound(SFX('item_select'));
const popup = sound(SFX('item_modal_popup'));
const popupClose = sound(SFX('item_modal_popup_close'));

/** How long after the click's sound the details' comes, so they play one after the other. */
const POPUP_AFTER_MS = 90;

/** The item the mouse is over (by id), so one drawn again under it (a click redraws the list) isn't hovered again. */
let over: string | null = null;

/**
 * Hovering over items, with the sound: `element` is an item's card or slot, `id` which item it is. The
 * sound plays as the mouse comes onto another item, not as the same one is drawn again under it.
 */
export function hoverSound(element: HTMLElement, id: string, active: () => boolean = () => true): void {
  element.addEventListener('pointerenter', () => {
    if (id === over || !active()) return;
    over = id;
    hover();
  });
  element.addEventListener('pointerleave', () => {
    if (over === id) over = null;
  });
}

/** An item clicked: its sound, then (`opened`: its details showing, or showing another item) theirs. */
export function itemPicked(opened: boolean): void {
  select();
  if (opened) setTimeout(popup, POPUP_AFTER_MS);
}
