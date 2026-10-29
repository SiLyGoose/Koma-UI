import { GEM_EMOJI } from '../../forge/anvil/gem';
import { ESSENCE_NAME, ESSENCES, type EssenceId } from '../../protocol/heroes';
import { built } from '../../shared/built';
import { crystalName, crystalPicture, el, rich, stoneName, stonePicture } from '../../shared/items';
import { RAID_CLASS_IDS } from '../../protocol/raid';
import { SCROLL_NAME, scrollPicture } from '../../shared/items/scroll';

/** The TechnoMagic sets, each its boss's Boss Crystals. */
const TM_SETS = ['perseverance', 'hope', 'authority'] as const;
import { coin, dust } from '../../shared/util';
import { KEPT } from '../../technomagic/assets/paths';
import type { InventoryTab } from '../tab';
import type { HeroesView, LootBoxStack } from '../../protocol/heroes';
import { lootButtons, lootRevealed, lootTile, openLoot } from './loot';
import { reveal, type Reveal } from './reveal';
import { TICKET_NAME, ticketPicture, useTicket, type TicketKind } from './tickets';
import { type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Others: what they have that isn't gear, a slot each (./tiles.ts), how many in its corner: zeiucoins (the
 * header's), komaTokens (the gacha's), komaGems, komaDust, the Unique Weapon and Unique Treasure Tickets crafted from it or
 * claimed from mail (the raid shop's: picked, Use gives the hero's item they pick, ./tickets.ts), Transcendence Attribute Points
 * (crafted from Boss Crystals, used on a hero's Transcend tab), Rune Fragments (what runes
 * disassemble into, crafting Mysterious Runes in the Craft tab), the hero essences and the Technomagic
 * Gear Upgrade Stones, a slot for each class's (the heroes page's: ../../shared/items/stones.ts), and the Dispatch Battle Loot
 * claimed from background raids' mail, a slot each box (./loot.ts: Open 10 or Open All, what they gave shown over the page); picked,
 * where it comes from and what it's for. The slots fill in as the bot's answers they're in come (a dash where one
 * couldn't be had).
 */

/** komaTokens, as the bot writes them (its constants/core.ts TOKEN_EMOJI). */
const TOKEN_EMOJI = '<:zeiutoken:1552921364489572362>';

/** A picture made by `make`, in a box that fills its slot. */
const boxed = (make: () => Node): (() => Node) => () => {
  const box = el('span', 'inv-other-pic');
  box.append(make());
  return box;
};

