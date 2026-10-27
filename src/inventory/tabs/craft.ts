import { GEM_EMOJI } from '../../forge/anvil/gem';
import { crystalCount, crystalIcon, crystalName, el, itemFace, itemIcons, rich, showDetail } from '../../shared/items';
import { HERO_CLASSES } from '../../shared/heroes';
import { busyWith, type Busy, working } from '../../shared/ui';
import { coin, dust, points } from '../../shared/util';
import { api, type ApiResult, loadMe } from '../../site/session';
import type { CraftRecipe, RaidShopView } from '../../protocol/raid-shop';
import { HERO_PART_NAME, type HeroesCrafted, type HeroesView, type HeroPart, TM_ACCESSORIES, TM_ACCESSORY_NAME, TM_CRAFT_PARTS, TP_SCROLL_MOST, TP_SCROLL_POINTS, type TmAccessory, type TmCraftKind } from '../../protocol/heroes';
import type { TmSetId } from '../../protocol/items';
import { RUNE_BOXES, type RuneBox, type RunesCrafted } from '../../protocol/runes';
import { fragmentIcon } from '../../shared/items/fragments';
import { SCROLL_NAME, scrollCount, scrollPicture } from '../../shared/items/scroll';
import type { InventoryHost, InventoryTab } from '../tab';
import { heroCopyDetail } from './gear';
import { reveal, type Reveal, type Revealed } from './reveal';
import { runeTile } from './runes';
import { TICKET_NAME, ticketPicture } from './tickets';
import { type Tile, tileDetail, tileSlot } from './tiles';

/*
 * The inventory's Craft: what komaDust (what salvaging hero gear gives) can be made into, down the left, and the one picked
 * beside them: what one takes, what they have, how many to make (−, +, Max) and Craft. komaGems (every `powderPerGem` of it
 * one), and Unique Weapon and Unique Treasure Tickets (every `powderPerSelector` one, held in Others until used:
 * ./tickets.ts), all the bot's POST /api/raid-shop/craft; a recipe is one entry in RECIPES. Under them, TechnoMagic gear, a
 * set each (King's Raid's Valance's Workshop): a piece of it for its boss's Boss Crystals and zeiucoins, any of its pieces, any
 * class's of a part picked, or a class's part picked, an accessory any of its four kinds or the one picked (the bot's POST
 * /api/heroes/craft), one at a time. Then a Transcendence Scroll (+5 TP for a hero, used on its Transcend tab), for any one
 * boss's Boss Crystals, picked, as many at once as komaDust's (the bot's POST /api/heroes/craft-scroll). Under those, Runes:
 * King's Raid's Mysterious Runes, each a rune of its grade (any as likely), for Rune Fragments (what runes disassemble into),
 * as many at once as komaDust's (the bot's POST /api/runes/craft). Every price is the bot's setting: the raid shop's view says
 * komaDust's, the heroes' view (`craft`) the rest. What a craft made is then shown over the page as a fight's rewards are
 * (./reveal.ts): a tile each, pressed for its details, a tap anywhere else going on.
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
  /** Its slot when made, as Others has it (./others.ts): its picture, its frame's grade, whether the picture fills it, what it is. */
  slot: Pick<Tile, 'picture' | 'grade' | 'full' | 'kind'>;
  /** How many they hold (null: not known). */
  held(shop: RaidShopView, heroes: HeroesView | null): number | null;
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

/** The Transcendence Scroll picked in the list. */
const SCROLL = 'tp-scroll';

