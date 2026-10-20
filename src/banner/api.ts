import { busyWith } from '../shared/ui';
import { api, currentServer, loadMe, logOut } from '../site/session';
import { bannersFor, STANDARD, type Banner } from './banners';
import { status, type BannerContext } from './context';
import { render, renderHistory } from './render';
import type { BannerResult, BannerView, PullHistory } from './types';
import { playWish } from './wish';

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
export function failed(ctx: BannerContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a pull ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void loadBanner(ctx);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'too_poor'
        ? "You can't afford that."
        : res.error === 'closed'
          ? 'The limited banner has closed.'
        : res.status === 404
          ? 'Pulling on the site isn’t open yet. Use `gacha` in Discord for now.'
          : what,
    true,
  );
}

const viewPath = (server: string, banner: Banner['id']): string => `/api/gacha?guild=${encodeURIComponent(server)}&banner=${banner}`;

/** Loads the banner showing afresh (the server picked, or its first load), then the other banners' views behind it, so their tabs open at once. */
export async function loadBanner(ctx: BannerContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  ctx.views = {};
  const res = await api<BannerView>(viewPath(server, ctx.banner.id));
  if (!res.ok) return failed(ctx, res, 'Could not load the banner.');
  if (!show(ctx, res.data)) return loadBanner(ctx);
  status(ctx, null);
  render(ctx);
  for (const banner of ctx.banners) {
    if (banner.id === ctx.banner.id) continue;
    void api<BannerView>(viewPath(server, banner.id)).then((other) => {
      // Kept only if nothing newer came meanwhile (another server picked, or a pull's view).
      if (other.ok && currentServer() === server && ctx.view === res.data) ctx.views[banner.id] = other.data;
    });
  }
}

const historyPath = (server: string, banner: Banner['id'], page: number): string =>
  `/api/gacha/history?guild=${encodeURIComponent(server)}&banner=${banner}&page=${page}`;

/** Shows a page of their pulls on a banner in History (1: the newest), as the bot has it now. The page shown stays till it comes. */
export async function loadHistory(ctx: BannerContext, banner: Banner['id'], page: number): Promise<void> {
  const server = currentServer();
  if (!server) return;
  // (Another banner: its first page's rows aren't the last one's, so none are shown meanwhile.)
  const data = banner === ctx.history.banner ? ctx.history.data : null;
  ctx.history = { banner, page, data, loading: true, error: null };
  renderHistory(ctx);
  const res = await api<PullHistory>(historyPath(server, banner, page));
  // Another page or banner asked for meanwhile: that one's answer is the one shown.
  if (ctx.history.banner !== banner || ctx.history.page !== page) return;
  if (!res.ok && res.status === 401) return logOut();
  ctx.history = res.ok
    ? { banner, page: res.data.page, data: res.data, loading: false, error: null }
    : { banner, page, data, loading: false, error: res.status === 404 ? 'Pull history isn’t open yet.' : 'Could not load your pulls. Try again.' };
  renderHistory(ctx);
}

/** Shows another banner (its tab picked): at once from the view kept of it, or by asking the bot when there is none. */
export function pickBanner(ctx: BannerContext, banner: Banner): void {
  ctx.banner = banner;
  const kept = ctx.views[banner.id];
  if (!kept) return void loadBanner(ctx);
  ctx.view = kept;
  render(ctx);
}

/**
 * Takes a view from the bot: the banners it offers now, and the one showing as it has it. What every
 * banner shares (their wallet, the price, the limited banner itself) follows in the other views kept.
 * False when the banner showing isn't offered any more (the limited one closed): the standard one is
 * picked, and its view is still to load.
 */
function show(ctx: BannerContext, view: BannerView): boolean {
  ctx.banners = bannersFor(view);
  const showing = ctx.banners.find((banner) => banner.id === ctx.banner.id);
  if (!showing) {
    ctx.banner = STANDARD;
    ctx.view = null;
    ctx.views = {};
    return false;
  }
  const { balance, tokens, cost, baseCost, limited, hero, extraChance } = view;
  for (const banner of ctx.banners) {
    const kept = ctx.views[banner.id];
    if (kept) ctx.views[banner.id] = { ...kept, balance, tokens, cost, baseCost, limited, hero, extraChance };
  }
  ctx.views[showing.id] = view;
  ctx.banner = showing;
  ctx.view = view;
  return true;
}

/** Picks the item the banner showing's guarantee gives them (null: any of them again). */
export async function pickGuaranteed(ctx: BannerContext, itemId: string | null): Promise<void> {
  const server = currentServer();
  if (!server || ctx.busy || !ctx.view) return;
  ctx.busy = busyWith('pick');
  render(ctx);
  const res = await api<BannerView>('/api/gacha/pick', { method: 'POST', body: JSON.stringify({ guild: server, banner: ctx.banner.id, item: itemId }) });
  ctx.busy = null;
  if (!res.ok) {
    render(ctx);
    // Said on the page, so its popup goes.
    ctx.ui.pick.hidden = true;
    if (res.status === 404) return status(ctx, "That item can't be picked here.", true);
    return failed(ctx, res, 'Could not pick that. Try again.');
  }
  if (!show(ctx, res.data)) return loadBanner(ctx);
  render(ctx);
}

/** One pull, or a multi pull: the wish plays while the bot pulls, and shows what came out. */
export async function pull(ctx: BannerContext, multi: boolean): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server || !ctx.view) return;
  ctx.busy = busyWith(multi ? 'ten' : 'one');
  status(ctx, null);
  render(ctx);
  const request = api<BannerResult>('/api/gacha/pull', { method: 'POST', body: JSON.stringify({ guild: server, multi, banner: ctx.banner.id }) });
  const res = await playWish(ctx, request);
  ctx.busy = null;
  // It cost zeiucoins (or the balance shown was old): the header's balances follow.
  void loadMe(true);
  if (!res.ok) {
    render(ctx);
    failed(ctx, res, 'Could not pull. Try again.');
    // The limited banner closed under them: back to what is on now (the message stays).
    if (res.error === 'closed') {
      ctx.banner = STANDARD;
      ctx.banners = [STANDARD];
      ctx.view = null;
      ctx.views = {};
      const fresh = await api<BannerView>(viewPath(server, STANDARD.id));
      if (fresh.ok) show(ctx, fresh.data);
      render(ctx);
    }
    return;
  }
  if (!show(ctx, res.data.view)) return loadBanner(ctx);
  render(ctx);
}
