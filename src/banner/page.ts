import markup from './banner.html?raw';
import { API, dropdown, fillServers } from '../shared/ui';
import type { ShopTab } from '../shop/tab';
import { currentMe, currentServer, loadMe, setServer } from '../site/session';
import { failed, loadBanner, pull } from './api';
import { BANNERS } from './banners';
import { createContext, status, type BannerContext } from './context';
import { render } from './render';

/*
 * The banner, laid out as Genshin's wish screen: pulling from the gacha on the site, as `gacha` and
 * `gacha multi` do in Discord (the bot pulls, with the same price, komaTokens, pity and guarantee: its
 * web/gacha.ts). Over a sky: a tab for each banner (./banners.ts) and their wallet along the top; the
 * banner's card (its parchment with its name, what pity promises, their own treasure's guarantee as
 * 0/1 or 1/1 and how long it's on, and its featured items breaking out over a red panel); Details (each tier's odds) and the two pull
 * buttons with their prices along the bottom. A pull plays the wish (./wish.ts: a star falling in the colour of
 * the best item, ./sky.ts) and shows what came out. Logged-in members only, in the server picked. The
 * shop's Wish tab (../shop/page.ts).
 */

/** The falling star, on the shop's rail. */
const ICON =
  '<svg viewBox="0 0 24 24"><path d="M17 2.5l1.3 3.2 3.2 1.3-3.2 1.3L17 11.5l-1.3-3.2L12.5 7l3.2-1.3z" fill="currentColor"/><path d="M13.6 10.4 3.5 20.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/><path d="M11.8 12.2 6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

export const wishTab: ShopTab = { id: 'wish', label: 'Wish', title: 'Wish · Komaverse', icon: ICON, markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void loadBanner(ctx);
  });
  ui.one.addEventListener('click', () => void pull(ctx, false));
  ui.ten.addEventListener('click', () => void pull(ctx, true));

  ui.tabs.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-banner]')?.dataset.banner;
    const banner = BANNERS.find((b) => b.id === id);
    if (!banner || banner === ctx.banner || ctx.busy) return;
    ctx.banner = banner;
    render(ctx);
  });

  // Details: open from its button, closed by Close, a click outside its box, or Escape.
  const closeDetails = (): void => {
    ui.details.hidden = true;
    ui.detailsOpen.focus();
  };
  ui.detailsOpen.addEventListener('click', () => {
    ui.details.hidden = false;
    ui.details.focus();
  });
  ui.detailsClose.addEventListener('click', closeDetails);
  ui.details.addEventListener('click', (e) => {
    if (e.target === ui.details) closeDetails();
  });
  ui.details.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetails();
  });

  return {
    drawn: start(ctx),
    unmount: () => {
      ctx.endWish?.();
      serverPicker.destroy();
    },
  };
}

async function start(ctx: BannerContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await loadMe();
  if (!res.ok) return failed(ctx, res, 'Could not load your servers.');
  if (!currentServer()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = currentMe();
  if (me) fillServers(ctx.ui.server, me.servers, currentServer());
  await loadBanner(ctx);
}
