import markup from './hero-shop.html?raw';
import { classBadge, className, heroCut, SHOP_BUST, type HeroView, type HeroesView } from '../shared/heroes';
import { el } from '../shared/items';
import { API, busyWith, dropdown, fillServers, working, type Busy } from '../shared/ui';
import { byName, heroFilter, heroShown, NO_HERO_FILTER, type HeroChoice, type HeroFilter } from '../shared/ui/hero-filter/hero-filter';
import { coin, points } from '../shared/util';
import type { ShopTab } from '../shop/tab';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';

/*
 * The shop's Heroes tab (../shop/page.ts): a card for each of the TechnoMagic Raid's heroes (the bot's
 * /api/heroes), A to Z, as the Outfits tab's are (its cards and buy box), with the hero's picture, its class, and at
 * the bottom its price, or that it's theirs. The Filter picks a class and a kind of damage, and leaves out the heroes
 * they own until Show owned is on. Pressing one they don't have asks to buy it, for their
 * zeiucoins in the server picked; once theirs, it's geared on the heroes page (../heroes/), where they're
 * sent. Logged-in members only.
 */

/** A crossed sword and staff, on the shop's rail. */
const ICON =
  '<svg viewBox="0 0 24 24"><path d="M4 3h3l9 9-1.5 1.5L5.5 4.5 4 6Zm16 0v3l-9 9-1.5-1.5 9-9ZM6.6 14.2l3.2 3.2-1.4 1.4-1-1-2.4 2.4H3.6v-1.4L6 16.4l-1-1Zm10.8 0 1.4 1.4-1 1 2.4 2.4V20.4h-1.4L16.4 18l-1 1-1.4-1.4Z" fill="currentColor"/></svg>';

export const heroShopTab: ShopTab = { id: 'heroes', label: 'Heroes', title: 'Heroes · Komaverse', icon: ICON, markup, mount, prefetch: () => prefetchFor((guild) => `/api/heroes?guild=${guild}`) };

interface Ui {
  server: HTMLSelectElement;
  balance: HTMLElement;
  status: HTMLElement;
  tools: HTMLElement;
  filter: HeroFilter;
  empty: HTMLElement;
  list: HTMLElement;
  buy: HTMLElement;
  buyPicture: HTMLImageElement;
  buyTitle: HTMLElement;
  buyPrice: HTMLElement;
  buyConfirm: HTMLButtonElement;
}

interface Context {
  ui: Ui;
  view: HeroesView | null;
  /** The hero the buy box is asking about. */
  buying: HeroView | null;
  /** A buy on its way (its button: 'buy'). */
  busy: Busy | null;
  /** What the Filter picks. */
  choice: HeroChoice;
}

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
  const ctx: Context = {
    ui: {
      server: $<HTMLSelectElement>('#server'),
      balance: $('#balance'),
      status: $('#status'),
      tools: $('#tools'),
      filter: heroFilter($('#hero-filter')),
      empty: $('#empty'),
      list: $('#heroes'),
      buy: $('#buy'),
      buyPicture: $<HTMLImageElement>('#buy-picture'),
      buyTitle: $('#buy-title'),
      buyPrice: $('#buy-price'),
      buyConfirm: $<HTMLButtonElement>('[data-buy="confirm"]'),
    },
    view: null,
    buying: null,
    busy: null,
    choice: NO_HERO_FILTER,
  };
  const { ui } = ctx;
  ui.filter.onChange((choice) => {
    ctx.choice = choice;
    render(ctx);
  });
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void load(ctx);
  });

  ui.list.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-hero]')?.dataset.hero;
    const hero = ctx.view?.heroes.find((one) => one.id === id);
    if (!hero || ctx.busy || hero.owned) return;
    ctx.buying = hero;
    renderBuy(ctx);
    ui.buy.hidden = false;
    ui.buy.focus();
  });

  // The buy box: Buy, or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to the card.
  const closeBuy = (): void => {
    if (ui.buy.hidden) return;
    ui.buy.hidden = true;
    ui.list.querySelector<HTMLElement>(`[data-hero="${ctx.buying?.id}"]`)?.focus();
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
  if (res.status === 0) return void load(ctx);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'too_poor'
        ? "You can't afford that."
        : res.error === 'owned'
          ? 'That hero is yours already.'
          : res.status === 404
            ? 'Heroes aren’t in the shop yet.'
            : what,
    true,
  );
}

