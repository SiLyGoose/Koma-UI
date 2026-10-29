import markup from './hero-outfit-shop.html?raw';
import { heroShopCard, lineButtons } from '../hero-shop/card';
import { className } from '../shared/heroes';
import { heroLook, type HeroLook, type HeroOutfitsView, type HeroOutfitView } from '../shared/hero-outfits';
import { el } from '../shared/items';
import { API, busyWith, dropdown, fillServers, wheelSideways, working, type Busy } from '../shared/ui';
import { byName, heroFilter, heroShown, type HeroChoice, type HeroFilter } from '../shared/ui/hero-filter/hero-filter';
import { coin, points } from '../shared/util';
import type { ShopTab } from '../shop/tab';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';
import { HEROES } from '../technomagic/sim/heroes';
import type { Line } from '../technomagic/sim/rules';

/*
 * The shop's Hero Outfits tab (../shop/page.ts): the heroes with outfits (King's Raid's costumes: the bot's /api/hero-outfits,
 * ../shared/hero-outfits.ts) as the Heroes tab lists them (../hero-shop/: its cards, A to Z, its Filter, Front, Middle and
 * Back), every hero shown, theirs too, and Owned heroes beside the lines to show only theirs; at the bottom of each card how
 * many of its outfits are theirs. Pressing one opens its drawer, its outfits in it (each its tall King's Raid card, its name,
 * and its price, or that it's theirs or on it): under the hero's row, a caret up to it, on bigger screens; on phones in the
 * row, which scrolls sideways, beside the hero, pushing the rest along. Pressing it again (or Escape) closes it. Pressing an
 * outfit asks to buy it, for their zeiucoins in the server picked (only for a hero of theirs: for another, the way to recruit
 * it), or to try it on in its hero's outfit room (../hero-outfits/), where theirs are put on. Logged-in members only.
 */

/** A hanger, on the shop's rail. */
const ICON = '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3h2a1 1 0 1 1 1.6.8L11 8.1V10l-8.4 5.6A1.5 1.5 0 0 0 3.4 18.4h17.2a1.5 1.5 0 0 0 .8-2.8L13 10V9.1l.8-.6A3 3 0 0 0 12 3Zm0 9 7.4 4.9H4.6Z" fill="currentColor"/></svg>';

export const heroOutfitShopTab: ShopTab = { id: 'hero-outfits', label: 'Hero Outfits', title: 'Hero Outfits · Komaverse', icon: ICON, markup, mount, prefetch: () => prefetchFor((guild) => `/api/hero-outfits?guild=${guild}`) };

/** The screens the heroes are a row that scrolls sideways on (hero-shop.css), the drawer beside the hero, not under its row. */
const PHONE = '(max-width: 760px)';

/** The Filter as it starts here: every class, line and kind of damage, and every hero (its Show owned not offered: Owned heroes is). */
const EVERY_HERO: HeroChoice = { cls: 'all', line: 'all', deals: 'all', owned: null };

/** A hero with outfits, as the Filter and its card go by it. */
interface ShopHero {
  id: string;
  name: string;
  class: string;
  deals: 'physical' | 'magical';
  owned: boolean;
}

interface Ui {
  server: HTMLSelectElement;
  balance: HTMLElement;
  status: HTMLElement;
  filter: HeroFilter;
  /** Front, Middle and Back, beside the Filter. */
  lines: HTMLButtonElement[];
  /** Owned heroes, after them. */
  owned: HTMLButtonElement;
  cards: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  /** The open hero's outfits: placed in the list by placeDrawer. */
  drawer: HTMLElement;
  buy: HTMLElement;
  buyCard: HTMLImageElement;
  buyTitle: HTMLElement;
  buyHero: HTMLElement;
  buyPrice: HTMLElement;
  buyTry: HTMLAnchorElement;
  buyConfirm: HTMLButtonElement;
  buyRecruit: HTMLAnchorElement;
}

