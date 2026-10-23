import { armoryFilter, armoryGrid, type ArmoryCopy, type CardLook, type DetailParts, el, equippedIds, forgeLink, heroGear, itemDetailsClosed, itemIcons, itemPicked, type ItemType, lockToggle, optionsSection, showDetail, type StarChoice, TM_UNSORTED, tmSections, type TmSort, treasureParts, uniqueWeaponEffect, upgradeButton, wireSearch, type GearCopy, type GearView } from '../../shared/items';
import type { ApiResult } from '../../site/session';
import { FORGE_MODES, heroCan } from '../../forge/modes';
import { krSections, runeSection, withoutRunes } from '../../heroes/parts';
import type { HeroCopy, HeroesView } from '../../protocol/heroes';
import type { InventoryHost, InventoryTab, Source } from '../tab';

/*
 * The inventory's Player Gear and Hero Gear: every copy they own of one or the other, as the armories draw them (on parchment,
 * with the search and the Filter over them), and the one picked's details beside them (a sheet from the bottom on narrow
 * screens). What's done with a copy is its page's: the details link to the Player page (to wear it) or the Heroes page (to put
 * it on a hero), and to the forge (to upgrade it).
 */

/** A crossed sword and shield, for Player Gear. */
const PLAYER_ICON = '<svg viewBox="0 0 24 24"><path d="M19.5 2.5 21.5 4.5 11 15l-1.3-.2-.5-.5L9 13z" fill="currentColor"/><path d="M5.2 13.4 10.6 18.8 9.2 20.2 7.8 18.8 5.3 21.3a1.4 1.4 0 0 1-2-2l2.5-2.5-1.4-1.4z" fill="currentColor"/></svg>';
/** A helmet, for Hero Gear. */
const HERO_ICON = '<svg viewBox="0 0 24 24"><path d="M12 2a9 9 0 0 1 9 9v4.5l-2.5 1.5V22h-4v-6.5H18V11a6 6 0 0 0-12 0v4.5h3.5V22h-4v-5L3 15.5V11a9 9 0 0 1 9-9z" fill="currentColor"/><path d="M11 5h2v7.5h-2z" fill="currentColor"/></svg>';

/** How one armory tab gets its copies and draws them. */
interface ArmoryTabSpec<C extends ArmoryCopy, V> {
  id: string;
  label: string;
  icon: string;
  source: Source;
  /** Over the frame. */
  title: string;
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
}

function armoryTab<C extends ArmoryCopy, V>(spec: ArmoryTabSpec<C, V>): InventoryTab {
  return {
    id: spec.id,
    label: spec.label,
    icon: spec.icon,
    uses: [spec.source],
    mount(root, host) {
      root.innerHTML = `
        <div class="inv-gear">
          <div class="armory inv-armory">
            <div class="armory-plaque plaque"><span class="inv-armory-title"></span></div>
            <div class="armory-tools">
              <input class="armory-search" type="search" placeholder="Search items" aria-label="Search items" autocomplete="off" />
              <div class="armory-filter"></div>
            </div>
            <div class="armory-sheet">
              <div class="sheet-scroll"><div class="armory-grid"></div></div>
            </div>
            <p class="inv-count" aria-live="polite"></p>
          </div>
          <div class="detail" role="dialog" aria-label="Item" hidden></div>
          <p class="inv-hint">Pick an item to see what it does.</p>
        </div>`;
      const box = root.querySelector('.inv-gear') as HTMLElement;
      (root.querySelector('.inv-armory-title') as HTMLElement).textContent = spec.title;
      const search = root.querySelector('.armory-search') as HTMLInputElement;
      const filter = armoryFilter(root.querySelector('.armory-filter') as HTMLElement);
      const grid = armoryGrid<C>(root.querySelector('.armory-grid') as HTMLElement);
      const count = root.querySelector('.inv-count') as HTMLElement;
      const detail = root.querySelector('.detail') as HTMLElement;

      let view: V | null = null;
      let slot: ItemType | 'all' = 'all';
      let stars: StarChoice = 'all';
      let sort: TmSort = TM_UNSORTED;
      let query = '';
      let picked: string | null = null;

      const copies = (): readonly C[] => (view ? spec.copies(view) : []);
      const close = (): void => {
        if (picked !== null) itemDetailsClosed();
        picked = null;
        draw();
      };

      function draw(): void {
        if (!view) return;
        const all = copies();
        filter.show({ slot, stars, owned: null, refineable: null, cls: null, heroGear: null, sort });
        grid.draw({
          copies: all,
          slot,
          stars,
          query,
          sort,
          look: (copy) => spec.look(view as V, copy),
          picked,
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
        const { shown: drawn, parts } = spec.detail(view, copy, close);
        showDetail(detail, drawn, parts);
      }

      filter.onChange((choice) => {
        slot = choice.slot;
        stars = choice.stars;
        sort = choice.sort ?? TM_UNSORTED;
        draw();
      });
      wireSearch(search, (asked) => {
        query = asked;
        draw();
      });
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && picked !== null && !(e.target instanceof HTMLInputElement)) close();
      };
      document.addEventListener('keydown', onKey);

      const drawn = spec.load(host).then((res) => {
        if (!res.ok) return host.failed(res, res.status === 404 ? `Nothing to show here yet.` : spec.failed);
        view = res.data;
        filter.setSorts(copies());
        draw();
      });

      return {
        drawn,
        unmount: () => {
          document.removeEventListener('keydown', onKey);
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
  icon: PLAYER_ICON,
  source: 'gear',
  title: 'Player Gear',
  load: (host) => host.load('gear'),
  failed: 'Could not load your gear.',
  // (Their own gear only: hero gear has a tab of its own.)
  copies: (gear) => gear.copies.filter((copy) => !heroGear(copy)),
  look: (gear, copy) => ({ tag: equippedIds(gear).has(copy.id) ? { text: 'Equipped' } : null }),
  none: "You don't own any gear yet. Pull some with Koma's gacha in Discord.",
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

export const heroGearTab: InventoryTab = armoryTab<HeroCopy, HeroesView>({
  id: 'hero-gear',
  label: 'Hero Gear',
  icon: HERO_ICON,
  source: 'heroes',
  title: 'Hero Gear',
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
