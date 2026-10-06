import { api, currentServer, loadMe, logOut } from '../site/session';
import { status, type BannerContext } from './context';
import { render } from './render';
import type { BannerResult, BannerView } from './types';
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
        : res.status === 404
          ? 'Pulling on the site isn’t open yet. Use `gacha` in Discord for now.'
          : what,
    true,
  );
}

export async function loadBanner(ctx: BannerContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<BannerView>(`/api/gacha?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load the banner.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** One pull, or a multi pull: the wish plays while the bot pulls, and shows what came out. */
export async function pull(ctx: BannerContext, multi: boolean): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server || !ctx.view) return;
  ctx.busy = true;
  status(ctx, null);
  render(ctx);
  const request = api<BannerResult>('/api/gacha/pull', { method: 'POST', body: JSON.stringify({ guild: server, multi }) });
  const res = await playWish(ctx, request);
  ctx.busy = false;
  // It cost zeiucoins (or the balance shown was old): the header's balances follow.
  void loadMe(true);
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, 'Could not pull. Try again.');
  }
  ctx.view = res.data.view;
  render(ctx);
}