interface Context {
  ui: Ui;
  view: HeroOutfitsView | null;
  /** What the Filter picks. */
  choice: HeroChoice;
  /** Only their heroes (Owned heroes pressed). */
  ownedOnly: boolean;
  /** The hero whose drawer is open. */
  open: string | null;
  /** The outfit the buy box is asking about. */
  buying: HeroOutfitView | null;
  /** A buy on its way (its button: 'buy'). */
  busy: Busy | null;
}

const heroName = (id: string): string => HEROES.find((hero) => hero.id === id)?.name ?? id;

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
  const lines = $('#lines');
  const owned = el('button', 'action choice hos-owned');
  owned.type = 'button';
  owned.setAttribute('aria-pressed', 'false');
  // ("Owned" on the narrowest phones: hero-outfit-shop.css.)
  owned.append(el('span', 'hos-owned-word', 'Owned'), el('span', 'hos-owned-more', ' heroes'));
  const drawer = el('div', 'hos-drawer');
  drawer.id = 'hos-drawer';
  drawer.setAttribute('role', 'region');
  const ctx: Context = {
    ui: {
      server: $<HTMLSelectElement>('#server'),
      balance: $('#balance'),
      status: $('#status'),
      filter: heroFilter($('#hero-filter')),
      lines: lineButtons(lines),
      owned,
      cards: $('.hero-shop-cards'),
      list: $('#heroes'),
      empty: $('#empty'),
      drawer,
      buy: $('#buy'),
      buyCard: $<HTMLImageElement>('#buy-card'),
      buyTitle: $('#buy-title'),
      buyHero: $('#buy-hero'),
      buyPrice: $('#buy-price'),
      buyTry: $<HTMLAnchorElement>('#buy-try'),
      buyConfirm: $<HTMLButtonElement>('[data-buy="confirm"]'),
      buyRecruit: $<HTMLAnchorElement>('#buy-recruit'),
    },
    view: null,
    choice: EVERY_HERO,
    ownedOnly: false,
    open: null,
    buying: null,
    busy: null,
  };
  const { ui } = ctx;
  lines.append(owned);

  const choose = (choice: HeroChoice): void => {
    ctx.choice = choice;
    render(ctx);
    ui.list.scrollLeft = 0;
  };
  ui.filter.onChange(choose);
  for (const button of ui.lines) {
    button.addEventListener('click', () => {
      const line = button.dataset.line as Line;
      choose({ ...ctx.choice, line: ctx.choice.line === line ? 'all' : line });
    });
  }
  owned.addEventListener('click', () => {
    ctx.ownedOnly = !ctx.ownedOnly;
    render(ctx);
    ui.list.scrollLeft = 0;
  });
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void load(ctx);
  });

  wheelSideways(ui.list);
  ui.list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // An outfit in the drawer: the buy box for it.
    const id = target.closest<HTMLElement>('[data-outfit]')?.dataset.outfit;
    if (id) {
      const outfit = ctx.view?.outfits.find((one) => one.id === id);
      if (!outfit || ctx.busy) return;
      ctx.buying = outfit;
      renderBuy(ctx);
      ui.buy.hidden = false;
      ui.buy.focus();
      return;
    }
    // A hero: its drawer opened (or, open, closed).
    const hero = target.closest<HTMLElement>('[data-hero]')?.dataset.hero;
    if (hero) openDrawer(ctx, ctx.open === hero ? null : hero);
  });
  ui.list.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !ctx.open) return;
    const hero = ctx.open;
    openDrawer(ctx, null);
    ui.list.querySelector<HTMLElement>(`[data-hero="${hero}"]`)?.focus();
  });
  // Its row changes as the panel's width does (bigger screens): the drawer put under the hero's row again.
  const resized = new ResizeObserver(() => placeDrawer(ctx));
  resized.observe(ui.cards);
  const phone = matchMedia(PHONE);
  const turned = (): void => placeDrawer(ctx);
  phone.addEventListener('change', turned);

  // The buy box: Buy (or Try On, or Recruit Hero, both links), or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to the outfit.
  const closeBuy = (): void => {
    if (ui.buy.hidden) return;
    ui.buy.hidden = true;
    ui.list.querySelector<HTMLElement>(`[data-outfit="${ctx.buying?.id}"]`)?.focus();
    ctx.buying = null;
  };
  ui.buy.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-buy]')?.dataset.buy;
    if (action === 'confirm' && ctx.buying) void buy(ctx, ctx.buying).then(closeBuy);
    else if (action === 'cancel' || e.target === ui.buy) closeBuy();
  });
  ui.buy.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuy();
  });

  return {
    drawn: start(ctx),
    unmount: () => {
      serverPicker.destroy();
      ui.filter.destroy();
      resized.disconnect();
      phone.removeEventListener('change', turned);
    },
  };
}

