import { el } from '../../shared/items';
import { HERO_PART_NAME, type HeroRuneStack } from '../../protocol/heroes';
import type { InventoryTab } from '../tab';
import { type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Runes: every rune they have that isn't socketed (the bot's /api/heroes), best first, a slot each (./tiles.ts):
 * its picture with its kind's gem on its corner, framed in its grade's colour, how many in its corner; picked, what it gives
 * and the parts it goes in. Socketing one is the Heroes page's (a piece's Runes).
 */

/** A rune's slot. */
function tile(rune: HeroRuneStack): Tile {
  const parts = rune.parts.map((part) => HERO_PART_NAME[part]).join(', ');
  return {
    id: rune.id,
    name: rune.name,
    picture: () => {
      const pic = el('span', 'inv-rune-pic');
      pic.append(tileImage(`/kr/items/${rune.icon}.webp`), el('span', `kr-rune ${rune.color}`));
      return pic;
    },
    grade: rune.grade,
    count: rune.count,
    kind: 'Rune',
    about: `Goes in ${parts}. Socket it on the Heroes page.`,
    lines: rune.lines,
    words: `${rune.lines.join(' ')} ${parts}`,
  };
}

export const runesTab: InventoryTab = {
  id: 'runes',
  label: 'Runes',
  uses: ['heroes'],
  mount(root, host) {
    root.innerHTML = `
      <div class="inv-gear inv-tiles">
        <div class="inv-sheet">
          <div class="sheet-scroll"><div class="armory-grid"></div></div>
        </div>
        <div class="inv-bar">
          <input class="armory-search inv-search" type="search" placeholder="Search runes" aria-label="Search runes" autocomplete="off" />
          <p class="inv-count" aria-live="polite"></p>
        </div>
        <div class="detail" role="dialog" aria-label="Rune" hidden></div>
      </div>`;
    const search = root.querySelector('.armory-search') as HTMLInputElement;
    const count = root.querySelector('.inv-count') as HTMLElement;
    const grid = tileGrid(
      root.querySelector('.inv-gear') as HTMLElement,
      root.querySelector('.sheet-scroll') as HTMLElement,
      root.querySelector('.armory-grid') as HTMLElement,
      root.querySelector('.detail') as HTMLElement,
      'No runes yet. The TechnoMagic Raid and the Dragon Raid drop them.',
    );
    let tiles: Tile[] = [];
    search.addEventListener('input', () => grid.draw(tiles, search.value.trim().toLowerCase()));

    const drawn = host.load('heroes').then((res) => {
      if (!res.ok) return host.failed(res, 'Could not load your runes.');
      tiles = res.data.runes.map(tile);
      const total = res.data.runes.reduce((sum, rune) => sum + rune.count, 0);
      count.textContent = total === 0 ? '' : `${total.toLocaleString()} rune${total === 1 ? '' : 's'} not socketed`;
      grid.draw(tiles, search.value.trim().toLowerCase());
    });
    grid.draw([]);
    return { drawn, unmount: () => grid.destroy() };
  },
};
