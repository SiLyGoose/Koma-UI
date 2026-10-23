import { armoryFilter, armoryGrid, type ArmoryCopy, type CardLook, type DetailParts, el, type FilterOffer, equippedIds, forgeLink, heroGear, itemDetailsClosed, itemIcons, itemPicked, type ItemType, lockToggle, optionsSection, showDetail, type StarChoice, TM_UNSORTED, tmSections, type TmSort, treasureParts, uniqueWeaponEffect, upgradeButton, wireSearch, type GearCopy, type GearView } from '../../shared/items';
import type { ApiResult } from '../../site/session';
import { FORGE_MODES, heroCan } from '../../forge/modes';
import { krSections, runeSection, withoutRunes } from '../../heroes/parts';
import type { HeroCopy, HeroesView } from '../../protocol/heroes';
import type { InventoryHost, InventoryTab, Source } from '../tab';
import { afterTyping, detailAway } from './tiles';

/*
 * The inventory's Player Gear and Hero Gear: every copy they own of one or the other, as the armories draw them (on parchment,
 * with the search and the Filter over them), and the one picked's details beside them (a sheet from the bottom on narrow
 * screens). What's done with a copy is its page's: the details link to the Player page (to wear it) or the Heroes page (to put
 * it on a hero), and to the forge (to upgrade it). The player gear's Filter offers only its weapons and armor at T1 to T4; the
 * hero gear's every part at T6 to T10 (and unique weapons and treasures), its substats, and its search their heroes' names too.
 */

/** How one armory tab gets its copies and draws them. */
interface ArmoryTabSpec<C extends ArmoryCopy, V> {
  id: string;
  label: string;
  source: Source;
  /** What the bot says (the host's load). */
  load(host: InventoryHost): Promise<ApiResult<V>>;
  /** Said when it can't be loaded. */
  failed: string;
  copies(view: V): readonly C[];
  look(view: V, copy: C): CardLook;
  /** Said with none at all. */
  none: string;
  /** The picked copy's details: what showDetail draws it as, and the parts around it. */
  detail(view: V, copy: C, close: () => void): { shown: C; parts: DetailParts };
  /** The types and tiers its Filter offers. */
  offer: FilterOffer;
  /** What else a copy is searched by (a unique weapon's or treasure's hero's name). */
  words?(view: V, copy: C): string;
  /** A copy's substats by name, for the Filter's Substats (left out: it offers none). */
  substats?(copy: C): readonly string[];
}