export const othersTab: InventoryTab = {
  id: 'others',
  label: 'Others',
  uses: ['heroes', 'shop', 'gacha'],
  mount(root, host) {
    root.innerHTML = `
      <div class="inv-gear inv-tiles">
        <div class="inv-sheet">
          <div class="sheet-scroll"><div class="armory-grid"></div></div>
        </div>
        <div class="inv-bar">
          <p class="inv-count">Currencies, tickets, loot boxes, Rune Fragments, hero essences, Boss Crystals and Upgrade Stones. Pick one to see where it comes from.</p>
        </div>
        <div class="detail" role="dialog" aria-label="Item" hidden></div>
      </div>`;
    const grid = tileGrid(
      root.querySelector('.inv-gear') as HTMLElement,
      root.querySelector('.sheet-scroll') as HTMLElement,
      root.querySelector('.armory-grid') as HTMLElement,
      root.querySelector('.detail') as HTMLElement,
      'Nothing here yet.',
    );

    /** How many of each they hold (null: not known yet; undefined: couldn't be had). */
    const held: Record<string, number | null | undefined> = { zeiucoins: host.balance() ?? undefined, tokens: null, gems: null, dust: null, fragments: null, uw: null, ut: null, scrolls: null, ...Object.fromEntries(ESSENCES.map((id) => [id, null])), ...Object.fromEntries(RAID_CLASS_IDS.map((cls) => [`stone-${cls}`, null])), ...Object.fromEntries(TM_SETS.map((set) => [`crystal-${set}`, null])) };
    /** The Dispatch Battle Loot they hold (null: not known yet), the most opened at a time, the box being opened, and what opening showed. */
    let boxes: LootBoxStack[] | null = null;
    let openMost = 200;
    let opening: string | null = null;
    let shown: Reveal | null = null;
    let gone = false;
    const tiles = (): Tile[] => [
      { id: 'zeiucoins', name: 'zeiucoins', picture: boxed(() => coin('', '')), grade: 5, count: held.zeiucoins, kind: 'Currency', about: 'Claimed, won and earned in the games. Pulls, outfits and the forge spend them.' },
      { id: 'tokens', name: 'komaTokens', picture: boxed(() => rich(TOKEN_EMOJI)), grade: 4, count: held.tokens, kind: 'Currency', about: 'Each pays for one Wish pull, before any zeiucoins.' },
      { id: 'gems', name: 'komaGems', picture: boxed(() => rich(GEM_EMOJI)), grade: 3, count: held.gems, kind: 'Currency', about: 'From the Weekly Boss, Dragon Raid first clears and crafting. The Raid Gear shop and transcending heroes spend them.' },
      { id: 'dust', name: 'komaDust', picture: boxed(() => dust('', '')), grade: 2, count: held.dust, kind: 'Material', about: 'From salvaging hero gear (TechnoMagic gear gives Upgrade Stones and Boss Crystals too). Craft komaGems and Unique Weapon and Unique Treasure Tickets from it in the Craft tab.' },
      // (King's Raid's: what disassembling a rune gives, and what Mysterious Runes are crafted from.)
      { id: 'fragments', name: 'Rune Fragment', picture: () => tileImage('/kr/items/RUNE_FRAGMENT.webp'), full: true, grade: 3, count: held.fragments, kind: 'Material', words: 'rune fragments', about: 'From disassembling runes: in the Runes tab (Sell, then Disassemble), or one in a piece’s socket on the Heroes page. Craft Mysterious Runes from them in the Craft tab.' },
      ...(['uw', 'ut'] as const).map((of): Tile => ticket(of)),
      ...(boxes ?? []).map((box) => lootTile(box, () => lootButtons(box, opening !== null, (count, button) => void open(box, count, button)))),
      { id: 'scrolls', name: SCROLL_NAME, picture: () => scrollPicture(), full: true, grade: 5, count: held.scrolls, kind: 'Material', words: 'tp transcend attribute point scroll', about: 'Crafted from Boss Crystals (any one boss’s) in the Craft tab. Use it on a hero’s Transcend tab on the Heroes page: 5 more TP for that hero, up to 15 more (95 TP at Transcend 5).' },
      ...ESSENCES.map(
        (id: EssenceId): Tile => ({
          id,
          name: `${ESSENCE_NAME[id]} Essence`,
          // (As the heroes page's ../../heroes/transcend.ts essencePicture, without the raid's heroes it reads; its own purple
          // edge cut off, the slot's frame in its place.)
          picture: () => {
            const img = tileImage(built(`${KEPT}/transcend/essences/${id}.png`));
            img.className = 'inv-crop';
            return img;
          },
          full: true,
          grade: 4,
          count: held[id],
          kind: 'Hero Essence',
          about: 'From the Weekly Boss and the Dragon Raid (and its Dispatch Battle Loot). Transcending heroes spends it.',
        }),
      ),
      // (King's Raid's Boss Crystals, a TechnoMagic set each: its boss's.)
      ...TM_SETS.map(
        (set): Tile => ({
          id: `crystal-${set}`,
          name: crystalName(set),
          picture: () => tileImage(crystalPicture(set)),
          full: true,
          grade: 5,
          count: held[`crystal-${set}`],
          kind: 'Material',
          words: 'boss crystal technomagic',
          about: `From its boss's TechnoMagic Raid wins (more the higher the stage) and their Dispatch Battle Loot, and salvaging its set's TechnoMagic gear (100 a piece, 200 a Reclaimed one). Crafts that gear in the Craft tab, and the forge spends 300 rerolling one of its pieces' substats.`,
        }),
      ),
      // (King's Raid's, a class each: what awakens that class's TechnoMagic pieces, in place of a spare copy.)
      ...RAID_CLASS_IDS.map(
        (cls): Tile => ({
          id: `stone-${cls}`,
          name: stoneName(cls),
          picture: () => tileImage(stonePicture(cls)),
          full: true,
          grade: 4,
          count: held[`stone-${cls}`],
          kind: 'Material',
          words: 'upgrade stone technomagic',
          about: `From TechnoMagic Raid wins at stage 7 and up (of a class you brought; their Dispatch Battle Loot's, of any class), and salvaging TechnoMagic gear of this class (1 a piece, 2 a Reclaimed one). The forge spends them awakening a TechnoMagic piece of this class: 10, 20, 40, 80 and 160 for ★1 to ★5 (a Reclaimed piece half as many again).`,
        }),
      ),
    ];
    /** A ticket's slot: picked, Use (one held) picks the hero's item it gives. */
    const ticket = (of: TicketKind): Tile => {
      const count = held[of];
      return {
        id: of,
        name: `${TICKET_NAME[of]} Ticket`,
        picture: () => ticketPicture(of),
        full: true,
        grade: 5,
        count,
        kind: 'Ticket',
        about: `From mail, or crafted from komaDust in the Craft tab. Use it for a ${TICKET_NAME[of].toLowerCase()} of any hero’s, picked as you do.`,
        words: of === 'uw' ? 'uw selector' : 'ut selector',
        action: {
          label: 'Use',
          ...(typeof count !== 'number' || count < 1 ? { off: 'You have none: craft one from komaDust in the Craft tab.' } : {}),
          run: (button) =>
            void useTicket(host, of, button).then((shop) => {
              if (!shop) return;
              held.dust = shop.powder;
              held.uw = shop.selectors?.uw;
              held.ut = shop.selectors?.ut;
              draw();
            }),
        },
      };
    };
    const draw = (): void => grid.draw(tiles());

    /** Their heroes' answer: what Others shows of it. */
    const fromHeroes = (view: HeroesView): void => {
      held.gems = view.gems;
      held.fragments = view.runeFragments ?? 0;
      held.scrolls = view.tpScrolls ?? 0;
      for (const id of ESSENCES) held[id] = view.essences[id] ?? 0;
      for (const cls of RAID_CLASS_IDS) held[`stone-${cls}`] = view.stones?.[cls] ?? 0;
      for (const set of TM_SETS) held[`crystal-${set}`] = view.crystals?.[set] ?? 0;
      boxes = view.lootBoxes ?? [];
      openMost = view.lootOpenMost ?? openMost;
    };

    /** Opens `count` of `box` (./loot.ts), then shows what they gave over the page. */
    async function open(box: LootBoxStack, count: number, button: HTMLButtonElement): Promise<void> {
      if (opening) return;
      opening = box.id;
      for (const one of root.querySelectorAll<HTMLButtonElement>('.inv-loot-open button')) one.disabled = true;
      const done = await openLoot(host, box, count, openMost, button);
      opening = null;
      if (!done) {
        // (Not that many any more: how many they hold now.)
        const fresh = await host.load('heroes', true);
        if (fresh.ok) fromHeroes(fresh.data);
        return draw();
      }
      const { view, opened } = done;
      host.keep('heroes', view);
      // (New hero gear: the gear tabs' copies asked for again; zeiucoins: the header's.)
      if (opened.copies.length > 0) host.forget('gear');
      if (opened.points > 0) host.refreshBalance();
      if (opened.points > 0) held.zeiucoins = (host.balance() ?? 0) + opened.points;
      if (opened.dust > 0) host.forget('shop');
      if (opened.dust > 0 && typeof held.dust === 'number') held.dust += opened.dust;
      fromHeroes(view);
      draw();
      shown?.close();
      const items = lootRevealed(view, opened, (id) => tiles().find((tile) => tile.id === id) ?? null);
      if (gone || items.length === 0) return;
      const page = (root.closest('.inventory-page') as HTMLElement | null) ?? document.body;
      shown = reveal(page, items, 'Opened', () => (shown = null));
    }
    draw();

    const heroes = host.load('heroes').then((res) => {
      if (res.ok) fromHeroes(res.data);
      else for (const id of ['gems', 'fragments', 'scrolls', ...ESSENCES, ...RAID_CLASS_IDS.map((cls) => `stone-${cls}`), ...TM_SETS.map((set) => `crystal-${set}`)]) held[id] = undefined;
      draw();
    });
    const shop = host.load('shop').then((res) => {
      held.dust = res.ok ? res.data.powder : undefined;
      held.uw = res.ok ? res.data.selectors?.uw : undefined;
      held.ut = res.ok ? res.data.selectors?.ut : undefined;
      draw();
    });
    const gacha = host.load('gacha').then((res) => {
      held.tokens = res.ok ? res.data.tokens : undefined;
      draw();
    });
    return {
      drawn: Promise.all([heroes, shop, gacha]).then(() => undefined),
      unmount: () => {
        gone = true;
        shown?.close();
        grid.destroy();
      },
    };
  },
};
