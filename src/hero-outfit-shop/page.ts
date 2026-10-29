import markup from './hero-outfit-shop.html?raw';
import { heroLook, type HeroLook, type HeroOutfitsView, type HeroOutfitView } from '../shared/hero-outfits';
import { el } from '../shared/items';
import { API, busyWith, dropdown, fillServers, wheelSideways, working, type Busy } from '../shared/ui';
import { coin, points } from '../shared/util';
import type { ShopTab } from '../shop/tab';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';
import { HEROES } from '../technomagic/sim/heroes';

/*
 * The shop's Hero Outfits tab (../shop/page.ts), as King's Raid's costume shop: a card for each of the heroes' outfits (King's
 * Raid's costumes: the bot's /api/hero-outfits, ../shared/hero-outfits.ts), its tall King's Raid card filling it, its name at
 * the top, and at the bottom its price, or that it's theirs (on their hero, or not). The hero picker at the top shows their
 * heroes' (to begin with), every hero's, or one hero's. Pressing one they don't have asks to buy it, for their zeiucoins in the
 * server picked (only for a hero of theirs: for another, the way to recruit it), or to try it on in its hero's outfit room
 * (../hero-outfits/), where theirs are put on, and where pressing one of theirs goes. Logged-in members only.
 */

/** A hanger, on the shop's rail. */
const ICON = '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3h2a1 1 0 1 1 1.6.8L11 8.1V10l-8.4 5.6A1.5 1.5 0 0 0 3.4 18.4h17.2a1.5 1.5 0 0 0 .8-2.8L13 10V9.1l.8-.6A3 3 0 0 0 12 3Zm0 9 7.4 4.9H4.6Z" fill="currentColor"/></svg>';

export const heroOutfitShopTab: ShopTab = { id: 'hero-outfits', label: 'Hero Outfits', title: 'Hero Outfits · Komaverse', icon: ICON, markup, mount, prefetch: () => prefetchFor((guild) => `/api/hero-outfits?guild=${guild}`) };

/** The hero picker's choices besides a hero's id: their heroes' outfits, or every hero's. */
const MINE = 'mine';
const ALL = 'all';

interface Ui {
  server: HTMLSelectElement;
  hero: HTMLSelectElement;
  balance: HTMLElement;
  status: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
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
  /** Whose outfits are shown: MINE, ALL, or a hero's id. */
  showing: string;
  /** The outfit the buy box is asking about. */
  buying: HeroOutfitView | null;
  /** A buy on its way (its button: 'buy'). */
  busy: Busy | null;
}

const heroName = (id: string): string => HEROES.find((hero) => hero.id === id)?.name ?? id;

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
  const ctx: Context = {
    ui: {
      server: $<HTMLSelectElement>('#server'),
      hero: $<HTMLSelectElement>('#hero'),
      balance: $('#balance'),
      status: $('#status'),
      list: $('#outfits'),
      empty: $('#empty'),
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
    showing: MINE,
    buying: null,
    busy: null,
  };
  const { ui } = ctx;

  // Their heroes', every hero's, then each hero A to Z.
  const option = (value: string, text: string): HTMLOptionElement => {
    const one = el('option', '', text);
    one.value = value;
    return one;
  };
  ui.hero.replaceChildren(
    option(MINE, 'My heroes'),
    option(ALL, 'All heroes'),
    ...[...HEROES].sort((a, b) => a.name.localeCompare(b.name)).map((hero) => option(hero.id, hero.name)),
  );
  const heroPicker = dropdown(ui.hero);
  ui.hero.addEventListener('change', () => {
    ctx.showing = ui.hero.value;
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
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-outfit]')?.dataset.outfit;
    const outfit = ctx.view?.outfits.find((one) => one.id === id);
    if (!outfit || ctx.busy) return;
    ctx.buying = outfit;
    renderBuy(ctx);
    ui.buy.hidden = false;
    ui.buy.focus();
  });

  // The buy box: Buy (or Try On, or Recruit Hero, both links), or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to the card.
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
      heroPicker.destroy();
      serverPicker.destroy();
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
  // With no heroes of their own, every hero's to begin with.
  if (ctx.showing === MINE && ctx.view.heroes.length === 0) {
    ctx.showing = ALL;
    ctx.ui.hero.value = ALL;
  }
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

/** What a card shows at the bottom: on their hero, theirs, its price (`short` when they can't pay), or its price for a hero they don't have. */
type CardState = 'worn' | 'owned' | 'buy' | 'short' | 'locked';

function stateOf(ctx: Context, outfit: HeroOutfitView): CardState {
  const view = ctx.view;
  if (!view) return 'locked';
  if (view.worn[outfit.hero] === outfit.id) return 'worn';
  if (outfit.owned) return 'owned';
  if (!view.heroes.includes(outfit.hero)) return 'locked';
  return outfit.price <= view.balance ? 'buy' : 'short';
}

/** One outfit's card: its King's Raid card (its hero's initial without one), its name, and at the bottom its price or that it's theirs. */
function card(ctx: Context, outfit: HeroOutfitView, look: HeroLook): HTMLButtonElement {
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
  button.setAttribute('aria-label', `${look.title} (${heroName(outfit.hero)}): ${said}`);
  return button;
}

/** Draws the tab as `ctx.view` has it: their zeiucoins, and a card for each outfit the hero picker leaves. */
function render(ctx: Context): void {
  const { ui, view } = ctx;
  ui.balance.hidden = !view;
  ui.list.hidden = !view;
  ui.empty.hidden = true;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  const shown = view.outfits
    .filter((outfit) => (ctx.showing === ALL ? true : ctx.showing === MINE ? view.heroes.includes(outfit.hero) : outfit.hero === ctx.showing))
    .flatMap((outfit) => {
      const look = heroLook(outfit.hero, outfit.id);
      return look ? [{ outfit, look }] : [];
    });
  ui.list.replaceChildren(...shown.map(({ outfit, look }) => card(ctx, outfit, look)));
  if (shown.length === 0) {
    ui.empty.textContent = ctx.showing === MINE ? 'None of your heroes have outfits yet: pick All heroes to see every one.' : 'That hero has no outfits yet.';
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
  // Try it on (or, theirs, put it on) in its hero's outfit room.
  ui.buyTry.textContent = theirs ? 'Go to Outfits' : 'Try On';
  ui.buyTry.href = `/hero-outfits/?hero=${encodeURIComponent(buying.hero)}&outfit=${encodeURIComponent(buying.id)}`;
  ui.buyConfirm.hidden = theirs || state === 'locked';
  ui.buyConfirm.disabled = state === 'short';
  ui.buyRecruit.hidden = state !== 'locked';
  working(ui.buyConfirm, ctx.busy, 'buy');
}
