import markup from './raid-shop.html?raw';
import { API, busyWith, dropdown, fillServers } from '../shared/ui';
import type { ShopTab } from '../shop/tab';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { createContext, status, type Asking, type RaidShopContext } from './context';
import { render, renderAsk, renderTimer } from './render';
import type { RaidShopView } from './types';

/*
 * The shop's Raid Gear tab (../shop/page.ts): the raid items on their shelf this week (the bot's
 * /api/raid-shop), a few of each tier, a tile each with its card and what it costs. Pressing one
 * asks to buy a copy of it for their komaGems (what raid wins pay) in the server picked; they can buy as
 * many copies as they can pay for, to refine in the forge (../forge/). The shelf changes with the raid's
 * week, and a few times a week they can pay komaGems for a new one of their own (each dearer than the
 * last). Logged-in members only.
 */

/** A shield, on the shop's rail. */
const ICON = '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" fill="currentColor"/></svg>';

/** How often the time until the shelf changes is said again (and the shelf fetched once it has). */
const TICK_MS = 30_000;

export const raidShopTab: ShopTab = { id: 'raid', label: 'Raid Gear', title: 'Raid Gear · Komaverse', icon: ICON, markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void load(ctx);
  });

  /** Opens the box on what was pressed; closed, it gives the focus back to `from`. */
  let from: HTMLElement | null = null;
  const ask = (asking: Asking, pressed: HTMLElement): void => {
    if (ctx.busy) return;
    ctx.asking = asking;
    from = pressed;
    renderAsk(ctx);
    ui.ask.hidden = false;
    ui.ask.focus();
  };
  // A tile's card or its price button: both ask to buy its item.
  ui.shelf.addEventListener('click', (e) => {
    const pressed = (e.target as HTMLElement).closest<HTMLElement>('button');
    const item = ctx.view?.items.find((i) => i.id === pressed?.closest<HTMLElement>('[data-item]')?.dataset.item);
    if (pressed && item) ask({ kind: 'buy', item }, pressed);
  });
  ui.refresh.addEventListener('click', () => ask({ kind: 'refresh' }, ui.refresh));

  // The box: its button, or Cancel (or Escape, or a click outside it).
  const closeAsk = (): void => {
    if (ui.ask.hidden) return;
    ui.ask.hidden = true;
    // The tiles are drawn again after a buy, and a refresh leaves others in their place: the item's button there now, if any.
    const item = ctx.asking?.kind === 'buy' ? ctx.asking.item.id : null;
    (item ? ui.shelf.querySelector<HTMLElement>(`[data-item="${item}"] .raid-ware-buy`) : from)?.focus();
    ctx.asking = null;
    from = null;
  };
  ui.ask.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-ask]')?.dataset.ask;
    if (action === 'confirm' && ctx.asking) {
      void spend(ctx, ctx.asking).then(closeAsk);
    } else if (action === 'cancel' || e.target === ui.ask) closeAsk();
  });
  ui.ask.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAsk();
  });

  // The time left counts down, and once the week turns the new shelf is fetched (unless they're being asked something).
  const tick = window.setInterval(() => {
    if (!ctx.view) return;
    if (Date.now() >= ctx.view.resetsAt && !ctx.busy && ui.ask.hidden) void load(ctx);
    else renderTimer(ctx);
  }, TICK_MS);

  return {
    drawn: start(ctx),
    unmount: () => {
      window.clearInterval(tick);
      serverPicker.destroy();
    },
  };
}

async function start(ctx: RaidShopContext): Promise<void> {
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
function failed(ctx: RaidShopContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void load(ctx);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'too_poor'
        ? "You don't have enough komaGems for that."
        : res.error === 'no_refreshes'
          ? 'You have no refreshes left this week.'
          : what,
    true,
  );
}

async function load(ctx: RaidShopContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<RaidShopView>(`/api/raid-shop?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, res.status === 404 ? 'The raid shop isn’t open yet.' : 'Could not load the raid gear.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** Does what the box asked about (buys the item, or refreshes the shelf), and draws the tab as it is after. */
async function spend(ctx: RaidShopContext, asking: Asking): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server) return;
  ctx.busy = busyWith('confirm');
  status(ctx, null);
  render(ctx);
  const item = asking.kind === 'buy' ? asking.item : null;
  const res = item
    ? await api<RaidShopView>('/api/raid-shop/buy', { method: 'POST', body: JSON.stringify({ guild: server, item: item.id }) })
    : await api<RaidShopView>('/api/raid-shop/refresh', { method: 'POST', body: JSON.stringify({ guild: server }) });
  ctx.busy = null;
  // It cost komaGems (or the amount shown was old): the header's balances follow.
  void loadMe(true);
  if (!res.ok) {
    render(ctx);
    // What the tab showed was old (the week turned, or it was changed from somewhere else): show what's there now.
    if (res.error === 'not_found' || res.error === 'no_refreshes' || res.error === 'busy') {
      await load(ctx);
      if (item && res.error === 'not_found') status(ctx, `${item.name} isn't on the shelf any more.`, true);
      else if (res.error === 'no_refreshes') status(ctx, 'You have no refreshes left this week.', true);
      return;
    }
    return failed(ctx, res, item ? 'Could not buy that. Try again.' : 'Could not refresh the shelf. Try again.');
  }
  ctx.view = res.data;
  render(ctx);
  if (!item) return;
  status(ctx, `${item.name} is yours! Find it in your `);
  const gear = document.createElement('a');
  gear.href = '/gear/';
  gear.textContent = 'Gear';
  ctx.ui.status.append(gear, '.');
}
