import markup from './banner.html?raw';
import { API, dropdown, fillServers } from '../shared/ui';
import type { ShopTab } from '../shop/tab';
import { loadUniqueSheet, pickUnique, uniqueEntries } from '../shared/ui/mail/pick';
import { api, currentMe, currentServer, loadMe, prefetchFor, setServer } from '../site/session';
import { failed, loadBanner, loadHistory, pickBanner, pickGuaranteed, pull } from './api';
import { createContext, status, type BannerContext } from './context';
import { render } from './render';

/*
 * The banner, laid out as Genshin's wish screen: pulling from the gacha on the site, as `gacha` and
 * `gacha multi` do in Discord (the bot pulls, with the same price, komaTokens, pity and guarantee: its
 * web/models/gacha.ts), on the standard banner or, while it is open, the limited one. Over a sky: a tab for each banner (./banners.ts) and their wallet along the top; the
 * banner's card (its parchment with its name, what pity promises, their own treasure's guarantee as
 * 0/1 or 1/1 (a button: it opens the pick of the item the guarantee gives) and how long it's on, and its featured items breaking out over a red panel); Details (each tier's odds) and the two pull
 * buttons with their prices along the bottom. A pull plays the wish (./wish.ts: a star falling in the colour of
 * the best item, ./sky.ts) and shows what came out. Logged-in members only, in the server picked. The
 * shop's Wish tab (../shop/page.ts).
 */

/** The falling star, on the shop's rail. */
const ICON =
  '<svg viewBox="0 0 24 24"><path d="M17 2.5l1.3 3.2 3.2 1.3-3.2 1.3L17 11.5l-1.3-3.2L12.5 7l3.2-1.3z" fill="currentColor"/><path d="M13.6 10.4 3.5 20.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/><path d="M11.8 12.2 6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

// (The banner it opens on: the standard one, as ./api.ts's viewPath asks for it.)
export const wishTab: ShopTab = { id: 'wish', label: 'Wish', title: 'Wish · Komaverse', icon: ICON, markup, mount, prefetch: () => prefetchFor((guild) => `/api/gacha?guild=${guild}&banner=standard`) };

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
    const banner = ctx.banners.find((b) => b.id === id);
    if (!banner || banner === ctx.banner || ctx.busy) return;
    // Each banner has its own pity and guarantee: its own view, kept from when the page loaded.
    pickBanner(ctx, banner);
  });

  // Details (with History): open from its button (on the tab last shown), closed by Close, a click outside its box, or Escape.
  // History shows the banner showing's pulls at first, the newest page; afresh each time it is shown.
  const showTab = (history: boolean): void => {
    ui.detailsTab.setAttribute('aria-selected', String(!history));
    ui.historyTab.setAttribute('aria-selected', String(history));
    ui.detailsTab.tabIndex = history ? -1 : 0;
    ui.historyTab.tabIndex = history ? 0 : -1;
    ui.detailsPanel.hidden = history;
    ui.historyPanel.hidden = !history;
    if (history) void loadHistory(ctx, ctx.history.banner, 1);
  };
  const closeDetails = (): void => {
    ui.details.hidden = true;
    ui.detailsOpen.focus();
  };
  ui.detailsOpen.addEventListener('click', () => {
    ui.details.hidden = false;
    ctx.history.banner = ctx.banner.id;
    ctx.history.data = null;
    showTab(!ui.historyPanel.hidden);
    ui.details.focus();
  });
  ui.detailsTab.addEventListener('click', () => showTab(false));
  ui.historyTab.addEventListener('click', () => showTab(true));
  // (The tabs as a tablist: the arrow keys go from one to the other.)
  for (const tab of [ui.detailsTab, ui.historyTab]) {
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const history = tab === ui.detailsTab;
      showTab(history);
      (history ? ui.historyTab : ui.detailsTab).focus();
    });
  }
  ui.historyBanners.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-banner]')?.dataset.banner as typeof ctx.history.banner | undefined;
    if (id && id !== ctx.history.banner) void loadHistory(ctx, id, 1);
  });
  ui.historyPrev.addEventListener('click', () => void loadHistory(ctx, ctx.history.banner, ctx.history.page - 1));
  ui.historyNext.addEventListener('click', () => void loadHistory(ctx, ctx.history.banner, ctx.history.page + 1));
  ui.detailsClose.addEventListener('click', closeDetails);
  ui.details.addEventListener('click', (e) => {
    if (e.target === ui.details) closeDetails();
  });
  ui.details.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetails();
  });

  // The guarantee's pick: open from the ring, closed as Details is. An option picks the item the guarantee gives.
  const closePick = (): void => {
    ui.pick.hidden = true;
    ui.path.focus();
  };
  ui.path.addEventListener('click', () => {
    void (async () => {
      // The Hero Item banner's: King's Raid's ticket's popup, every hero's unique weapon and treasures (else, or with those
      // not in, the list below).
      if (ctx.banner.id === 'hero' && (await pickHeroItem(ctx))) return;
      ui.pick.hidden = false;
      ui.pick.focus();
    })();
  });
  ui.pickClose.addEventListener('click', closePick);
  ui.pick.addEventListener('click', (e) => {
    if (e.target === ui.pick) closePick();
  });
  ui.pick.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePick();
  });
  ui.pickList.addEventListener('click', async (e) => {
    const option = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
    if (!option || option.getAttribute('aria-checked') === 'true') return;
    await pickGuaranteed(ctx, option.dataset.item || null);
    // Its options were drawn again: back to the one picked, so the keyboard is still in the box.
    if (!ui.pick.hidden) (ui.pickList.querySelector<HTMLElement>('[aria-checked="true"]') ?? ui.pick).focus();
  });

  return {
    drawn: start(ctx),
    unmount: () => {
      ctx.endWish?.();
      serverPicker.destroy();
    },
  };
}

/**
 * The Hero Item banner's guarantee picked in the ticket's popup (../shared/ui/mail/pick.ts): each hero's unique weapon then
 * its unique treasures, a search over them, the one picked's main stat and effect, and None (no guarantee) first. False
 * when its items couldn't be read (the list in its place).
 */
async function pickHeroItem(ctx: BannerContext): Promise<boolean> {
  const server = currentServer();
  const view = ctx.view;
  if (!server || !view || ctx.busy) return false;
  const sheet = await loadUniqueSheet(api, server);
  if (!sheet) return false;
  const can = new Set((view.choices ?? []).map((choice) => choice.itemId));
  const entries = uniqueEntries(sheet, 'both').filter((entry) => can.has(entry.item.itemId));
  if (entries.length === 0) return false;
  const picked = await pickUnique(sheet, entries, {
    title: 'Guaranteed item',
    note: ctx.ui.pickText.textContent ?? '',
    chosen: entries.find((entry) => entry.item.itemId === view.pick) ?? null,
    none: { label: 'None', text: 'No guaranteed item: your next unique weapon or treasure here could be any of them.' },
  });
  const item = picked === 'none' ? null : picked?.item.itemId;
  if (picked && item !== view.pick) await pickGuaranteed(ctx, item ?? null);
  ctx.ui.path.focus();
  return true;
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