/** What a Transcendence Scroll does, as its panel and its slot say it. */
const SCROLL_ABOUT = `Gives a hero ${TP_SCROLL_POINTS} more TP for good, on top of what transcending gives it, up to ${TP_SCROLL_MOST} more (${TP_SCROLL_MOST / TP_SCROLL_POINTS} scrolls). Use it on the hero’s Transcend tab on the Heroes page.`;

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
    slot: {
      picture: () => {
        const box = el('span', 'inv-other-pic');
        box.append(rich(GEM_EMOJI));
        return box;
      },
      grade: 3,
      kind: 'Currency',
    },
    held: (_, heroes) => heroes?.gems ?? null,
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
      slot: { picture: () => ticketPicture(of), grade: 5, full: true, kind: 'Ticket' },
      held: (shop) => shop.selectors?.[of] ?? null,
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
    /** A komaDust recipe, a TechnoMagic set, the Transcendence Scroll, or a Mysterious Rune. */
    let picked: Recipe | TmSetId | typeof SCROLL | RuneBox = RECIPES[0] as Recipe;
    let count = 1;
    let busy: Busy | null = null;
    /** TechnoMagic gear: the way picked, its part and its class. */
    let way: TmCraftKind = 'any';
    let part: HeroPart = 'armor';
    /** An accessory: the kind picked ('any': any of the four). */
    let accessory: TmAccessory | 'any' = 'any';
    let cls = HERO_CLASSES[0]?.id ?? 'knight';
    /** The Transcendence Scroll: the boss whose crystals pay (null: the one they have most of). */
    let scrollSet: TmSetId | null = null;
    /** What a craft made, shown over the page (null: nothing). */
    let shown: Reveal | null = null;
    /** The tab gone (what a craft still under way made isn't shown over another). */
    let gone = false;

    /** Shows what a craft made over the page (./reveal.ts), the one shown before gone. */
    function show(items: readonly Revealed[]): void {
      shown?.close();
      if (gone || items.length === 0) return;
      const page = (root.closest('.inventory-page') as HTMLElement | null) ?? document.body;
      shown = reveal(page, items, 'Crafted', () => (shown = null));
    }

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
    function boxTile(box: RuneBox): HTMLButtonElement {
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

    /** The boss whose crystals pay for a Transcendence Scroll: the one picked, or the one they have most of. */
    const payingSet = (): TmSetId => scrollSet ?? TM_SETS.reduce((best, set) => ((heroes?.crystals?.[set.id] ?? 0) > (heroes?.crystals?.[best] ?? 0) ? set.id : best), TM_SETS[0]?.id ?? 'perseverance');
    /** What one scroll takes in Boss Crystals (null: not known yet, or a bot from before them), and the most they make of `set`'s. */
    const scrollPrice = (): number | null => heroes?.craft?.tpScroll ?? null;
    const mostScrolls = (set: TmSetId): number => {
      const per = scrollPrice();
      return per ? Math.min(MOST_AT_ONCE, Math.floor((heroes?.crystals?.[set] ?? 0) / per)) : 0;
    };

    /** The Transcendence Scroll's tile in the list: its picture, and the crystals one takes. */
    function scrollTile(): HTMLButtonElement {
      const button = el('button', 'inv-recipe-tile');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(picked === SCROLL));
      const pic = el('span', 'inv-recipe-pic');
      pic.append(scrollPicture());
      const words = el('span', 'inv-recipe-words');
      const per = scrollPrice();
      const cost = el('span', 'inv-recipe-cost', per ? `${points(per)} Boss Crystals each` : heroes ? 'Not offered yet' : '…');
      words.append(el('span', 'inv-recipe-name', SCROLL_NAME), cost);
      button.append(pic, words);
      button.addEventListener('click', () => {
        if (picked === SCROLL) return;
        picked = SCROLL;
        count = 1;
        draw();
      });
      return button;
    }

    /** The Transcendence Scroll picked: what one takes, whose crystals pay (each boss's, how many they have), how many, and Craft. */
    function drawScroll(): void {
      const head = el('div', 'inv-recipe-head');
      const pic = el('span', 'inv-recipe-pic big');
      pic.append(scrollPicture());
      const titles = el('div');
      titles.append(el('h2', 'inv-recipe-title', SCROLL_NAME), el('p', 'inv-recipe-about', SCROLL_ABOUT));
      head.append(pic, titles);
      if (!heroes) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'Loading…'));
        return;
      }
      const per = scrollPrice();
      if (!per) {
        panel.replaceChildren(head, el('p', 'inv-recipe-note', 'The bot can’t craft this yet.'));
        return;
      }
      const set = payingSet();
      const max = mostScrolls(set);
      count = Math.max(1, Math.min(count, Math.max(1, max)));
      const each = el('p', 'inv-recipe-have');
      each.append('One takes ', el('b', '', points(per)), ' Boss Crystals, any one boss’s');
      const owned = el('p', 'inv-recipe-have');
      owned.append('You have ', scrollPicture('inv-dust', true), el('b', '', points(heroes.tpScrolls ?? 0)), ` ${SCROLL_NAME}s`);
      // (Each boss's crystals, how many they have: the one picked pays.)
      const crystals = choices(
        'Pay with',
        TM_SETS.map(({ id }) => ({ id, name: crystalName(id).replace('Crystal', 'Crystals'), about: `You have ${points(heroes?.crystals?.[id] ?? 0)}` })),
        set,
        (id) => (scrollSet = id),
      );
      const total = el('p', 'inv-recipe-total');
      total.append('Uses ', crystalIcon(set, 'inv-dust'), el('b', '', points(count * per)), ` ${crystalName(set).replace('Crystal', 'Crystals')} for ${scrollCount(count)}`);
      const go = el('button', 'action main inv-craft-go', max === 0 ? 'Not enough crystals' : `Craft ${points(count)}`);
      go.type = 'button';
      if (max === 0) go.setAttribute('aria-disabled', 'true');
      working(go, busy, `craft:${SCROLL}`);
      go.addEventListener('click', () => void craftScrolls(set, count));
      const note = max === 0 ? [el('p', 'inv-recipe-note', `You need ${crystalCount(set, per - (heroes.crystals?.[set] ?? 0)).replace(' ', ' more ')}, or pick another boss’s: the TechnoMagic Raid drops them, and salvaging TechnoMagic gear gives them.`)] : [];
      panel.replaceChildren(head, each, owned, el('p', 'inv-tm-label', 'Pay with'), crystals, amountRow(max), total, go, ...note);
    }

    /** Crafts `n` Transcendence Scrolls from `set`'s crystals, and shows them. */
    async function craftScrolls(set: TmSetId, n: number): Promise<void> {
      if (busy || n < 1 || n > mostScrolls(set)) return;
      busy = busyWith(`craft:${SCROLL}`);
      host.status(null);
      draw();
      const res = await host.post<HeroesView>('/api/heroes/craft-scroll', { set, count: n });
      busy = null;
      if (!res.ok) {
        if (res.status === 0 || res.error === 'no_crystals') await loadHeroes(true);
        else draw();
        return res.error === 'no_crystals' ? void host.status('You don’t have that many crystals any more.', true) : host.failed(res, 'Could not craft those scrolls. Try again.');
      }
      heroes = res.data;
      host.keep('heroes', res.data);
      count = 1;
      draw();
      host.status(`Crafted ${scrollCount(n)}. Use ${n === 1 ? 'it' : 'them'} on a hero’s Transcend tab on the Heroes page.`);
      const tile: Tile = { id: SCROLL, name: SCROLL_NAME, picture: () => scrollPicture(), grade: 5, full: true, kind: 'Scroll', count: res.data.tpScrolls ?? null, about: SCROLL_ABOUT };
      show([{ id: SCROLL, name: n === 1 ? SCROLL_NAME : `${SCROLL_NAME}s`, face: () => tileSlot({ ...tile, count: n }), detail: (into, close) => tileDetail(into, tile, close) }]);
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
        el('p', 'inv-recipe-group', 'Heroes'),
        scrollTile(),
        el('p', 'inv-recipe-group', 'Runes'),
        ...RUNE_BOXES.map(boxTile),
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
      // What each gave (the same one more than once: how many), a tile each, its count in its corner what was made.
      const got = new Map<string, number>();
      for (const id of crafted) got.set(id, (got.get(id) ?? 0) + 1);
      const nameOf = (id: string): string => view.runes.find((rune) => rune.id === id)?.name ?? id;
      host.status(`Crafted ${points(n)} ${box.name}: ${[...got].map(([id, k]) => (k > 1 ? `${nameOf(id)} ×${k}` : nameOf(id))).join(', ')}. They’re in Runes.`);
      show(
        [...got].flatMap(([id, k]): Revealed[] => {
          const rune = view.runes.find((one) => one.id === id);
          if (!rune) return [];
          const tile = runeTile(rune);
          return [{ id, name: rune.name, face: () => tileSlot({ ...tile, count: k }), detail: (into, close) => tileDetail(into, tile, close) }];
        }),
      );
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
      // (An accessory: any of its four kinds, or the one picked.)
      const kinds =
        way !== 'any' && part === 'accessory'
          ? [el('p', 'inv-tm-label', 'Accessory'), choices('Accessory', [{ id: 'any' as const, name: 'Any' }, ...TM_ACCESSORIES.map((id) => ({ id, name: TM_ACCESSORY_NAME[id] }))], accessory, (id) => (accessory = id))]
          : [];
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
      panel.replaceChildren(head, owned, el('p', 'inv-tm-label', 'Craft'), ways, ...parts, ...kinds, ...classes, total, go, ...note);
    }

    /** Crafts a piece of `set` as picked, and says what came. */
    async function craftTm(set: (typeof TM_SETS)[number]): Promise<void> {
      const price = heroes?.craft?.tm[way];
      if (busy || !heroes || !price || (heroes.crystals?.[set.id] ?? 0) < price.crystals || (host.balance() ?? heroes.balance) < price.points) return;
      busy = busyWith(`craft:${set.id}`);
      host.status(null);
      draw();
      const res = await host.post<HeroesCrafted>('/api/heroes/craft', { set: set.id, kind: way, ...(way !== 'any' && { part }), ...(way === 'exact' && { class: cls }), ...(way !== 'any' && part === 'accessory' && accessory !== 'any' && { accessory }) });
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
      // (Its card as the Hero Gear tab draws it, and its details as that tab's.)
      const copy = view.copies.find((one) => one.id === crafted.copy);
      if (!copy) return;
      if (copy.icon) itemIcons.set(copy.itemId, copy.icon);
      show([
        {
          id: copy.id,
          name: crafted.name,
          face: () => {
            const card = el('span', 'item');
            card.dataset.stars = String(copy.stars);
            card.append(...itemFace(copy));
            return card;
          },
          detail: (into, close) => {
            const { shown: drawn, parts } = heroCopyDetail(view, copy, close);
            showDetail(into, drawn, parts);
          },
        },
      ]);
    }

    function drawPanel(): void {
      if (picked === SCROLL) return drawScroll();
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
      // (komaGems: the heroes page's answer says them too, so it's asked for again, and what's shown waits for it.)
      const fresh = host.load('heroes', true).then((again) => {
        if (again.ok) heroes = again.data;
      });
      count = 1;
      draw();
      host.status(`Crafted ${points(n)} ${n === 1 ? recipe.name : recipe.plural}.${recipe.id === 'komagem' ? '' : ` Use ${n === 1 ? 'it' : 'them'} in the Others tab.`}`);
      if (recipe.id === 'komagem') await fresh;
      const now = shop;
      const tile: Tile = { id: recipe.id, name: n === 1 ? recipe.name : recipe.plural, ...recipe.slot, count: recipe.held(now, heroes), about: recipe.about };
      show([{ id: recipe.id, name: tile.name, face: () => tileSlot({ ...tile, count: n }), detail: (into, close) => tileDetail(into, tile, close) }]);
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
    return { drawn: Promise.all([load(), loadHeroes()]).then(() => undefined), unmount: () => {
        gone = true;
        shown?.close();
      },
    };
  },
};