function armoryTab<C extends ArmoryCopy, V>(spec: ArmoryTabSpec<C, V>): InventoryTab {
  return {
    id: spec.id,
    label: spec.label,
      uses: [spec.source],
    mount(root, host) {
      // (As King's Raid's window: the slots, the bar under them with the search, the Filter and how many there are, and a
      // picked one's details over the slots.)
      root.innerHTML = `
        <div class="inv-gear">
          <div class="inv-sheet">
            <div class="sheet-scroll"><div class="armory-grid"></div></div>
          </div>
          <div class="inv-bar">
            <input class="armory-search inv-search" type="search" placeholder="Search items" aria-label="Search items" autocomplete="off" />
            <div class="armory-filter"></div>
            <p class="inv-count" aria-live="polite"></p>
          </div>
          <div class="detail" role="dialog" aria-label="Item" hidden></div>
        </div>`;
      const box = root.querySelector('.inv-gear') as HTMLElement;
      const search = root.querySelector('.armory-search') as HTMLInputElement;
      const filter = armoryFilter(root.querySelector('.armory-filter') as HTMLElement, spec.offer);
      const sheet = root.querySelector('.sheet-scroll') as HTMLElement;
      // (Only the rows in sight drawn: hero gear runs to thousands.)
      const grid = armoryGrid<C>(root.querySelector('.armory-grid') as HTMLElement, { scroller: sheet });
      const count = root.querySelector('.inv-count') as HTMLElement;
      const detail = root.querySelector('.detail') as HTMLElement;
      const gridBox = root.querySelector('.armory-grid') as HTMLElement;

      let view: V | null = null;
      let slot: ItemType | 'all' = 'all';
      let stars: StarChoice = 'all';
      let sort: TmSort = TM_UNSORTED;
      let substats: readonly string[] = [];
      let query = '';
      let picked: string | null = null;

      const copies = (): readonly C[] => (view ? spec.copies(view) : []);
      const close = (): void => {
        if (picked !== null) itemDetailsClosed();
        picked = null;
        draw();
      };

      /** As many slots as fill the sheet, as King's Raid's (rows of square slots down to its bottom, the last one cut off by it). */
      function slots(): number {
        const across = getComputedStyle(gridBox).gridTemplateColumns.split(' ').length || 4;
        const gap = parseFloat(getComputedStyle(gridBox).rowGap) || 0;
        const cell = (gridBox.clientWidth - gap * (across - 1)) / across;
        const room = sheet.clientHeight - parseFloat(getComputedStyle(sheet).paddingTop) - parseFloat(getComputedStyle(sheet).paddingBottom);
        return cell > 0 ? across * Math.max(1, Math.ceil((room + gap) / (cell + gap))) : 0;
      }

      function draw(): void {
        if (!view) return;
        const all = copies();
        filter.show({ slot, stars, owned: null, refineable: null, cls: null, heroGear: null, sort, substats: spec.substats ? substats : null });
        const of = spec.substats;
        grid.draw({
          copies: all,
          slot,
          stars,
          query,
          sort,
          ...(spec.words && { words: (copy: C) => spec.words?.(view as V, copy) ?? '' }),
          ...(of && substats.length > 0 && { matches: (copy: C) => substats.every((name) => of(copy).includes(name)) }),
          look: (copy) => spec.look(view as V, copy),
          picked,
          least: slots(),
          none: spec.none,
          onPick: (copy) => {
            const before = picked;
            picked = picked === copy.id ? null : copy.id;
            draw();
            itemPicked(before, picked);
          },
        });
        const shown = grid.shown().length;
        count.textContent = all.length === 0 ? '' : shown === all.length ? `${all.length.toLocaleString()} item${all.length === 1 ? '' : 's'}` : `${shown.toLocaleString()} of ${all.length.toLocaleString()} items`;
        const copy = picked ? all.find((one) => one.id === picked) : undefined;
        if (!copy) picked = null;
        box.classList.toggle('picking', !!copy);
        if (!copy) return showDetail(detail, undefined);
        // (Over the side of the slots away from it, so it never covers what was picked.)
        detailAway(box, gridBox, gridBox.querySelector('.item.picked'));
        const { shown: drawn, parts } = spec.detail(view, copy, close);
        showDetail(detail, drawn, parts);
      }

      filter.onChange((choice) => {
        slot = choice.slot;
        stars = choice.stars;
        sort = choice.sort ?? TM_UNSORTED;
        substats = choice.substats ?? [];
        draw();
      });
      const searched = afterTyping((asked: string) => {
        query = asked;
        draw();
      });
      wireSearch(search, searched);
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && picked !== null && !(e.target instanceof HTMLInputElement)) close();
      };
      document.addEventListener('keydown', onKey);
      // (The sheet taller or shorter: as many slots as fill it now.)
      let rows = 0;
      const resized = new ResizeObserver(() => {
        const now = slots();
        if (now === rows) return;
        rows = now;
        draw();
      });
      resized.observe(sheet);

      const drawn = spec.load(host).then((res) => {
        if (!res.ok) return host.failed(res, res.status === 404 ? `Nothing to show here yet.` : spec.failed);
        view = res.data;
        filter.setSorts(copies());
        if (spec.substats) filter.setSubstats([...new Set(copies().flatMap(spec.substats))]);
        draw();
      });

      return {
        drawn,
        unmount: () => {
          document.removeEventListener('keydown', onKey);
          resized.disconnect();
          searched.cancel();
          filter.destroy();
          grid.destroy();
        },
      };
    },
  };
}

/** A link in a copy's details' buttons, to another page (the site's router takes it). */
function linkButton(text: string, href: string, main = false): HTMLAnchorElement {
  const link = el('a', `detail-action action ${main ? 'main' : 'secondary'}`, text);
  link.href = href;
  return link;
}

/** Upgrade (Awaken, a hero's gear), to the forge with `copy` on its anvil; none where the forge can do nothing with it. */
const upgradeLink = (copy: ArmoryCopy): HTMLElement | null => {
  const button = upgradeButton(copy, () => undefined);
  if (!(button instanceof HTMLButtonElement)) return button;
  return linkButton(button.textContent ?? 'Upgrade', forgeLink(copy));
};

/** What a player copy's effects say with none. */
const NONE = 'No effects.';

