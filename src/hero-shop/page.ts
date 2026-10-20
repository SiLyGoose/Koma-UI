import markup from './hero-shop.html?raw';
import { areaCard } from '../databank/heroes';
import { label, recommendedCard } from '../databank/bosses';
import { RECOMMENDED, TEAMMATES } from '../databank/recommended';
import { skillBrief } from '../heroes/briefs';
import { skillRows } from '../heroes/render';
import { className, heroCard, heroPicture, type HeroView, type HeroesView } from '../shared/heroes';
import { el } from '../shared/items';
import { API, busyWith, closeButton, dropdown, fillServers, wheelSideways, working, type Busy } from '../shared/ui';
import { byName, heroFilter, heroShown, NO_HERO_FILTER, type HeroChoice, type HeroFilter } from '../shared/ui/hero-filter/hero-filter';
import { coin, points } from '../shared/util';
import type { ShopTab } from '../shop/tab';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';
import { BOSSES } from '../technomagic/sim/bosses';
import { KR_HEROES } from '../technomagic/sim/heroes/kr';
import type { Line } from '../technomagic/sim/rules';

/*
 * The shop's Heroes tab (../shop/page.ts): a card for each of the TechnoMagic Raid's heroes (the bot's
 * /api/heroes), A to Z, as the Outfits tab's are (its cards and buy box), with the hero's picture, its class, and at
 * the bottom its price, or that it's theirs. The Filter picks a class, a line and a kind of damage, and leaves out the heroes
 * they own until Show owned is on; on bigger screens Front, Middle and Back beside it pick the line at a press (again: any). Pressing one they don't have asks to buy it, for their
 * zeiucoins in the server picked, with what the databank says of it (../databank/heroes.ts: the bosses it's recommended
 * against, its teammates) and its skills in a line each (../heroes/briefs.ts); once theirs, it's geared on the heroes page (../heroes/), where they're
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
  filter: HeroFilter;
  /** Front, Middle and Back, beside the Filter (bigger screens). */
  lines: HTMLButtonElement[];
  empty: HTMLElement;
  list: HTMLElement;
  buy: HTMLElement;
  /** The box in it, which scrolls when the hero says more than fits. */
  buyBox: HTMLElement;
  buyPicture: HTMLImageElement;
  buyTitle: HTMLElement;
  buyKind: HTMLElement;
  buyInfo: HTMLElement;
  buySkills: HTMLElement;
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
      filter: heroFilter($('#hero-filter')),
      lines: lineButtons($('#lines')),
      empty: $('#empty'),
      list: $('#heroes'),
      buy: $('#buy'),
      buyBox: $('.hero-buy-box'),
      buyPicture: $<HTMLImageElement>('#buy-picture'),
      buyTitle: $('#buy-title'),
      buyKind: $('#buy-kind'),
      buyInfo: $('#buy-info'),
      buySkills: $('#buy-skills'),
      buyPrice: $('#buy-price'),
      buyConfirm: $<HTMLButtonElement>('[data-buy="confirm"]'),
    },
    view: null,
    buying: null,
    busy: null,
    choice: NO_HERO_FILTER,
  };
  const { ui } = ctx;
  const choose = (choice: HeroChoice): void => {
    ctx.choice = choice;
    render(ctx);
    // Other heroes: their row from its start.
    ui.list.scrollLeft = 0;
  };
  ui.filter.onChange(choose);
  // A line, pressed: its heroes (the Filter's Position follows); pressed again, any line.
  for (const button of ui.lines) {
    button.addEventListener('click', () => {
      const line = button.dataset.line as Line;
      choose({ ...ctx.choice, line: ctx.choice.line === line ? 'all' : line });
    });
  }
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void load(ctx);
  });

  wheelSideways(ui.list);
  ui.list.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-hero]')?.dataset.hero;
    const hero = ctx.view?.heroes.find((one) => one.id === id);
    if (!hero || ctx.busy || hero.owned) return;
    ctx.buying = hero;
    figure.setAttribute('aria-label', `See ${hero.name}'s picture`);
    renderBuy(ctx);
    ui.buy.hidden = false;
    // Each hero's from its top, not where the last one's was scrolled to.
    ui.buy.scrollTop = 0;
    ui.buyBox.scrollTop = 0;
    ui.buy.focus({ preventScroll: true });
  });

  // The hero's card (on phones, its headshot), pressed, shows its whole picture over the whole box (its X, a click on it or Escape puts it away).
  const figure = ui.buyPicture.parentElement as HTMLElement;
  figure.tabIndex = 0;
  figure.setAttribute('role', 'button');
  const zoom = el('div', 'hero-buy-zoom');
  zoom.hidden = true;
  const whole = el('img');
  whole.alt = '';
  whole.draggable = false;
  const shut = closeButton('Back');
  shut.classList.add('hero-buy-zoom-close');
  zoom.append(whole, shut);
  ui.buyBox.append(zoom);
  const showWhole = (on: boolean, focus = true): void => {
    const hero = ctx.buying;
    if (on && !hero) return;
    if (on && hero) {
      whole.src = heroPicture(hero.id)?.src ?? heroCard(hero.id) ?? '';
      whole.alt = hero.name;
      ui.buyBox.scrollTop = 0;
    }
    zoom.hidden = !on;
    ui.buyBox.classList.toggle('zoomed', on);
    if (focus) (on ? shut : figure).focus({ preventScroll: true });
  };
  figure.addEventListener('click', () => showWhole(true));
  figure.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    showWhole(true);
  });
  zoom.addEventListener('click', () => showWhole(false));

  // The buy box: Buy, or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to the card.
  const closeBuy = (): void => {
    if (ui.buy.hidden) return;
    showWhole(false, false);
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
    if (e.key !== 'Escape') return;
    // Its whole picture first, then the box.
    if (!zoom.hidden) showWhole(false);
    else closeBuy();
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

/** A hero's picture in `img`: King's Raid's own card of it, as its shop shows it (hidden with none); `fallback` shows its initial instead. */
function showCard(img: HTMLImageElement, id: string, fallback?: HTMLElement): void {
  const src = heroCard(id);
  img.hidden = !src;
  if (!src) return;
  img.src = src;
  fallback?.remove();
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
  showCard(picture, hero.id, initial);
  const badge = el('img', 'hero-card-class');
  // King's Raid's own (its shop's round badge, 128px: the gear page's is too small to stay sharp this big).
  badge.src = `/kr/ui/badge-${hero.class}.webp`;
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
  for (const button of ui.lines) button.setAttribute('aria-pressed', String(button.dataset.line === ctx.choice.line));
  ui.balance.hidden = !view;
  ui.list.hidden = !view;
  ui.empty.hidden = true;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  // The Damage group once the bot says what each deals (one from before that doesn't).
  ui.filter.show(ctx.choice, view.heroes.some((hero) => hero.deals));
  const shown = view.heroes.filter((hero) => heroShown(ctx.choice, hero)).sort(byName);
  ui.list.replaceChildren(...shown.map((hero) => card(ctx, hero)));
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
  showCard(ui.buyPicture, buying.id);
  ui.buyTitle.textContent = `Buy ${buying.name}?`;
  if (ui.buy.dataset.hero !== buying.id) {
    ui.buy.dataset.hero = buying.id;
    renderAbout(ui, buying);
  }
  ui.buyPrice.replaceChildren(...price(buying.price, left < 0));
  ui.buyPrice.title = `${points(buying.price)} zeiucoins (you have ${points(view.balance)})`;
  ui.buyConfirm.disabled = left < 0;
  working(ui.buyConfirm, ctx.busy, 'buy');
}

const LINE_NAME = { front: 'Front', middle: 'Middle', back: 'Back' } as const;

/** Front, Middle and Back in `box`, each a choice (render: the one picked pressed). */
function lineButtons(box: HTMLElement): HTMLButtonElement[] {
  const buttons = (Object.keys(LINE_NAME) as Line[]).map((line) => {
    const button = el('button', 'action choice', LINE_NAME[line]);
    button.type = 'button';
    button.dataset.line = line;
    button.setAttribute('aria-pressed', 'false');
    return button;
  });
  box.append(...buttons);
  return buttons;
}

/**
 * What the buy box says of a hero, as the databank's heroes do: its class, line and kind of damage, the raids' bosses it's
 * recommended against and its teammates (King's Raid's own picks thumbed up), and its skills, each in a line.
 */
function renderAbout(ui: Ui, hero: HeroView): void {
  const badge = el('img');
  badge.src = `/kr/ui/badge-${hero.class}.webp`;
  badge.alt = '';
  const line = KR_HEROES[hero.id]?.stand.line;
  ui.buyKind.replaceChildren(badge, [className(hero.class), line && `${LINE_NAME[line]} line`, hero.deals === 'magical' ? 'Magical' : 'Physical'].filter(Boolean).join(' · '));

  ui.buyInfo.textContent = '';
  const areas = BOSSES.filter((boss) => RECOMMENDED[boss.id]?.heroes.includes(hero.id));
  if (areas.length > 0) {
    const grid = el('div', 'db-areas');
    grid.append(...areas.map((boss) => areaCard(boss, RECOMMENDED[boss.id]?.kr.includes(hero.id) ?? false)));
    ui.buyInfo.append(label('Recommended areas of battle'), grid);
  }
  const mates = TEAMMATES[hero.id];
  if (mates && mates.heroes.length > 0) {
    const grid = el('div', 'db-recommended');
    grid.append(...mates.heroes.flatMap((id) => recommendedCard(id, mates.kr.includes(id))));
    ui.buyInfo.append(label('Recommended teammates'), grid);
  }

  const skills = skillRows(
    hero.id,
    hero.abilities.map((skill, i) => ({ ...skill, text: skillBrief(hero.id, i, skill.text) })),
  );
  const list = el('ol', 'skills-list');
  list.append(...skills);
  ui.buySkills.replaceChildren(...(skills.length > 0 ? [label('Skills'), list] : []));
}