function status(ctx: Context, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

async function start(ctx: Context): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await loadMe();
  if (!res.ok) return failed(ctx, res, 'Could not load your servers.');
  if (!currentServer()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = currentMe();
  if (me) fillServers(ctx.ui.server, me.servers, currentServer());
  await load(ctx);
}

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
function failed(ctx: Context, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void load(ctx);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'too_poor'
        ? "You can't afford that."
        : res.error === 'owned'
          ? 'You have that one already.'
          : res.error === 'not_owned'
            ? 'Recruit that hero first.'
            : res.status === 404
              ? 'Hero outfits aren’t in the shop yet.'
              : what,
    true,
  );
}

async function load(ctx: Context): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<HeroOutfitsView>(`/api/hero-outfits?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load the outfits.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** Buys an outfit, and draws the tab as it is after. */
async function buy(ctx: Context, outfit: HeroOutfitView): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server) return;
  ctx.busy = busyWith('buy');
  status(ctx, null);
  render(ctx);
  const res = await api<HeroOutfitsView>('/api/hero-outfits/buy', { method: 'POST', body: JSON.stringify({ guild: server, outfit: outfit.id }) });
  ctx.busy = null;
  // It cost zeiucoins (or the balance shown was old): the header's balances follow.
  void loadMe(true);
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, 'Could not buy that. Try again.');
  }
  ctx.view = res.data;
  render(ctx);
}

/** An amount of zeiucoins: the coin, then the number (`short`: in red, a price that's more than they have). */
const price = (amount: number, short = false): HTMLElement[] => [coin('outfit-coin', 'zeiucoins'), el('span', short ? 'price-short' : '', points(amount))];

/** The heroes with outfits (the bot's), as the Filter goes by them. */
function shopHeroes(view: HeroOutfitsView): ShopHero[] {
  const withOutfits = new Set(view.outfits.map((outfit) => outfit.hero));
  return HEROES.filter((hero) => withOutfits.has(hero.id)).map((hero) => ({ id: hero.id, name: hero.name, class: hero.class, deals: hero.stats.deals, owned: view.heroes.includes(hero.id) }));
}

const outfitsOf = (view: HeroOutfitsView, hero: string): HeroOutfitView[] => view.outfits.filter((outfit) => outfit.hero === hero);

/** One hero's card (../hero-shop/card.ts): at the bottom how many outfits it has, and of theirs how many are theirs. */
function heroCard(ctx: Context, hero: ShopHero): HTMLButtonElement {
  const outfits = outfitsOf(ctx.view as HeroOutfitsView, hero.id);
  const mine = outfits.filter((outfit) => outfit.owned).length;
  const said = hero.owned ? `${mine}/${outfits.length} owned` : `${outfits.length} outfit${outfits.length === 1 ? '' : 's'}`;
  const button = heroShopCard(hero, 'pick', [el('span', 'hos-count', said)], `${hero.name}, ${className(hero.class)}: ${said}`);
  button.setAttribute('aria-expanded', String(ctx.open === hero.id));
  button.setAttribute('aria-controls', ctx.ui.drawer.id);
  return button;
}

/** What an outfit's card shows at the bottom: on their hero, theirs, its price (`short` when they can't pay), or its price for a hero they don't have. */
type CardState = 'worn' | 'owned' | 'buy' | 'short' | 'locked';

function stateOf(ctx: Context, outfit: HeroOutfitView): CardState {
  const view = ctx.view;
  if (!view) return 'locked';
  if (view.worn[outfit.hero] === outfit.id) return 'worn';
  if (outfit.owned) return 'owned';
  if (!view.heroes.includes(outfit.hero)) return 'locked';
  return outfit.price <= view.balance ? 'buy' : 'short';
}

/** One outfit's card in the drawer: its King's Raid card (its hero's initial without one), its name, and at the bottom its price or that it's theirs. */
function outfitCard(ctx: Context, outfit: HeroOutfitView, look: HeroLook): HTMLButtonElement {
  const state = stateOf(ctx, outfit);
  const button = el('button', 'outfit-card hos-card');
  button.type = 'button';
  button.dataset.outfit = outfit.id;
  button.dataset.state = state;

  const art = el('span', 'hos-card-art');
  if (look.card) {
    const picture = el('img', 'hos-card-picture');
    picture.src = look.card;
    picture.alt = '';
    picture.loading = 'lazy';
    picture.draggable = false;
    art.append(picture);
  } else art.append(el('span', 'hos-card-initial', heroName(outfit.hero).slice(0, 1)));

  const foot = el('span', 'outfit-foot');
  if (state === 'worn') foot.append(el('span', 'outfit-check', '✓'), el('span', '', 'Equipped'));
  else if (state === 'owned') foot.append(el('span', 'outfit-check', '✓'), el('span', '', 'Owned'));
  else foot.append(...price(outfit.price, state === 'short'));

  button.append(art, el('span', 'outfit-name hos-card-name', look.title), foot);
  const said = state === 'worn' ? 'equipped' : state === 'owned' ? 'owned' : `${points(outfit.price)} zeiucoins`;
  button.setAttribute('aria-label', `${look.title}: ${said}`);
  return button;
}

/** The drawer's insides, for the open hero: its name and how many of its outfits are theirs, the way to its outfit room, and its outfits. */
function fillDrawer(ctx: Context): void {
  const { ui, view, open } = ctx;
  if (!view || !open) return;
  const name = heroName(open);
  const outfits = outfitsOf(view, open);
  const mine = outfits.filter((outfit) => outfit.owned).length;
  ui.drawer.setAttribute('aria-label', `${name}'s outfits`);
  const head = el('div', 'hos-drawer-head');
  const room = el('a', 'action secondary hos-drawer-room', 'Outfit Room') as HTMLAnchorElement;
  room.href = `/hero-outfits/?hero=${encodeURIComponent(open)}&from=shop`;
  head.append(el('h3', 'hos-drawer-title', `${name}'s Outfits`), el('span', 'hos-drawer-count', view.heroes.includes(open) ? `${mine} of ${outfits.length} owned` : `Recruit ${name} to wear them`), room);
  const list = el('div', 'hos-drawer-list');
  list.append(
    ...outfits.flatMap((outfit) => {
      const look = heroLook(outfit.hero, outfit.id);
      return look ? [outfitCard(ctx, outfit, look)] : [];
    }),
  );
  ui.drawer.replaceChildren(head, list);
}