async function load(ctx: Context): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load the heroes.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** Buys a hero, and draws the tab as it is after. */
async function buy(ctx: Context, hero: HeroView): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server) return;
  ctx.busy = busyWith('buy');
  status(ctx, null);
  render(ctx);
  const res = await api<HeroesView>('/api/heroes/buy', { method: 'POST', body: JSON.stringify({ guild: server, hero: hero.id }) });
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

/** A hero's bust in `img` once it's cut (hidden with none); `fallback` shows its initial instead. */
function showBust(img: HTMLImageElement, id: string, fallback?: HTMLElement): void {
  img.hidden = true;
  void heroCut(id, SHOP_BUST, 360).then((src) => {
    if (src) {
      img.src = src;
      img.hidden = false;
      fallback?.remove();
    }
  });
}

/** One hero's card: its picture and class badge, its name, and at the bottom its price or that it's theirs. */
function card(ctx: Context, hero: HeroView): HTMLButtonElement {
  const state = hero.owned ? 'owned' : hero.price <= (ctx.view?.balance ?? 0) ? 'buy' : 'short';
  const button = el('button', 'outfit-card hero-card');
  button.type = 'button';
  button.dataset.hero = hero.id;
  button.dataset.state = state;
  if (state === 'owned') button.setAttribute('aria-disabled', 'true');

  const art = el('span', 'hero-card-art');
  const initial = el('span', 'hero-card-initial', hero.name.slice(0, 1));
  const picture = el('img', 'hero-card-picture');
  picture.alt = '';
  picture.draggable = false;
  art.append(initial, picture);
  showBust(picture, hero.id, initial);
  const badge = el('img', 'hero-card-class');
  badge.src = classBadge(hero.class);
  badge.alt = '';
  badge.title = className(hero.class);
  art.append(badge);

  const name = el('span', 'outfit-name', hero.name);

  const foot = el('span', 'outfit-foot');
  if (state === 'owned') foot.append(el('span', 'outfit-check', '✓'), el('span', '', 'Owned'));
  else foot.append(...price(hero.price));

  button.append(art, name, foot);
  button.setAttribute('aria-label', state === 'owned' ? `${hero.name}: owned` : `${hero.name}, ${className(hero.class)}: ${points(hero.price)} zeiucoins`);
  return button;
}

function render(ctx: Context): void {
  const { ui, view } = ctx;
  ui.balance.hidden = !view;
  ui.list.hidden = !view;
  ui.empty.hidden = true;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  // The Damage group once the bot says what each deals (one from before that doesn't).
  ui.filter.show(ctx.choice, view.heroes.some((hero) => hero.deals));
  const shown = view.heroes.filter((hero) => heroShown(ctx.choice, hero)).sort(byName);
  // The cards after the Filter's row, which stays (so a choice in it keeps its focus).
  while (ui.list.lastChild && ui.list.lastChild !== ui.tools) ui.list.lastChild.remove();
  ui.list.append(...shown.map((hero) => card(ctx, hero)));
  if (shown.length === 0 && view.heroes.length > 0) {
    // Only those they own left out, or the class and damage too.
    const owned = view.heroes.some((hero) => heroShown({ ...ctx.choice, owned: true }, hero));
    ui.empty.textContent = owned ? 'You own every hero here: turn on Show owned in the Filter to see them.' : 'No heroes match these filters.';
    ui.empty.hidden = false;
  }
  if (ctx.buying) renderBuy(ctx);
}

/** The buy box, for `ctx.buying`: what it costs, in red when that's more than they have (and then nothing to press). */
function renderBuy(ctx: Context): void {
  const { ui, view, buying } = ctx;
  if (!view || !buying) return;
  const left = view.balance - buying.price;
  showBust(ui.buyPicture, buying.id);
  ui.buyTitle.textContent = `Buy ${buying.name}?`;
  ui.buyPrice.replaceChildren(...price(buying.price, left < 0));
  ui.buyPrice.title = `${points(buying.price)} zeiucoins (you have ${points(view.balance)})`;
  ui.buyConfirm.disabled = left < 0;
  working(ui.buyConfirm, ctx.busy, 'buy');
}
