import markup from './hero-outfits.html?raw';
import { heroLooks, type HeroLook, type HeroOutfitsView } from '../shared/hero-outfits';
import { el } from '../shared/items';
import { API, busyWith, dropdown, fillServers, working, type Busy, type Dropdown } from '../shared/ui';
import { coin, points } from '../shared/util';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer } from '../site/session';
import { HEROES } from '../technomagic/sim/heroes';
import type { Showcase } from '../heroes/model';

/*
 * A hero's outfit room, as King's Raid's Costume screen (its HeroCostumeView): the hero standing whole in the middle, in
 * the look picked (its model, ../heroes/model.ts, turned by dragging it); down the left its looks, its own first and then
 * its outfits (King's Raid's costumes: ../shared/hero-outfits.ts), each a row with its battle portrait, its name in yellow
 * and, on a dark band, whether it's on, theirs, or its price; along the bottom the one picked's name and what it costs,
 * and Equip (theirs), Buy (not yet: for their zeiucoins, asked first), or, a hero they don't own, the way to recruit it.
 * Any look can be picked, to try it on. The hero is the address's (?hero=, the heroes page's Outfits button; ?outfit=, the
 * shop's Try On, picks one of its looks), picked again from all of them at the top. What each wears is the bot's (/api/hero-outfits), and the raid fights it in that.
 * Logged-in members only.
 */

export const heroOutfitsPage: Page = { title: 'Outfits · Komaverse', icon: '👘', markup, mount, prefetch: () => prefetchFor((guild) => `/api/hero-outfits?guild=${guild}`) };

interface Ui {
  back: HTMLAnchorElement;
  hero: HTMLSelectElement;
  server: HTMLSelectElement;
  balance: HTMLElement;
  status: HTMLElement;
  room: HTMLElement;
  card: HTMLImageElement;
  model: HTMLCanvasElement;
  list: HTMLElement;
  name: HTMLElement;
  state: HTMLElement;
  equip: HTMLButtonElement;
  buy: HTMLButtonElement;
  recruit: HTMLAnchorElement;
  confirm: HTMLElement;
  confirmCard: HTMLImageElement;
  confirmTitle: HTMLElement;
  confirmPrice: HTMLElement;
  confirmBuy: HTMLButtonElement;
}