/**
 * Puts the drawer where the open hero's outfits go: on bigger screens under the last card of its row (the cards are the
 * grid's: it spans its width), its caret under the hero's middle; on phones right after the hero in the row, its caret at its
 * side. Taken out with none open (or the hero not shown).
 */
function placeDrawer(ctx: Context): void {
  const { ui, open } = ctx;
  const hero = open ? ui.list.querySelector<HTMLElement>(`[data-hero="${open}"]`) : null;
  if (!hero) {
    ui.drawer.remove();
    return;
  }
  if (matchMedia(PHONE).matches) {
    if (hero.nextElementSibling !== ui.drawer) hero.after(ui.drawer);
    ui.drawer.style.removeProperty('--caret-x');
    return;
  }
  // (Measured without it in: the cards' rows as they'd be.)
  ui.drawer.remove();
  const cards = [...ui.list.querySelectorAll<HTMLElement>('[data-hero]')];
  const last = cards.filter((card) => card.offsetTop === hero.offsetTop).at(-1) ?? hero;
  last.after(ui.drawer);
  const box = ui.drawer.getBoundingClientRect();
  const at = hero.getBoundingClientRect();
  ui.drawer.style.setProperty('--caret-x', `${at.left + at.width / 2 - box.left}px`);
}

/**
 * Opens the drawer for `hero` (null: closes it), and brings it into view: on phones the row scrolled to start at the hero,
 * its outfits after it.
 */
