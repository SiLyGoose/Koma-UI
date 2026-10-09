import markup from './dressing.html?raw';
import { API, busyWith, dropdown, fillServers } from '../shared/ui';
import type { OutfitsView } from '../shared/outfits';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { createContext, status, type DressingContext } from './context';
import { render } from './render';

/*
 * The dressing room, as King's Raid's: every outfit (the bot's /api/outfits) in a list down the left,
 * each a close-up of its character (head and shoulders) with its name and whether it's worn (Equipped),
 * theirs (Owned) or its price; the one picked stands full height on the right, with Wear (or, for one
 * they don't have, the way to the shop's Outfits tab, ../outfits/, which only buys them). What they wear
 * is who they're drawn as on the gear page and in Pinecraft (../shared/characters.ts). The gear page's
 * shirt button opens it. Logged-in members only, in the server picked.
 */

export const dressingPage: Page = { path: '/dressing-room', title: 'Dressing Room · Komaverse', icon: '👗', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    ctx.picked = null;
    void load(ctx);
  });

  // Picking one stands it on the right (any of them, to see it; only theirs can be put on).
  ui.list.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-outfit]')?.dataset.outfit;
    if (!id || id === ctx.picked) return;
    ctx.picked = id;
    render(ctx);
    ui.list.querySelector<HTMLElement>(`[data-outfit="${id}"]`)?.focus();
  });
  ui.wear.addEventListener('click', () => void wear(ctx));

  return { drawn: start(ctx), unmount: () => serverPicker.destroy() };
}

async function start(ctx: DressingContext): Promise<void> {
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
function failed(ctx: DressingContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void load(ctx);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'not_owned'
        ? "That one isn't yours yet. Get it in the shop."
        : res.status === 404
          ? 'The dressing room isn’t open yet.'
          : what,
    true,
  );
}

async function load(ctx: DressingContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<OutfitsView>(`/api/outfits?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load your outfits.');
  ctx.view = res.data;
  status(ctx, null);
  render(ctx);
}

/** Puts on the outfit picked. */
async function wear(ctx: DressingContext): Promise<void> {
  const server = currentServer();
  if (ctx.busy || !server || !ctx.picked) return;
  ctx.busy = busyWith(`wear:${ctx.picked}`);
  status(ctx, null);
  render(ctx);
  const res = await api<OutfitsView>('/api/outfits/wear', { method: 'POST', body: JSON.stringify({ guild: server, outfit: ctx.picked }) });
  ctx.busy = null;
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, 'Could not put that on. Try again.');
  }
  ctx.view = res.data;
  render(ctx);
}