interface Context {
  ui: Ui;
  view: HeroOutfitsView | null;
  /** The hero whose outfits these are. */
  hero: string;
  /** The look picked (its skin's name): the one it wears, to begin with. */
  picked: string | null;
  /** A buy or an equip on its way (its button: 'buy', 'equip'). */
  busy: Busy | null;
  /** The hero on the stage, once three.js is read (null: it can't be: its card stays). */
  showcase: Promise<Showcase | null> | null;
  /** The hero picker, drawn again as the hero changes. */
  heroPicker: Dropdown | null;
}

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate: (url: URL) => void } {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const ctx: Context = {
    ui: {
      back: $('back'),
      hero: $('hero'),
      server: $('server'),
      balance: $('balance'),
      status: $('status'),
      room: $('room'),
      card: $('card'),
      model: $('model'),
      list: $('list'),
      name: $('name'),
      state: $('state'),
      equip: $('equip'),
      buy: $('buy'),
      recruit: $('recruit'),
      confirm: $('confirm'),
      confirmCard: $('confirm-card'),
      confirmTitle: $('confirm-title'),
      confirmPrice: $('confirm-price'),
      confirmBuy: root.querySelector('[data-confirm="buy"]') as HTMLButtonElement,
    },
    view: null,
    hero: heroAt(new URL(location.href)),
    // (The shop's Try On names the outfit.)
    picked: new URL(location.href).searchParams.get('outfit'),
    busy: null,
    showcase: null,
    heroPicker: null,
  };
  const { ui } = ctx;

  // Every hero, A to Z, to pick whose outfits.
  ui.hero.replaceChildren(
    ...[...HEROES]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((hero) => {
        const option = el('option', '', hero.name);
        option.value = hero.id;
        return option;
      }),
  );
  ui.hero.hidden = false;
  const heroPicker: Dropdown = dropdown(ui.hero);
  ctx.heroPicker = heroPicker;
  ui.hero.addEventListener('change', () => {
    pickHero(ctx, ui.hero.value);
    history.replaceState(history.state, '', `/hero-outfits/?hero=${encodeURIComponent(ctx.hero)}`);
  });
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    ctx.picked = null;
    void load(ctx);
  });

  ui.list.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-look]')?.dataset.look;
    if (!id || id === ctx.picked) return;
    ctx.picked = id;
    render(ctx);
    ui.list.querySelector<HTMLElement>(`[data-look="${id}"]`)?.focus();
  });
  // Up and down the list with the arrow keys, as a listbox goes.
  ui.list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const looks = heroLooks(ctx.hero);
    const at = looks.findIndex((look) => look.id === ctx.picked);
    const next = looks[Math.max(0, Math.min(looks.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (!next) return;
    e.preventDefault();
    ctx.picked = next.id;
    render(ctx);
    ui.list.querySelector<HTMLElement>(`[data-look="${next.id}"]`)?.focus();
  });
  ui.equip.addEventListener('click', () => void equip(ctx));
  ui.buy.addEventListener('click', () => openConfirm(ctx));

  // The buy box: Buy, or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to Buy.
  const closeConfirm = (): void => {
    if (ui.confirm.hidden) return;
    ui.confirm.hidden = true;
    if (!ui.buy.hidden) ui.buy.focus();
  };
  ui.confirm.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-confirm]')?.dataset.confirm;
    if (action === 'buy') void buy(ctx).then(closeConfirm);
    else if (action === 'cancel' || e.target === ui.confirm) closeConfirm();
  });
  ui.confirm.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeConfirm();
  });

  // Dragged across, the hero turns (a full turn for the stage's width and a half).
  let dragging: { pointer: number; x: number } | null = null;
  ui.model.addEventListener('pointerdown', (e) => {
    dragging = { pointer: e.pointerId, x: e.clientX };
    ui.model.setPointerCapture(e.pointerId);
  });
  ui.model.addEventListener('pointermove', (e) => {
    if (!dragging || dragging.pointer !== e.pointerId) return;
    const by = ((e.clientX - dragging.x) / Math.max(1, ui.model.clientWidth * 1.5)) * Math.PI * 2;
    dragging.x = e.clientX;
    void ctx.showcase?.then((showcase) => showcase?.turn(by));
  });
  const drop = (): void => {
    dragging = null;
  };
  ui.model.addEventListener('pointerup', drop);
  ui.model.addEventListener('pointercancel', drop);

  return {
    drawn: start(ctx),
    unmount: () => {
      heroPicker.destroy();
      serverPicker.destroy();
      void ctx.showcase?.then((showcase) => showcase?.destroy());
    },
    navigate: (url) => {
      pickHero(ctx, heroAt(url));
      const outfit = url.searchParams.get('outfit');
      if (outfit && outfit !== ctx.picked) {
        ctx.picked = outfit;
        render(ctx);
      }
    },
  };
}

/** The hero an address is for (?hero=): the first, A to Z, for one there isn't. */
function heroAt(url: URL): string {
  const id = url.searchParams.get('hero');
  return HEROES.some((hero) => hero.id === id) ? (id as string) : ([...HEROES].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? '');
}