export const playerGearTab: InventoryTab = armoryTab<GearCopy, GearView>({
  id: 'player-gear',
  label: 'Player Gear',
  source: 'gear',
  load: (host) => host.load('gear'),
  failed: 'Could not load your gear.',
  // (Their own gear only: hero gear has a tab of its own.)
  copies: (gear) => gear.copies.filter((copy) => !heroGear(copy)),
  look: (gear, copy) => ({ tag: equippedIds(gear).has(copy.id) ? { text: 'Equipped' } : null }),
  none: "You don't own any gear yet. Pull some with Koma's gacha in Discord.",
  offer: { types: ['weapon', 'armor'], tiers: [4, 3, 2, 1] },
  detail(gear, copy, close) {
    const worn = gear.equipped[copy.slot] === copy.id;
    const notes: HTMLElement[] = [];
    if (copy.borrowed !== null) notes.push(el('p', 'detail-note', `This one is made for someone else: you get ${Math.round(copy.borrowed * 100)}% of its effects.`));
    const { setEffect } = copy;
    const upgrade = upgradeLink(copy);
    return {
      shown: copy,
      parts: {
        onClose: close,
        label: 'Effects',
        none: NONE,
        sections: tmSections({ ...copy, setEffect: setEffect && { pieces: setEffect.pieces, text: setEffect.text }, additionalActive: undefined }),
        notes,
        corner: lockToggle(copy, null, null),
        info: worn ? [el('span', 'detail-mw detail-worn', 'Equipped')] : [],
        actions: [...(upgrade ? [upgrade] : []), linkButton(worn ? 'On the Player page' : 'Equip on the Player page', '/player/', !worn)],
      },
    };
  },
});

/** What a hero copy's effects say with none. */
const HERO_NONE = 'No effects on a hero.';

/** An option's stat by name, as its line says it without its amount (a King's Raid piece's "ATK +14%", a unique treasure's "+5% ATK Spd"). */
const substatName = (line: string): string => line.replace(/^[+\-−]?[\d.,]+%?\s+/, '').replace(/\s+[+\-−]?[\d.,]+%?$/, '').trim() || line;

export const heroGearTab: InventoryTab = armoryTab<HeroCopy, HeroesView>({
  id: 'hero-gear',
  label: 'Hero Gear',
  source: 'heroes',
  load: (host) =>
    host.load('heroes').then((res) => {
      // (King's Raid's pieces: their pictures, as the bot says them.)
      if (res.ok) for (const copy of res.data.copies) if (copy.icon) itemIcons.set(copy.itemId, copy.icon);
      return res;
    }),
  failed: 'Could not load your hero gear.',
  copies: (view) => view.copies,
  look: (view, copy) => {
    const on = copy.hero !== null ? view.heroes.find((hero) => hero.id === copy.hero) : undefined;
    return { tag: on ? { text: `On ${on.name}`, className: 'elsewhere' } : null };
  },
  none: 'No hero gear yet. The Weekly Boss and the Dragon Raid drop it, the raid shop sells it, and the TechnoMagic Raid drops its own.',
  offer: { tiers: [10, 9, 8, 7, 6, 'uw', 'ut'] },
  words: (view, copy) => {
    const owner = copy.uniqueWeapon ?? copy.uniqueTreasure?.hero;
    return owner ? (view.heroes.find((hero) => hero.id === owner)?.name ?? owner) : '';
  },
  substats: (copy) => copy.options.map((option) => substatName(option.line)),
  detail(view, copy, close) {
    const on = copy.hero !== null ? view.heroes.find((hero) => hero.id === copy.hero) : undefined;
    const notes: HTMLElement[] = [el('p', 'detail-note', on ? `${on.name} wears this.` : 'No hero wears this.')];
    const ownerId = copy.uniqueWeapon ?? copy.uniqueTreasure?.hero;
    const owner = ownerId ? view.heroes.find((hero) => hero.id === ownerId) : undefined;
    if (copy.uniqueWeapon) notes.push(el('p', 'detail-note', `${owner?.name ?? 'Another hero'}’s unique weapon: only they can wield it.`));
    if (copy.uniqueTreasure) notes.push(el('p', 'detail-note', `${owner?.name ?? 'Another hero'}’s unique treasure: its Unique Effect works only as their Main Treasure; as a Sub Treasure, only its Options do.`));
    // (As the heroes page draws it: a unique treasure's main effect and options apart, a unique weapon's own effect alone, anything
    // else without its runes' lines, which its Runes say.)
    const ut = copy.uniqueTreasure ? treasureParts(copy.effects) : null;
    const uw = copy.uniqueWeapon ? uniqueWeaponEffect(copy.effects) : null;
    const upgrade = FORGE_MODES.some((mode) => heroCan(copy, mode.id)) ? linkButton(copy.level < copy.maxLevel ? 'Upgrade' : 'Forge', forgeLink(copy)) : null;
    return {
      shown: { ...copy, effects: ut ? ut.main : uw ? uw : withoutRunes(copy) },
      parts: {
        onClose: close,
        label: ut || uw ? 'Unique Effect' : 'On a hero',
        none: HERO_NONE,
        sections: [...(ut ? optionsSection(ut.options) : copy.krSet || copy.part === 'artifact' ? krSections(copy, true) : tmSections(copy)), ...runeSection(copy)],
        notes,
        corner: lockToggle(copy, null, null),
        actions: [...(upgrade ? [upgrade] : []), linkButton(on ? 'On the Heroes page' : 'Equip on the Heroes page', '/heroes/', !on)],
      },
    };
  },
});
