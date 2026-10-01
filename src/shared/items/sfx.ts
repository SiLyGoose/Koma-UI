import { sound } from '../sfx';

/*
 * The items' sounds (the gear page's armory and slots, the databank), from public/shared/sfx/items,
 * through the shared ../sfx.ts: an item hovered, an item clicked, its details popping up after, and
 * closing.
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}shared/sfx/items/${file}.mp3`;
const hover = sound(SFX('item_hover'));
const select = sound(SFX('item_select'));
const popup = sound(SFX('item_modal_popup'));
const popupClose = sound(SFX('item_modal_popup_close'));

/** How long after the click's sound the details' comes, so they play one after the other. */
const POPUP_AFTER_MS = 90;

/** An item's details closed (the ✕, Escape, or the item clicked again). */
export function itemDetailsClosed(): void {
  popupClose();
}

/** A popup closed (the raid's gear and More stats): the same sound as an item's details closing. */
export const popupClosed = itemDetailsClosed;

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

/**
 * An item clicked: its sound, then the details' as they change: showing it (`shown`, the item whose
 * details show now, where `before` showed none or another) or closing (nothing shows now).
 */
export function itemPicked(before: string | null, shown: string | null): void {
  select();
  if (shown !== null && shown !== before) setTimeout(popup, POPUP_AFTER_MS);
  else if (shown === null && before !== null) setTimeout(popupClose, POPUP_AFTER_MS);
}
