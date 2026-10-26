import { el, itemDetailsClosed, itemPicked } from '../../shared/items';

/*
 * What was just crafted (./craft.ts), shown as a fight's rewards are (../../technomagic/result.ts, staged): over the page
 * darkened, a band across the middle under its name ("Crafted"), a tile for each thing made, its picture and its name
 * under it, and "Tap to continue" under the band. A tile pressed opens its details over it all (as the inventory's tabs
 * draw them: a hero copy's, or a slot's), their ✕, the dark around them or Escape closing them again; a tap anywhere else
 * (or Escape) goes on, the overlay gone.
 */

/** One thing made, as the reveal shows it. */
export interface Revealed {
  id: string;
  name: string;
  /** Its tile's picture: a card, or a slot (./tiles.ts tileSlot). */
  face(): HTMLElement;
  /** Draws its details in `box` (a .detail, emptied), its ✕ calling `close`. */
  detail(box: HTMLElement, close: () => void): void;
}

export interface Reveal {
  /** Takes it away (the tab going away). */
  close(): void;
}

/** Shows `items` over `page` (the inventory's main), titled `heading`; `done` once it's gone on from. */
export function reveal(page: HTMLElement, items: readonly Revealed[], heading = 'Crafted', done?: () => void): Reveal {
  const overlay = el('div', 'inv-reveal');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', heading);
  const band = el('div', 'inv-reveal-band');
  const tiles = el('div', 'inv-reveal-tiles');
  band.append(el('p', 'inv-reveal-head', heading), tiles);
  const tap = el('p', 'inv-reveal-tap', 'Tap to continue');
  const shade = el('div', 'inv-reveal-detail');
  shade.hidden = true;
  const detail = el('div', 'detail');
  detail.setAttribute('role', 'dialog');
  shade.append(detail);
  overlay.append(band, tap, shade);

  /** The thing whose details show (null: none). */
  let open: string | null = null;

  function closeDetail(): void {
    if (open === null) return;
    const before = open;
    open = null;
    shade.hidden = true;
    detail.textContent = '';
    itemDetailsClosed();
    tiles.querySelector<HTMLElement>(`[data-id="${CSS.escape(before)}"]`)?.focus();
  }

  function openDetail(item: Revealed): void {
    const before = open;
    open = item.id;
    item.detail(detail, closeDetail);
    shade.hidden = false;
    itemPicked(before, open);
    detail.querySelector<HTMLElement>('.detail-close')?.focus();
  }

  tiles.append(
    ...items.map((item) => {
      const tile = el('button', 'inv-reveal-tile');
      tile.type = 'button';
      tile.dataset.id = item.id;
      tile.title = `${item.name}: see its details`;
      const face = item.face();
      // (A slot is a button of its own: only the tile is pressed.)
      if (face instanceof HTMLButtonElement) face.tabIndex = -1;
      tile.append(face, el('span', 'inv-reveal-name', item.name));
      tile.addEventListener('click', () => openDetail(item));
      return tile;
    }),
  );

  function close(): void {
    if (!overlay.isConnected) return;
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    done?.();
  }

  // The dark around the details closes them; anywhere but on a tile or the details, goes on.
  overlay.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target === shade) return closeDetail();
    if (target.closest('.inv-reveal-tile, .inv-reveal-detail')) return;
    close();
  });
  // Escape: the details closed, else gone on from (before the tab's own Escape: it's over them).
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (open !== null) closeDetail();
    else close();
  };
  document.addEventListener('keydown', onKey, true);

  page.append(overlay);
  tiles.querySelector<HTMLElement>('.inv-reveal-tile')?.focus({ preventScroll: true });
  return { close };
}
