import { GEM_EMOJI } from '../../forge/anvil/gem';
import { el, rich } from '../../shared/items';
import { busyWith, type Busy, working } from '../../shared/ui';
import { dust, points } from '../../shared/util';
import { api, type ApiResult, loadMe } from '../../site/session';
import type { CraftRecipe, RaidShopView } from '../../protocol/raid-shop';
import type { InventoryHost, InventoryTab } from '../tab';
import { TICKET_NAME, ticketPicture } from './tickets';

/*
 * The inventory's Craft: what komaDust (what salvaging hero gear gives) can be made into, down the left, and the one picked
 * beside them: what one takes, what they have, how many to make (−, +, Max) and Craft. komaGems (every `powderPerGem` of it
 * one), and Unique Weapon and Unique Treasure Tickets (every `powderPerSelector`, 10,000: one, held in Others until used:
 * ./tickets.ts), all the bot's POST /api/raid-shop/craft; a recipe is one entry in RECIPES.
 */


/** The most the bot makes in one go (its craft's `count`). */
const MOST_AT_ONCE = 1000;

/** The bot's craft (POST /api/raid-shop/craft) of `count` of `recipe`. */
const craftOf = (host: InventoryHost, count: number, recipe: CraftRecipe): Promise<ApiResult<RaidShopView>> =>
  api<RaidShopView>('/api/raid-shop/craft', { method: 'POST', body: JSON.stringify({ guild: host.server(), count, recipe }) });

/** Something komaDust can be made into. */
interface Recipe {
  id: string;
  name: string;
  /** Its name for more than one. */
  plural: string;
  picture(): Node;
  about: string;
  /** What one takes in komaDust, from what the raid shop says (null: the bot can't make it). */
  per(shop: RaidShopView): number | null;
  /** Makes `count`, answering the raid shop as it is after. */
  craft(host: InventoryHost, count: number): Promise<ApiResult<RaidShopView>>;
}

const RECIPES: readonly Recipe[] = [
  {
    id: 'komagem',
    name: 'komaGem',
    plural: 'komaGems',
    picture: () => rich(GEM_EMOJI),
    about: 'Spent in the Raid Gear shop, on transcending heroes and on rerolling TechnoMagic gear’s additional skill.',
    per: (shop) => shop.powderPerGem ?? null,
    craft: (host, count) => craftOf(host, count, 'gem'),
  },
  ...(['uw', 'ut'] as const).map(
    (of): Recipe => ({
      id: `${of}-selector`,
      name: `${TICKET_NAME[of]} Ticket`,
      plural: `${TICKET_NAME[of]} Tickets`,
      picture: () => ticketPicture(of),
      about: `A ${TICKET_NAME[of].toLowerCase()} of any hero’s, picked as you use it in the Others tab.`,
      per: (shop) => shop.powderPerSelector ?? null,
      craft: (host, count) => craftOf(host, count, of),
    }),
  ),
];

