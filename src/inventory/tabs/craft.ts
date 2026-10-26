import { GEM_EMOJI } from '../../forge/anvil/gem';
import { crystalCount, crystalIcon, crystalName, el, rich } from '../../shared/items';
import { HERO_CLASSES } from '../../shared/heroes';
import { busyWith, type Busy, working } from '../../shared/ui';
import { coin, dust, points } from '../../shared/util';
import { api, type ApiResult, loadMe } from '../../site/session';
import type { CraftRecipe, RaidShopView } from '../../protocol/raid-shop';
import { HERO_PART_NAME, type HeroesCrafted, type HeroesView, type HeroPart, TM_CRAFT_PARTS, type TmCraftKind } from '../../protocol/heroes';
import type { TmSetId } from '../../protocol/items';
import { RUNE_BOXES, type RuneBox, type RunesCrafted } from '../../protocol/runes';
import { fragmentIcon } from '../../shared/items/fragments';
import type { InventoryHost, InventoryTab } from '../tab';
import { TICKET_NAME, ticketPicture } from './tickets';

/*
 * The inventory's Craft: what komaDust (what salvaging hero gear gives) can be made into, down the left, and the one picked
 * beside them: what one takes, what they have, how many to make (−, +, Max) and Craft. komaGems (every `powderPerGem` of it
 * one), and Unique Weapon and Unique Treasure Tickets (every `powderPerSelector` one, held in Others until used:
 * ./tickets.ts), all the bot's POST /api/raid-shop/craft; a recipe is one entry in RECIPES. Under them, TechnoMagic gear, a
 * set each (King's Raid's Valance's Workshop): a piece of it for its boss's Boss Crystals and zeiucoins, any of its pieces, any
 * class's of a part picked, or a class's part picked (the bot's POST /api/heroes/craft), one at a time. Under those, Runes:
 * King's Raid's Mysterious Runes, each a rune of its grade (any as likely), for Rune Fragments (what runes disassemble into),
 * as many at once as komaDust's (the bot's POST /api/runes/craft). Every price is the bot's setting: the raid shop's view says
 * komaDust's, the heroes' view (`craft`) the rest.
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

/** The TechnoMagic sets, each crafted with its boss's Boss Crystals, and what each is called here. */
const TM_SETS: readonly { id: TmSetId; name: string }[] = [
  { id: 'perseverance', name: 'Perseverance Gear' },
  { id: 'hope', name: 'Hope Gear' },
  { id: 'authority', name: 'Authority Gear' },
];

