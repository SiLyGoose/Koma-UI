import { HERO_PART_NAME, type HeroRuneStack } from '../../protocol/heroes';
import { dropdown } from '../../shared/ui';
import type { InventoryTab } from '../tab';
import { afterTyping, statName, type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Runes: every rune they have that isn't socketed (the bot's /api/heroes), best first (the dual-stat ones, King's
 * Raid's Velkazar runes, before any other: the top runes there are), a slot each (./tiles.ts): its picture filling it, framed in
 * its grade's colour, how many in its corner; picked, what it gives and the parts it goes in. Its Stats (the site's dropdown,
 * in the bar) shows only those with any of the stats picked. Socketing one is the Heroes page's (a piece's Runes).
 */

/** Whether a rune gives two stats (a Velkazar rune's), not one. */
const dual = (rune: HeroRuneStack): boolean => rune.lines.length > 1;

/** The runes best first: the dual-stat ones, then the rest, each as the bot has them (by grade). */
const bestFirst = (runes: readonly HeroRuneStack[]): HeroRuneStack[] => [...runes.filter(dual), ...runes.filter((rune) => !dual(rune))];

/** A rune's slot. */
function tile(rune: HeroRuneStack): Tile {
  const parts = rune.parts.map((part) => HERO_PART_NAME[part]).join(', ');
  return {
    id: rune.id,
    name: rune.name,
    picture: () => tileImage(`/kr/items/${rune.icon}.webp`),
    full: true,
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
          <select class="inv-stat-filter" multiple aria-label="Stats" data-none="All stats"></select>
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
    const stats = root.querySelector('.inv-stat-filter') as HTMLSelectElement;
    stats.id = 'inv-rune-stats';
    const statPicker = dropdown(stats);
    let runes: HeroRuneStack[] = [];

    /** The runes the Stats leaves (any of those picked; none picked: all), drawn by the search. */
    function draw(): void {
      const picked = [...stats.selectedOptions].map((one) => one.value);
      const shown = picked.length === 0 ? runes : runes.filter((rune) => rune.lines.some((line) => picked.includes(statName(line))));
      grid.draw(shown.map(tile), search.value.trim().toLowerCase());
      const total = runes.reduce((sum, rune) => sum + rune.count, 0);
      const of = shown.reduce((sum, rune) => sum + rune.count, 0);
      count.textContent = total === 0 ? '' : `${picked.length > 0 ? `${of.toLocaleString()} of ` : ''}${total.toLocaleString()} rune${total === 1 ? '' : 's'} not socketed`;
    }
    const searched = afterTyping(draw);
    search.addEventListener('input', () => searched());
    stats.addEventListener('change', draw);

    const drawn = host.load('heroes').then((res) => {
      if (!res.ok) return host.failed(res, 'Could not load your runes.');
      runes = bestFirst(res.data.runes);
      // Every stat their runes give, A to Z.
      const names = [...new Set(runes.flatMap((rune) => rune.lines.map(statName)))].sort((a, b) => a.localeCompare(b));
      stats.replaceChildren(
        ...names.map((name) => {
          const one = document.createElement('option');
          one.value = name;
          one.textContent = name;
          return one;
        }),
      );
      stats.hidden = names.length === 0;
      statPicker.refresh();
      draw();
    });
    grid.draw([]);
    return {
      drawn,
      unmount: () => {
        searched.cancel();
        statPicker.destroy();
        grid.destroy();
      },
    };
  },
};