function openDrawer(ctx: Context, hero: string | null): void {
  ctx.open = hero;
  for (const card of ctx.ui.list.querySelectorAll<HTMLElement>('[data-hero]')) card.setAttribute('aria-expanded', String(card.dataset.hero === hero));
  fillDrawer(ctx);
  placeDrawer(ctx);
  if (!hero) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (matchMedia(PHONE).matches) ctx.ui.list.querySelector<HTMLElement>(`[data-hero="${hero}"]`)?.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
  else ctx.ui.drawer.scrollIntoView({ behavior, block: 'nearest' });
}

/** Draws the tab as `ctx.view` has it: their zeiucoins, a card for each hero the Filter (and Owned heroes) leaves, and the open one's drawer. */
function render(ctx: Context): void {
  const { ui, view } = ctx;
  for (const button of ui.lines) button.setAttribute('aria-pressed', String(button.dataset.line === ctx.choice.line));
  ui.owned.setAttribute('aria-pressed', String(ctx.ownedOnly));
  ui.balance.hidden = !view;
  ui.list.hidden = !view;
  ui.empty.hidden = true;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  ui.filter.show(ctx.choice, true);
  const shown = shopHeroes(view)
    .filter((hero) => heroShown(ctx.choice, hero) && (!ctx.ownedOnly || hero.owned))
    .sort(byName);
  if (ctx.open && !shown.some((hero) => hero.id === ctx.open)) ctx.open = null;
  ui.list.replaceChildren(...shown.map((hero) => heroCard(ctx, hero)));
  fillDrawer(ctx);
  placeDrawer(ctx);
  if (shown.length === 0) {
    ui.empty.textContent = ctx.ownedOnly && view.heroes.length === 0 ? "You don't have any heroes yet: recruit one in the Heroes tab." : 'No heroes match these filters.';
    ui.empty.hidden = false;
  }
  if (ctx.buying) renderBuy(ctx);
}

/** The buy box, for `ctx.buying`: its card, whose it is, what it costs (in red when that's more than they have), and what can be done. */
function renderBuy(ctx: Context): void {
  const { ui, view, buying } = ctx;
  if (!view || !buying) return;
  const look = heroLook(buying.hero, buying.id);
  const state = stateOf(ctx, buying);
  const theirs = state === 'owned' || state === 'worn';
  ui.buyCard.hidden = !look?.card;
  if (look?.card) ui.buyCard.src = look.card;
  ui.buyTitle.textContent = theirs ? (look?.title ?? buying.id) : `Buy ${look?.title ?? buying.id}?`;
  ui.buyHero.textContent = `${heroName(buying.hero)}'s outfit`;
  ui.buyPrice.hidden = theirs;
  ui.buyPrice.replaceChildren(...price(buying.price, buying.price > view.balance));
  ui.buyPrice.title = `${points(buying.price)} zeiucoins (you have ${points(view.balance)})`;
  // Try it on (or, theirs, put it on) in its hero's outfit room (?from=shop: its Back comes back here).
  ui.buyTry.textContent = theirs ? 'Go to Outfits' : 'Try On';
  ui.buyTry.href = `/hero-outfits/?hero=${encodeURIComponent(buying.hero)}&outfit=${encodeURIComponent(buying.id)}&from=shop`;
  ui.buyConfirm.hidden = theirs || state === 'locked';
  ui.buyConfirm.disabled = state === 'short';
  ui.buyRecruit.hidden = state !== 'locked';
  working(ui.buyConfirm, ctx.busy, 'buy');
}
