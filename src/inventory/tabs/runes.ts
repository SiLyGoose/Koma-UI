import { el } from '../../shared/items';
import { runePic } from '../../heroes/parts';
import { HERO_PART_NAME, type HeroRuneStack } from '../../protocol/heroes';
import type { InventoryTab } from '../tab';

/*
 * The inventory's Runes: every rune they have that isn't socketed (the bot's /api/heroes), best first, each its picture (its
 * kind's gem on it), name, what it gives, the parts it goes in and how many they have, on parchment. Socketing one is the
 * Heroes page's (a piece's Runes).
 */


/** One stack's row. */
function row(rune: HeroRuneStack): HTMLElement {
  const box = el('div', 'rune-row inv-rune');
  box.dataset.grade = String(rune.grade);
  const words = el('span', 'rune-words');
  words.append(
    el('span', 'rune-name', rune.name),
    el('span', 'rune-lines', rune.lines.join(', ')),
    el('span', 'rune-lines inv-rune-parts', `Goes in ${rune.parts.map((part) => HERO_PART_NAME[part]).join(', ')}`),
  );
  box.append(runePic(rune), words, el('span', 'rune-count', `×${rune.count.toLocaleString()}`));
  return box;
}

export const runesTab: InventoryTab = {
  id: 'runes',
  label: 'Runes',
  uses: ['heroes'],
  mount(root, host) {
    root.innerHTML = `
      <div class="inv-list">
        <div class="inv-sheet">
          <div class="sheet-scroll"><div class="inv-runes"></div></div>
        </div>
        <div class="inv-bar">
          <input class="armory-search inv-search" type="search" placeholder="Search runes" aria-label="Search runes" autocomplete="off" />
          <p class="inv-count" aria-live="polite"></p>
        </div>
      </div>`;
    const list = root.querySelector('.inv-runes') as HTMLElement;
    const search = root.querySelector('.armory-search') as HTMLInputElement;
    const count = root.querySelector('.inv-count') as HTMLElement;
    let runes: readonly HeroRuneStack[] = [];

    const draw = (): void => {
      const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matches = (rune: HeroRuneStack): boolean => {
        const text = `${rune.name} ${rune.lines.join(' ')} ${rune.parts.map((part) => HERO_PART_NAME[part]).join(' ')}`.toLowerCase();
        return words.every((word) => text.includes(word));
      };
      const shown = runes.filter(matches);
      list.replaceChildren(...shown.map(row));
      if (runes.length === 0) list.append(el('p', 'rune-list-note muted', 'No runes yet. The TechnoMagic Raid and the Dragon Raid drop them.'));
      else if (shown.length === 0) list.append(el('p', 'rune-list-note muted', 'No runes match that.'));
      const total = runes.reduce((sum, rune) => sum + rune.count, 0);
      count.textContent = runes.length === 0 ? '' : `${total.toLocaleString()} rune${total === 1 ? '' : 's'} not socketed. Socket them on the Heroes page.`;
    };
    search.addEventListener('input', draw);

    const drawn = host.load('heroes').then((res) => {
      if (!res.ok) return host.failed(res, 'Could not load your runes.');
      runes = res.data.runes;
      draw();
    });
    return { drawn, unmount: () => undefined };
  },
};
