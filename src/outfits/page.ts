import markup from './outfits.html?raw';
import { API, dropdown, fillServers } from '../shared/ui';
import type { ShopTab } from '../shop/tab';
import type { Outfit, OutfitsView } from '../shared/outfits';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { createContext, status, type OutfitsContext } from './context';
import { render, renderBuy } from './render';

/*
 * The shop's Outfits tab (../shop/page.ts), as King's Raid's costume shop: a card for each outfit (the
 * bot's /api/outfits), with its character standing in it, its name, and at the bottom its price, or that
 * it's theirs. Pressing one they don't have asks to buy it, for their zeiucoins in the server picked.
 * Only buying: they put outfits on in the dressing room (../dressing/), where they're sent to try a new
 * one. Logged-in members only.
 */

/** A shirt, on the shop's rail (as on the gear page's Outfits button). */
const ICON = '<svg viewBox="0 0 24 24"><path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z" fill="currentColor"/></svg>';

export const outfitsTab: ShopTab = { id: 'outfits', label: 'Outfits', title: 'Outfits · Komaverse', icon: ICON, markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void load(ctx);
  });

  ui.list.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-outfit]')?.dataset.outfit;
    const outfit = ctx.view?.outfits.find((o) => o.id === id);
    if (!outfit || ctx.busy || outfit.owned) return;
    ctx.buying = outfit;
    renderBuy(ctx);
    ui.buy.hidden = false;
    ui.buy.focus();
  });

  // The buy box: Buy, or Cancel (or Escape, or a click outside it). Closed, it gives the focus back to the card.
  const closeBuy = (): void => {
    if (ui.buy.hidden) return;
    ui.buy.hidden = true;
    ui.list.querySelector<HTMLElement>(`[data-outfit="${ctx.buying?.id}"]`)?.focus();
    ctx.buying = null;
  };
  ui.buy.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-buy]')?.dataset.buy;
    if (action === 'confirm' && ctx.buying) {
      void buy(ctx, ctx.buying).then(closeBuy);
    } else if (action === 'cancel' || e.target === ui.buy) closeBuy();
  });
  ui.buy.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuy();
  });

  return {
    drawn: start(ctx),
    unmount: () => serverPicker.destroy(),
  };
}

async function start(ctx: OutfitsContext): Promise<void> {
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
function failed(ctx: OutfitsContext, res: { status: number; error: string }, what: string): void {
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
            ? "That one isn't yours yet."
            : res.status === 404
              ? 'Outfits aren’t in the shop yet.'
              : what,
    true,
  );
}

async function load(ctx: OutfitsContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<OutfitsView>(`/api/outfits?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load the outfits.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** Buys an outfit, draws the tab as it is after, and points them to the dressing room to put it on. */
async function buy(ctx: OutfitsContext, outfit: Outfit): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server) return;
  ctx.busy = true;
  status(ctx, null);
  render(ctx);
  const res = await api<OutfitsView>('/api/outfits/buy', { method: 'POST', body: JSON.stringify({ guild: server, outfit: outfit.id }) });
  ctx.busy = false;
  // It cost zeiucoins (or the balance shown was old): the header's balances follow.
  void loadMe(true);
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, 'Could not buy that. Try again.');
  }
  ctx.view = res.data;
  render(ctx);
  status(ctx, `${outfit.name} is yours! Put it on in the `);
  const room = document.createElement('a');
  room.href = '/dressing-room/';
  room.textContent = 'Dressing Room';
  ctx.ui.status.append(room, '.');
}
