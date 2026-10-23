import { GEM_EMOJI } from '../../forge/anvil/gem';
import { ESSENCE_NAME, ESSENCES } from '../../protocol/heroes';
import { built } from '../../shared/built';
import { el, rich } from '../../shared/items';
import { coin, dust, points } from '../../shared/util';
import { KEPT } from '../../technomagic/assets/paths';
import type { InventoryTab } from '../tab';

/*
 * The inventory's Others: what they have that isn't gear, a tile each on parchment: zeiucoins (the header's), komaTokens (the
 * gacha's), komaGems, komaDust and the hero essences (the heroes page's and the raid shop's), each with where it comes from and
 * what it's for. Each tile fills in as the bot's answer it's in comes (a dash where it couldn't be had).
 */

/** A pouch, for Others. */
const ICON = '<svg viewBox="0 0 24 24"><path d="M9 3h6l-1.5 3h-3z" fill="currentColor"/><path d="M8.5 7h7c2.5 2 5.5 5.5 5.5 9a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5c0-3.5 3-7 5.5-9Z" fill="currentColor"/></svg>';

/** komaTokens, as the bot writes them (its constants/core.ts TOKEN_EMOJI). */
const TOKEN_EMOJI = '<:zeiutoken:1552921364489572362>';

/** One tile: its picture, name, amount (null: not known yet; undefined: couldn't be had) and a line on it. */
function tile(picture: Node, name: string, about: string): { box: HTMLElement; set(amount: number | null | undefined): void } {
  const box = el('div', 'inv-currency');
  const pic = el('span', 'inv-currency-pic');
  pic.append(picture);
  const amount = el('span', 'inv-currency-amount', '…');
  const words = el('span', 'inv-currency-words');
  words.append(el('span', 'inv-currency-name', name), el('span', 'inv-currency-about', about));
  box.append(pic, words, amount);
  return {
    box,
    set(n) {
      amount.textContent = n === null ? '…' : n === undefined ? '—' : points(n);
      box.classList.toggle('none', n === 0);
    },
  };
}

/** An essence's picture (as the heroes page's ../../heroes/transcend.ts essencePicture, without the raid's heroes it reads). */
function essenceImage(id: string): HTMLImageElement {
  const img = el('img');
  img.src = built(`${KEPT}/transcend/essences/${id}.png`);
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

export const othersTab: InventoryTab = {
  id: 'others',
  label: 'Others',
  icon: ICON,
  uses: ['heroes', 'shop', 'gacha'],
  mount(root, host) {
    root.innerHTML = `
      <div class="armory inv-list">
        <div class="armory-plaque plaque"><span>Others</span></div>
        <div class="armory-sheet">
          <div class="sheet-scroll">
            <h3 class="inv-group">Currencies</h3>
            <div class="inv-currencies" data-group="money"></div>
            <h3 class="inv-group">Hero Essences</h3>
            <div class="inv-currencies" data-group="essences"></div>
          </div>
        </div>
      </div>`;
    const money = root.querySelector('[data-group="money"]') as HTMLElement;
    const essenceBox = root.querySelector('[data-group="essences"]') as HTMLElement;

    const coins = tile(coin('inv-currency-img', ''), 'zeiucoins', 'Claimed, won and earned in the games. Pulls, outfits and the forge spend them.');
    const tokens = tile(rich(TOKEN_EMOJI), 'komaTokens', 'Each pays for one Wish pull, before any zeiucoins.');
    const gems = tile(rich(GEM_EMOJI), 'komaGems', 'From the Weekly Boss, Dragon Raid first clears and crafting. The Raid Gear shop and transcending spend them.');
    const powder = tile(dust('inv-currency-img', ''), 'komaDust', 'From salvaging hero gear. Craft komaGems from it.');
    money.append(coins.box, tokens.box, gems.box, powder.box);
    const essences = ESSENCES.map((id) => {
      const one = tile(essenceImage(id), `${ESSENCE_NAME[id]} Essence`, 'From the Weekly Boss and the Dragon Raid. Transcending heroes spends it.');
      essenceBox.append(one.box);
      return [id, one] as const;
    });

    coins.set(host.balance() ?? undefined);
    for (const one of [tokens, gems, powder]) one.set(null);
    for (const [, one] of essences) one.set(null);

    const heroes = host.load('heroes').then((res) => {
      gems.set(res.ok ? res.data.gems : undefined);
      for (const [id, one] of essences) one.set(res.ok ? (res.data.essences[id] ?? 0) : undefined);
    });
    const shop = host.load('shop').then((res) => powder.set(res.ok ? res.data.powder : undefined));
    const gacha = host.load('gacha').then((res) => tokens.set(res.ok ? res.data.tokens : undefined));
    return { drawn: Promise.all([heroes, shop, gacha]).then(() => undefined), unmount: () => undefined };
  },
};