/** Shows another hero's outfits, the one it wears picked. */
function pickHero(ctx: Context, hero: string): void {
  if (hero === ctx.hero) return;
  ctx.hero = hero;
  ctx.picked = null;
  render(ctx);
  ctx.ui.list.scrollTop = 0;
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
            ? "That isn't yours yet."
            : res.status === 404
              ? 'Hero outfits aren’t open yet.'
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

/** What one of the hero's looks is to them: on it, theirs, theirs to buy, or neither (the hero isn't theirs). */
type LookState = 'worn' | 'owned' | 'buy' | 'short' | 'locked';

/** The outfit the hero wears (its skin's name): its own look's for none. */
const wornBy = (ctx: Context): string => ctx.view?.worn[ctx.hero] ?? heroLooks(ctx.hero)[0]?.id ?? '';

function stateOf(ctx: Context, look: HeroLook): LookState {
  const view = ctx.view;
  if (!view) return 'locked';
  // (A hero not theirs wears nothing of theirs: every look of it to try on only.)
  if (!view.heroes.includes(ctx.hero)) return 'locked';
  if (look.id === wornBy(ctx)) return 'worn';
  if (look.skin === 0) return 'owned';
  const outfit = view.outfits.find((one) => one.id === look.id);
  if (outfit?.owned) return 'owned';
  if (!outfit) return 'locked';
  return outfit.price <= view.balance ? 'buy' : 'short';
}

const priceOf = (ctx: Context, look: HeroLook): number => ctx.view?.outfits.find((one) => one.id === look.id)?.price ?? 0;

/** An amount of zeiucoins: the coin, then the number (`short`: in red, a price that's more than they have). */
const price = (amount: number, short = false): HTMLElement[] => [coin('outfit-coin', 'zeiucoins'), el('span', short ? 'price-short' : '', points(amount))];

/** What a row or the foot says of a look: on, theirs, or its price (its own look, the hero not theirs: nothing). */
function stateLine(box: HTMLElement, ctx: Context, look: HeroLook, state: LookState): void {
  box.dataset.state = state;
  if (state === 'worn') box.replaceChildren(el('span', 'ho-check', '✓'), el('span', '', 'Equipped'));
  else if (state === 'owned') box.replaceChildren(el('span', '', 'Owned'));
  else if (look.skin === 0) box.replaceChildren();
  else box.replaceChildren(...price(priceOf(ctx, look), state === 'short'));
}

/** One look's row: its battle portrait (or icon, or card), its name in yellow, and on a dark band what it is to them. */
function row(ctx: Context, look: HeroLook): HTMLButtonElement {
  const state = stateOf(ctx, look);
  const button = el('button', 'ho-row');
  button.type = 'button';
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', String(look.id === ctx.picked));
  button.tabIndex = look.id === ctx.picked ? 0 : -1;
  button.dataset.look = look.id;
  button.dataset.state = state;

  const picture = el('img', 'ho-row-picture');
  picture.src = look.battle ?? look.icon ?? look.card ?? '';
  picture.alt = '';
  picture.loading = 'lazy';
  picture.draggable = false;
  picture.hidden = !picture.src;
  const art = el('span', 'ho-row-art');
  art.append(picture);

  const line = el('span', 'ho-row-state');
  stateLine(line, ctx, look, state);
  button.append(art, el('span', 'ho-row-name', look.title), line);
  return button;
}

/** Draws the room for the hero as `ctx.view` has it: its looks, the one picked on the stage, and what can be done with it. */
function render(ctx: Context): void {
  const { ui, view } = ctx;
  const looks = heroLooks(ctx.hero);
  const name = HEROES.find((hero) => hero.id === ctx.hero)?.name ?? ctx.hero;
  if (ui.hero.value !== ctx.hero) {
    ui.hero.value = ctx.hero;
    ctx.heroPicker?.refresh();
  }
  ui.back.href = `/heroes/?hero=${encodeURIComponent(ctx.hero)}`;
  document.title = `${name}'s Outfits · Komaverse`;
  ui.balance.hidden = !view;
  ui.room.hidden = !view || looks.length === 0;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  if (!ctx.picked || !looks.some((look) => look.id === ctx.picked)) ctx.picked = wornBy(ctx);
  const picked = looks.find((look) => look.id === ctx.picked) ?? looks[0];
  if (!picked) return;

  ui.list.replaceChildren(...looks.map((look) => row(ctx, look)));
  showLook(ctx, picked);

  const state = stateOf(ctx, picked);
  ui.name.textContent = picked.title;
  stateLine(ui.state, ctx, picked, state);
  if (state === 'locked') ui.state.textContent = view.heroes.includes(ctx.hero) ? '' : `Recruit ${name} to wear it`;
  // Equip: theirs, not on (on: said, not pressed); Buy: theirs to buy; neither, the hero not theirs: to the shop.
  ui.equip.hidden = state !== 'owned' && state !== 'worn';
  ui.equip.disabled = state === 'worn';
  ui.equip.textContent = state === 'worn' ? 'Equipped' : 'Equip';
  ui.buy.hidden = state !== 'buy' && state !== 'short';
  ui.buy.disabled = state === 'short';
  ui.recruit.hidden = state !== 'locked' || view.heroes.includes(ctx.hero);
  working(ui.equip, ctx.busy, 'equip');
  working(ui.buy, ctx.busy, 'buy');
  if (!ui.confirm.hidden) renderConfirm(ctx);
}

/** The look picked on the stage: its model (read once three.js is), its card till then and where it can't be. */
function showLook(ctx: Context, look: HeroLook): void {
  const { ui } = ctx;
  const key = `${look.hero}:${look.skin}`;
  if (ui.model.dataset.look === key) return;
  ui.model.dataset.look = key;
  ui.room.classList.remove('modelled');
  ui.card.hidden = !look.card;
  if (look.card) ui.card.src = look.card;
  ctx.showcase ??= import('../heroes/model')
    .then(({ makeShowcase }) => makeShowcase(ui.model, { whole: true }))
    .catch((error: unknown) => {
      console.warn(error);
      return null;
    });
  void ctx.showcase
    .then((showcase) => showcase?.show(look.hero, look.skin) ?? false)
    .catch((error: unknown) => {
      console.warn(error);
      return false;
    })
    .then((shown) => {
      if (shown && ui.model.dataset.look === key) ui.room.classList.add('modelled');
    });
}

function openConfirm(ctx: Context): void {
  if (ctx.busy) return;
  renderConfirm(ctx);
  ctx.ui.confirm.hidden = false;
  ctx.ui.confirm.focus();
}

/** The buy box, for the look picked: its card, and what it costs (in red when that's more than they have: nothing to press). */
function renderConfirm(ctx: Context): void {
  const { ui, view } = ctx;
  const look = heroLooks(ctx.hero).find((one) => one.id === ctx.picked);
  if (!view || !look) return;
  const cost = priceOf(ctx, look);
  ui.confirmCard.hidden = !look.card;
  if (look.card) ui.confirmCard.src = look.card;
  ui.confirmTitle.textContent = `Buy ${look.title}?`;
  ui.confirmPrice.replaceChildren(...price(cost, cost > view.balance));
  ui.confirmPrice.title = `${points(cost)} zeiucoins (you have ${points(view.balance)})`;
  ui.confirmBuy.disabled = cost > view.balance;
  working(ui.confirmBuy, ctx.busy, 'buy');
}

/** Asks the bot to buy or put on the look picked, and draws the room as it is after. */
async function change(ctx: Context, action: 'buy' | 'equip'): Promise<void> {
  const server = currentServer();
  const look = heroLooks(ctx.hero).find((one) => one.id === ctx.picked);
  if (ctx.busy || !server || !look) return;
  ctx.busy = busyWith(action);
  status(ctx, null);
  render(ctx);
  const body = action === 'buy' ? { guild: server, outfit: look.id } : { guild: server, hero: ctx.hero, outfit: look.skin === 0 ? null : look.id };
  const res = await api<HeroOutfitsView>(`/api/hero-outfits/${action === 'buy' ? 'buy' : 'wear'}`, { method: 'POST', body: JSON.stringify(body) });
  ctx.busy = null;
  // A buy cost zeiucoins (or the balance shown was old): the header's balances follow.
  if (action === 'buy') void loadMe(true);
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, action === 'buy' ? 'Could not buy that. Try again.' : 'Could not put that on. Try again.');
  }
  ctx.view = res.data;
  render(ctx);
}

const buy = (ctx: Context): Promise<void> => change(ctx, 'buy');
const equip = (ctx: Context): Promise<void> => change(ctx, 'equip');