/** A Mysterious Rune's picture (King's Raid's PACKAGE_RUNE_*). */
function runeBoxPicture(box: RuneBox): HTMLImageElement {
  const img = el('img');
  img.src = `/kr/items/${box.icon}.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
}

/** What a Mysterious Rune gives: "An Uncommon rune, …" (its grade's name, from its own). */
const runeBoxAbout = (box: RuneBox): string => {
  const grade = box.name.split(': ').at(-1)?.trim() ?? '';
  return `${/^[AEIOU]/.test(grade) ? 'An' : 'A'} ${grade} rune, any of them as likely. It goes to your Runes.`;
};

/** The three ways to craft one, as the panel offers them. */
const TM_WAYS: readonly { kind: TmCraftKind; name: string; about: string }[] = [
  { kind: 'any', name: 'Any piece', about: 'Any class, any part.' },
  { kind: 'part', name: 'A part', about: 'Any class’s, of the part you pick.' },
  { kind: 'exact', name: 'A class’s part', about: 'The class and part you pick.' },
];

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
  uses: ['shop', 'heroes'],
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
    /** Their heroes' view: their Boss Crystals and zeiucoins (TechnoMagic gear's crafting). */
    let heroes: HeroesView | null = null;
    /** A komaDust recipe, a TechnoMagic set, or a Mysterious Rune. */
    let picked: Recipe | TmSetId | RuneBox = RECIPES[0] as Recipe;
    let count = 1;
    let busy: Busy | null = null;
    /** TechnoMagic gear: the way picked, its part and its class. */
    let way: TmCraftKind = 'any';
    let part: HeroPart = 'armor';
    let cls = HERO_CLASSES[0]?.id ?? 'knight';

    const have = (): number => shop?.powder ?? 0;
    /** The most of `recipe` they can make now (0: none; null: the bot can't make it). */
    const most = (recipe: Recipe): number | null => {
      const per = shop ? recipe.per(shop) : null;
      return per ? Math.min(MOST_AT_ONCE, Math.floor(have() / per)) : null;
    };

    /** Their Rune Fragments (0 while their heroes' view isn't known), and the most of `box` they make (at most MOST_AT_ONCE). */
    const fragments = (): number => heroes?.runeFragments ?? 0;
    /** What one of `box` takes in Rune Fragments (null: not known yet, or a bot from before it was a setting). */
    const runePrice = (box: RuneBox): number | null => heroes?.craft?.runes[box.id] ?? null;
    const mostRunes = (box: RuneBox): number => {
      const per = runePrice(box);
      return per ? Math.min(MOST_AT_ONCE, Math.floor(fragments() / per)) : 0;
    };

    /** A Mysterious Rune's tile in the list: its picture, and the fragments one takes. */
    function runeTile(box: RuneBox): HTMLButtonElement {
      const button = el('button', 'inv-recipe-tile');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(picked === box));
      const pic = el('span', 'inv-recipe-pic');
      pic.append(runeBoxPicture(box));
      const words = el('span', 'inv-recipe-words');
      const cost = el('span', 'inv-recipe-cost');
      const per = runePrice(box);
      if (per) cost.append(fragmentIcon('inv-dust'), el('span', '', `${points(per)} each`));
      else cost.textContent = heroes ? 'Not offered yet' : '…';
      words.append(el('span', 'inv-recipe-name', box.name), cost);
      button.append(pic, words);
      button.addEventListener('click', () => {
        if (picked === box) return;
        picked = box;
        count = 1;
        draw();
      });
      return button;
    }

    /** A TechnoMagic set's tile in the list: its boss's crystal, and how many they have. */
    function tmTile(set: (typeof TM_SETS)[number]): HTMLButtonElement {
      const button = el('button', 'inv-recipe-tile');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(picked === set.id));
      const pic = el('span', 'inv-recipe-pic');
      pic.append(crystalIcon(set.id));
      const words = el('span', 'inv-recipe-words');
      const cost = el('span', 'inv-recipe-cost', heroes ? `${points(heroes.crystals?.[set.id] ?? 0)} ${crystalName(set.id).replace('Crystal', 'Crystals')}` : '…');
      words.append(el('span', 'inv-recipe-name', set.name), cost);
      button.append(pic, words);
      button.addEventListener('click', () => {
        if (picked === set.id) return;
        picked = set.id;
        draw();
      });
      return button;
    }

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
        el('p', 'inv-recipe-group', 'TechnoMagic Gear'),
        ...TM_SETS.map(tmTile),
        el('p', 'inv-recipe-group', 'Runes'),
        ...RUNE_BOXES.map(runeTile),
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

    /** How many to make: −, the number, + and Max (`max` of them; none: all of it off). */
    function amountRow(max: number): HTMLElement {
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
      return amount;
    }

    /** A Mysterious Rune picked: what one takes, their Rune Fragments, how many, and Craft. */
    function drawRune(box: RuneBox): void {
      const max = mostRunes(box);
      count = Math.max(1, Math.min(count, Math.max(1, max)));
      const head = el('div', 'inv-recipe-head');
      const pic = el('span', 'inv-recipe-pic big');
      pic.append(runeBoxPicture(box));
      const titles = el('div');
      titles.append(el('h2', 'inv-recipe-title', box.name), el('p', 'inv-recipe-about', runeBoxAbout(box)));
      head.append(pic, titles);
      if (!heroes) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'Loading…'));
        return;
      }
      const per = runePrice(box);
      if (!per) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'The bot can’t craft this yet.'));
        return;
      }
      const each = el('p', 'inv-recipe-have');
      each.append('One takes ', fragmentIcon('inv-dust'), el('b', '', points(per)), ' Rune Fragments');
      const owned = el('p', 'inv-recipe-have');
      owned.append('You have ', fragmentIcon('inv-dust'), el('b', '', points(fragments())), ' Rune Fragments');
      const total = el('p', 'inv-recipe-total');
      total.append('Uses ', fragmentIcon('inv-dust'), el('b', '', points(count * per)), ` Rune Fragments for ${points(count)}`);
      const go = el('button', 'action main inv-craft-go', max === 0 ? 'Not enough Rune Fragments' : `Craft ${points(count)}`);
      go.type = 'button';
      if (max === 0) go.setAttribute('aria-disabled', 'true');
      working(go, busy, `craft:${box.id}`);
      go.addEventListener('click', () => void craftRunes(box, count));
      const note = max === 0 ? [el('p', 'inv-recipe-note', `Disassemble runes for Rune Fragments (the Runes tab: Sell, then Disassemble): ${points(per)} of them craft one.`)] : [];
      panel.replaceChildren(head, each, owned, amountRow(max), total, go, ...note);
    }

    /** Crafts `n` of a Mysterious Rune, and says which runes they gave. */
    async function craftRunes(box: RuneBox, n: number): Promise<void> {
      if (busy || n < 1 || n > mostRunes(box)) return;
      busy = busyWith(`craft:${box.id}`);
      host.status(null);
      draw();
      const res = await host.post<RunesCrafted>('/api/runes/craft', { box: box.id, count: n });
      busy = null;
      if (!res.ok) {
        if (res.status === 0 || res.error === 'no_fragments' || res.error === 'busy') await loadHeroes(true);
        else draw();
        return res.error === 'no_fragments' ? void host.status('You don’t have that many Rune Fragments any more.', true) : host.failed(res, 'Could not craft those runes. Try again.');
      }
      const { crafted, ...view } = res.data;
      heroes = view;
      host.keep('heroes', view);
      count = 1;
      draw();
      // What each gave, by name (the same one more than once: how many).
      const got = new Map<string, number>();
      for (const id of crafted) {
        const name = view.runes.find((rune) => rune.id === id)?.name ?? id;
        got.set(name, (got.get(name) ?? 0) + 1);
      }
      host.status(`Crafted ${points(n)} ${box.name}: ${[...got].map(([name, k]) => (k > 1 ? `${name} ×${k}` : name)).join(', ')}. They’re in Runes.`);
    }

    /** A row of choices (the way, a part, a class), the one picked lit; picking one draws the panel again. */
    function choices<T extends string>(label: string, options: readonly { id: T; name: string; about?: string }[], on: T, pick: (id: T) => void): HTMLElement {
      const row = el('div', 'inv-tm-choices');
      row.setAttribute('role', 'radiogroup');
      row.setAttribute('aria-label', label);
      for (const option of options) {
        const button = el('button', `action secondary inv-tm-choice${option.id === on ? ' on' : ''}`);
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(option.id === on));
        button.append(el('span', 'inv-tm-choice-name', option.name));
        if (option.about) button.append(el('span', 'inv-tm-choice-about', option.about));
        button.disabled = busy !== null;
        button.addEventListener('click', () => {
          pick(option.id);
          draw();
        });
        row.append(button);
      }
      return row;
    }

    /** A TechnoMagic set picked: its three ways (each its price), the part and class where the way takes them, and Craft. */
    function drawTm(set: (typeof TM_SETS)[number]): void {
      const head = el('div', 'inv-recipe-head');
      const pic = el('span', 'inv-recipe-pic big');
      pic.append(crystalIcon(set.id));
      const titles = el('div');
      titles.append(
        el('h2', 'inv-recipe-title', set.name),
        el('p', 'inv-recipe-about', `A piece of the ${set.name.replace(' Gear', '')} set, for ${crystalName(set.id).replace('Crystal', 'Crystals')} and zeiucoins (King’s Raid’s Valance’s Workshop). Its substats and additional effect are rolled as a drop’s, and now and then it comes Reclaimed.`),
      );
      head.append(pic, titles);
      if (!heroes) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'Loading…'));
        return;
      }
      const prices = heroes.craft?.tm;
      if (!prices) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'The bot can’t craft this yet.'));
        return;
      }
      const crystals = heroes.crystals?.[set.id] ?? 0;
      const balance = host.balance() ?? heroes.balance;
      const owned = el('p', 'inv-recipe-have');
      owned.append('You have ', crystalIcon(set.id, 'inv-dust'), el('b', '', points(crystals)), ` ${crystalName(set.id).replace('Crystal', 'Crystals')} and `, coin('inv-dust', ''), el('b', '', points(balance)), ' zeiucoins');

      const ways = choices(
        'How to craft it',
        TM_WAYS.map(({ kind, name, about }) => ({ id: kind, name, about: `${about} ${points(prices[kind].crystals)} crystals + ${points(prices[kind].points)} zeiucoins` })),
        way,
        (kind) => {
          way = kind;
        },
      );
      const parts = way === 'any' ? [] : [el('p', 'inv-tm-label', 'Part'), choices('Part', TM_CRAFT_PARTS.map((id) => ({ id, name: HERO_PART_NAME[id] })), part, (id) => (part = id))];
      const classes = way === 'exact' ? [el('p', 'inv-tm-label', 'Class'), choices('Class', HERO_CLASSES, cls, (id) => (cls = id))] : [];

      const price = prices[way];
      const shortCrystals = crystals < price.crystals;
      const shortPoints = balance < price.points;
      const total = el('p', 'inv-recipe-total');
      total.append('Uses ', crystalIcon(set.id, 'inv-dust'), el('b', '', points(price.crystals)), ` ${crystalName(set.id).replace('Crystal', 'Crystals')} and `, coin('inv-dust', ''), el('b', '', points(price.points)), ' zeiucoins');
      const go = el('button', 'action main inv-craft-go', shortCrystals ? 'Not enough crystals' : shortPoints ? 'Not enough zeiucoins' : 'Craft');
      go.type = 'button';
      if (shortCrystals || shortPoints) go.setAttribute('aria-disabled', 'true');
      working(go, busy, `craft:${set.id}`);
      go.addEventListener('click', () => void craftTm(set));
      const note = shortCrystals
        ? [el('p', 'inv-recipe-note', `You need ${crystalCount(set.id, price.crystals - crystals).replace(' ', ' more ')}: its boss’s TechnoMagic Raid drops them (more the higher the stage), and salvaging the set’s gear gives them.`)]
        : [];
      panel.replaceChildren(head, owned, el('p', 'inv-tm-label', 'Craft'), ways, ...parts, ...classes, total, go, ...note);
    }

    /** Crafts a piece of `set` as picked, and says what came. */
    async function craftTm(set: (typeof TM_SETS)[number]): Promise<void> {
      const price = heroes?.craft?.tm[way];
      if (busy || !heroes || !price || (heroes.crystals?.[set.id] ?? 0) < price.crystals || (host.balance() ?? heroes.balance) < price.points) return;
      busy = busyWith(`craft:${set.id}`);
      host.status(null);
      draw();
      const res = await host.post<HeroesCrafted>('/api/heroes/craft', { set: set.id, kind: way, ...(way !== 'any' && { part }), ...(way === 'exact' && { class: cls }) });
      busy = null;
      // (It cost zeiucoins: the header's follow.)
      host.refreshBalance();
      if (!res.ok) {
        if (res.status === 0 || res.error === 'no_crystals' || res.error === 'too_poor') await loadHeroes(true);
        else draw();
        return host.failed(res, res.error === 'no_crystals' ? 'You don’t have that many crystals any more.' : res.error === 'too_poor' ? 'You don’t have that many zeiucoins any more.' : 'Could not craft that. Try again.');
      }
      const { crafted, ...view } = res.data;
      heroes = view;
      host.keep('heroes', view);
      // (The gear's copies have the hero gear too.)
      host.forget('gear');
      draw();
      host.status(`Crafted ${crafted.name}. It’s in Hero Gear.`);
    }

    function drawPanel(): void {
      if (typeof picked === 'string') {
        const set = TM_SETS.find((one) => one.id === picked);
        if (set) return drawTm(set);
        picked = RECIPES[0] as Recipe;
      }
      if ('grade' in picked) return drawRune(picked);
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

      const amount = amountRow(max);

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

    /** Their heroes' view (their Boss Crystals), for TechnoMagic gear. */
    async function loadHeroes(fresh = false): Promise<void> {
      const res = await host.load('heroes', fresh);
      heroes = res.ok ? res.data : null;
      draw();
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
    return { drawn: Promise.all([load(), loadHeroes()]).then(() => undefined), unmount: () => undefined };
  },
};