export const craftTab: InventoryTab = {
  id: 'craft',
  label: 'Craft',
  uses: ['shop'],
  mount(root, host) {
    root.innerHTML = `
      <div class="inv-craft">
        <div class="inv-sheet">
          <div class="sheet-scroll"><div class="inv-recipe-list" role="listbox" aria-label="What to craft"></div></div>
        </div>
        <section class="inv-recipe" aria-live="polite"></section>
      </div>`;
    const list = root.querySelector('.inv-recipe-list') as HTMLElement;
    const panel = root.querySelector('.inv-recipe') as HTMLElement;

    let shop: RaidShopView | null = null;
    let picked: Recipe = RECIPES[0] as Recipe;
    let count = 1;
    let busy: Busy | null = null;

    const have = (): number => shop?.powder ?? 0;
    /** The most of `recipe` they can make now (0: none; null: the bot can't make it). */
    const most = (recipe: Recipe): number | null => {
      const per = shop ? recipe.per(shop) : null;
      return per ? Math.min(MOST_AT_ONCE, Math.floor(have() / per)) : null;
    };

    function drawList(): void {
      list.replaceChildren(
        ...RECIPES.map((recipe) => {
          const button = el('button', 'inv-recipe-tile');
          button.type = 'button';
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(recipe === picked));
          const pic = el('span', 'inv-recipe-pic');
          pic.append(recipe.picture());
          const words = el('span', 'inv-recipe-words');
          const per = shop ? recipe.per(shop) : null;
          const cost = el('span', 'inv-recipe-cost');
          if (per) cost.append(dust('inv-dust', ''), el('span', '', `${points(per)} each`));
          else cost.textContent = shop ? 'Not offered yet' : '…';
          words.append(el('span', 'inv-recipe-name', recipe.name), cost);
          button.append(pic, words);
          button.addEventListener('click', () => {
            if (recipe === picked) return;
            picked = recipe;
            count = 1;
            draw();
          });
          return button;
        }),
      );
    }

    function stepper(text: string, label: string, to: () => number, off: boolean): HTMLButtonElement {
      const button = el('button', 'action secondary inv-step', text);
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.disabled = off;
      button.addEventListener('click', () => {
        count = to();
        draw();
      });
      return button;
    }

    function drawPanel(): void {
      const recipe = picked;
      const per = shop ? recipe.per(shop) : null;
      const max = most(recipe) ?? 0;
      count = Math.max(1, Math.min(count, Math.max(1, max)));

      const head = el('div', 'inv-recipe-head');
      const pic = el('span', 'inv-recipe-pic big');
      pic.append(recipe.picture());
      const titles = el('div');
      titles.append(el('h2', 'inv-recipe-title', recipe.name), el('p', 'inv-recipe-about', recipe.about));
      head.append(pic, titles);

      const owned = el('p', 'inv-recipe-have');
      owned.append('You have ', dust('inv-dust', ''), el('b', '', points(have())), ' komaDust');
      if (!shop) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'Loading…'));
        return;
      }
      if (!per) {
        panel.replaceChildren(head, owned, el('p', 'inv-recipe-note', 'The bot can’t craft this yet.'));
        return;
      }
      const each = el('p', 'inv-recipe-have');
      each.append('One takes ', dust('inv-dust', ''), el('b', '', points(per)), ' komaDust');

      const amount = el('div', 'inv-amount');
      const input = el('input', 'inv-amount-input');
      input.type = 'number';
      input.min = '1';
      input.max = String(Math.max(1, max));
      input.value = String(count);
      input.setAttribute('aria-label', 'How many to craft');
      input.disabled = max === 0 || busy !== null;
      input.addEventListener('change', () => {
        const n = Math.floor(Number(input.value));
        count = Number.isFinite(n) ? n : 1;
        draw();
      });
      const locked = max === 0 || busy !== null;
      amount.append(
        stepper('−', 'One fewer', () => count - 1, locked || count <= 1),
        input,
        stepper('+', 'One more', () => count + 1, locked || count >= max),
        stepper('Max', `As many as you can (${points(max)})`, () => max, locked || count >= max),
      );

      const total = el('p', 'inv-recipe-total');
      total.append('Uses ', dust('inv-dust', ''), el('b', '', points(count * per)), ` komaDust for ${points(count)} ${count === 1 ? recipe.name : recipe.plural}`);

      const go = el('button', 'action main inv-craft-go', max === 0 ? `Not enough komaDust` : `Craft ${points(count)}`);
      go.type = 'button';
      if (max === 0) go.setAttribute('aria-disabled', 'true');
      working(go, busy, `craft:${recipe.id}`);
      go.addEventListener('click', () => void craft(recipe, count));

      const note = max === 0 ? [el('p', 'inv-recipe-note', `Salvage hero gear for komaDust: ${points(per)} of it crafts one.`)] : [];
      panel.replaceChildren(head, each, owned, amount, total, go, ...note);
    }

    function draw(): void {
      drawList();
      drawPanel();
    }

    async function craft(recipe: Recipe, n: number): Promise<void> {
      const max = most(recipe) ?? 0;
      if (busy || n < 1 || n > max) return;
      busy = busyWith(`craft:${recipe.id}`);
      host.status(null);
      draw();
      const res = await recipe.craft(host, n);
      busy = null;
      // What they have changed (or what was shown was old): the header's balances, and what the other tabs show, follow.
      void loadMe(true);
      if (!res.ok) {
        if (res.status === 0 || res.error === 'too_poor') await load(true);
        else draw();
        return res.error === 'too_poor' ? void host.status("You don't have that much komaDust any more.", true) : host.failed(res, `Could not craft ${recipe.plural}. Try again.`);
      }
      shop = res.data;
      host.keep('shop', res.data);
      // (komaGems: the heroes page's answer says them too, so it's asked for again.)
      void host.load('heroes', true);
      count = 1;
      draw();
      host.status(`Crafted ${points(n)} ${n === 1 ? recipe.name : recipe.plural}.${recipe.id === 'komagem' ? '' : ` Use ${n === 1 ? 'it' : 'them'} in the Others tab.`}`);
    }

    async function load(fresh = false): Promise<void> {
      const res = await host.load('shop', fresh);
      if (!res.ok) {
        draw();
        return host.failed(res, res.status === 404 ? 'Crafting isn’t open yet.' : 'Could not load your komaDust.');
      }
      shop = res.data;
      draw();
    }

    draw();
    return { drawn: load(), unmount: () => undefined };
  },
};
