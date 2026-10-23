import { GEM_EMOJI } from '../../forge/anvil/gem';
import { ESSENCE_NAME, ESSENCES, type EssenceId } from '../../protocol/heroes';
import { built } from '../../shared/built';
import { el, rich } from '../../shared/items';
import { coin, dust } from '../../shared/util';
import { KEPT } from '../../technomagic/assets/paths';
import type { InventoryTab } from '../tab';
import { TICKET_NAME, ticketPicture, useTicket, type TicketKind } from './tickets';
import { type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Others: what they have that isn't gear, a slot each (./tiles.ts), how many in its corner: zeiucoins (the
 * header's), komaTokens (the gacha's), komaGems, komaDust, the Unique Weapon and Unique Treasure Tickets crafted from it (the
 * raid shop's: picked, Use gives the hero's item they pick, ./tickets.ts) and the hero essences (the heroes page's); picked,
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
          <p class="inv-count">Currencies and hero essences. Pick one to see where it comes from.</p>
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
    const held: Record<string, number | null | undefined> = { zeiucoins: host.balance() ?? undefined, tokens: null, gems: null, dust: null, uw: null, ut: null, ...Object.fromEntries(ESSENCES.map((id) => [id, null])) };
    const tiles = (): Tile[] => [
      { id: 'zeiucoins', name: 'zeiucoins', picture: boxed(() => coin('', '')), grade: 5, count: held.zeiucoins, kind: 'Currency', about: 'Claimed, won and earned in the games. Pulls, outfits and the forge spend them.' },
      { id: 'tokens', name: 'komaTokens', picture: boxed(() => rich(TOKEN_EMOJI)), grade: 4, count: held.tokens, kind: 'Currency', about: 'Each pays for one Wish pull, before any zeiucoins.' },
      { id: 'gems', name: 'komaGems', picture: boxed(() => rich(GEM_EMOJI)), grade: 3, count: held.gems, kind: 'Currency', about: 'From the Weekly Boss, Dragon Raid first clears and crafting. The Raid Gear shop and transcending heroes spend them.' },
      { id: 'dust', name: 'komaDust', picture: boxed(() => dust('', '')), grade: 2, count: held.dust, kind: 'Material', about: 'From salvaging hero gear. Craft komaGems and Unique Weapon and Unique Treasure Tickets from it in the Craft tab.' },
      ...(['uw', 'ut'] as const).map((of): Tile => ticket(of)),
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
          about: 'From the Weekly Boss and the Dragon Raid. Transcending heroes spends it.',
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
        about: `Crafted from komaDust in the Craft tab. Use it for a ${TICKET_NAME[of].toLowerCase()} of any hero’s, picked as you do.`,
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
    draw();

    const heroes = host.load('heroes').then((res) => {
      held.gems = res.ok ? res.data.gems : undefined;
      for (const id of ESSENCES) held[id] = res.ok ? (res.data.essences[id] ?? 0) : undefined;
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
    return { drawn: Promise.all([heroes, shop, gacha]).then(() => undefined), unmount: () => grid.destroy() };
  },
};
