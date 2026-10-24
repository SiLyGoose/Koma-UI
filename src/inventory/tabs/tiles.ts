import { el, itemDetailsClosed, itemPicked } from '../../shared/items';
import { points } from '../../shared/util';

/*
 * The inventory's slots of things that aren't gear (Runes, Others), as King's Raid's inventory has them: a slot each, its
 * picture in a frame of its grade's colour (public/kr/ui/inventory/grade-<n>.webp, King's Raid's Equip_Grade frames), how
 * many they hold in its bottom right corner, blank slots down to the bottom of the sheet; picked, what it is over the side
 * of the slots away from it (as the gear tabs' details: a sheet from the bottom on narrow screens).
 */

/**
 * Puts `box`'s details on the side of its slots away from `slot` (one on the right half: on the left), so they never cover
 * what was picked (../inventory.css .detail-left).
 */
export function detailAway(box: HTMLElement, grid: HTMLElement, slot: Element | null): void {
  if (!slot) return;
  const at = slot.getBoundingClientRect();
  const all = grid.getBoundingClientRect();
  box.classList.toggle('detail-left', at.left + at.width / 2 > all.left + all.width / 2);
}

/** One slot's thing. */
export interface Tile {
  id: string;
  name: string;
  /** Its picture. */
  picture(): Node;
  /** Its picture fills the slot to its frame (a rune's, an essence's), rather than standing in the middle of it (a coin). */
  full?: boolean;
  /** Its frame's grade (1 white to 6 orange), or null for a plain slot. */
  grade: number | null;
  /** How many they hold (null: not known yet; undefined: couldn't be had). */
  count: number | null | undefined;
  /** What it is, over its lines ("Rune", "Currency"). */
  kind: string;
  about: string;
  /** Under its about: what it gives, a line each. */
  lines?: readonly string[];
  /** Under those, a note ("Goes in Weapon, Armor"). */
  note?: string;
  /** Searched besides its name. */
  words?: string;
  /** A button under its details that does something with one (a ticket's Use), off while `off` says why. */
  action?: { label: string; run(button: HTMLButtonElement): void; off?: string };
  /** Under its details (and `action`): more that does something with it (a rune's how many, Sell and Disassemble), made as they show. */
  controls?: () => Node;
}

export interface TileGrid {
  draw(tiles: readonly Tile[], query?: string): void;
  destroy(): void;
}

/** A count in a slot's corner: as it is up to 99,999, shorter past it (1.2M), the whole number in its title. */
function short(n: number): string {
  if (n < 100_000) return points(n);
  const [d, unit] = n >= 1e9 ? [1e9, 'B'] : n >= 1e6 ? [1e6, 'M'] : [1e3, 'K'];
  return `${Math.floor((n / d) * 10) / 10}${unit}`;
}

/** The grid in `sheet` (its .sheet-scroll), the details in `detail`; `box` is ringed .picking while one shows. */
export function tileGrid(box: HTMLElement, sheet: HTMLElement, grid: HTMLElement, detail: HTMLElement, none: string): TileGrid {
  let tiles: readonly Tile[] = [];
  let query = '';
  let picked: string | null = null;

  /** As many slots as fill the sheet, as the gear tabs' (./gear.ts). */
  function slots(): number {
    const across = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const cell = (grid.clientWidth - gap * (across - 1)) / across;
    const room = sheet.clientHeight - parseFloat(getComputedStyle(sheet).paddingTop) - parseFloat(getComputedStyle(sheet).paddingBottom);
    const rows = cell > 0 ? Math.max(1, Math.ceil((room + gap) / (cell + gap))) : 1;
    return across * rows;
  }

  function slot(tile: Tile): HTMLButtonElement {
    const button = el('button', 'item inv-tile');
    button.type = 'button';
    if (tile.grade !== null) button.dataset.grade = String(tile.grade);
    const pic = el('span', tile.full ? 'inv-tile-pic full' : 'inv-tile-pic');
    pic.append(tile.picture());
    button.append(pic);
    if (tile.grade !== null) button.append(el('span', 'inv-tile-frame'));
    const count = tile.count === null ? '…' : tile.count === undefined ? '—' : short(tile.count);
    const label = el('span', 'inv-tile-count', count);
    if (typeof tile.count === 'number') label.title = points(tile.count);
    button.append(label);
    button.classList.toggle('none', tile.count === 0);
    button.classList.toggle('picked', tile.id === picked);
    button.setAttribute('aria-label', `${tile.name}: ${typeof tile.count === 'number' ? points(tile.count) : 'not known'}`);
    button.addEventListener('click', () => {
      const before = picked;
      picked = picked === tile.id ? null : tile.id;
      if (picked) detailAway(box, grid, button);
      draw(tiles, query);
      itemPicked(before, picked);
    });
    return button;
  }

  function showDetail(tile: Tile | undefined): void {
    box.classList.toggle('picking', !!tile);
    detail.hidden = !tile;
    detail.textContent = '';
    if (!tile) return;
    if (tile.grade !== null) detail.dataset.grade = String(tile.grade);
    else delete detail.dataset.grade;
    detail.setAttribute('aria-label', tile.name);

    const bar = el('div', 'detail-bar');
    const close = el('button', 'detail-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.dataset.sfx = 'own';
    close.addEventListener('click', unpick);
    bar.append(el('h3', '', tile.name), close);

    const top = el('div', 'detail-top');
    const big = slot(tile);
    big.disabled = true;
    big.classList.add('detail-card');
    big.classList.remove('picked');
    const info = el('div', 'detail-info');
    const held = el('p', 'inv-held');
    held.append('Held: ', el('b', '', typeof tile.count === 'number' ? points(tile.count) : '—'));
    info.append(el('p', 'detail-kind', tile.kind), held);
    top.append(big, info);

    const body = el('div', 'detail-body');
    body.append(el('p', 'detail-desc', tile.about));
    if (tile.lines?.length) {
      const list = el('ul', 'detail-effects');
      for (const line of tile.lines) list.append(el('li', '', line));
      body.append(el('p', 'detail-label', 'Effects'), list);
    }
    if (tile.note) body.append(el('p', 'detail-note', tile.note));
    const { action } = tile;
    if (action) {
      const use = el('button', 'action main inv-tile-action', action.label);
      use.type = 'button';
      use.disabled = action.off !== undefined;
      if (action.off) use.title = action.off;
      use.addEventListener('click', () => action.run(use));
      body.append(use);
    }
    if (tile.controls) body.append(tile.controls());
    const scroll = el('div', 'detail-scroll');
    scroll.append(bar, top, body);
    detail.append(scroll);
  }

  function unpick(): void {
    if (picked !== null) itemDetailsClosed();
    picked = null;
    draw(tiles, query);
  }

  function draw(next: readonly Tile[], asked = ''): void {
    tiles = next;
    query = asked;
    const words = asked.split(/\s+/).filter(Boolean);
    const shown = tiles.filter((tile) => words.every((word) => `${tile.name} ${tile.words ?? ''}`.toLowerCase().includes(word)));
    const cells: HTMLElement[] = shown.map(slot);
    const across = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4;
    const least = Math.max(slots(), Math.ceil(shown.length / across) * across);
    for (let i = shown.length; i < least; i++) cells.push(el('span', 'item blank'));
    if (shown.length === 0) cells.push(el('p', 'armory-empty', tiles.length === 0 ? none : 'Nothing matches that.'));
    grid.replaceChildren(...cells);
    showDetail(tiles.find((tile) => tile.id === picked));
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && picked !== null && !(e.target instanceof HTMLInputElement)) unpick();
  };
  document.addEventListener('keydown', onKey);
  // (The sheet taller or wider: as many slots as fill it now.)
  let size = '';
  const resized = new ResizeObserver(() => {
    const now = `${sheet.clientWidth}x${sheet.clientHeight}`;
    if (now === size) return;
    size = now;
    draw(tiles, query);
  });
  resized.observe(sheet);

  return {
    draw,
    destroy: () => {
      document.removeEventListener('keydown', onKey);
      resized.disconnect();
    },
  };
}

/** How long the search waits after the last key before it searches (a key each, among thousands, would stutter). */
const TYPING_MS = 150;

/** `run`, once typing has stopped for TYPING_MS; `cancel` stops one waiting (the tab going away). */
export function afterTyping<A extends unknown[]>(run: (...args: A) => void): { (...args: A): void; cancel(): void } {
  let timer = 0;
  const wait = (...args: A): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => run(...args), TYPING_MS);
  };
  wait.cancel = (): void => window.clearTimeout(timer);
  return wait;
}

/** A stat by name, as a line says it without its amount (a King's Raid piece's or rune's "ATK +14%", a unique treasure's "+5% ATK Spd"). */
export const statName = (line: string): string => line.replace(/^[+\-−]?[\d.,]+%?\s+/, '').replace(/\s+[+\-−]?[\d.,]+%?$/, '').trim() || line;

/** A picture for a slot: an image filling it. */
export function tileImage(src: string): HTMLImageElement {
  const img = el('img');
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  img.draggable = false;
  return img;
}
