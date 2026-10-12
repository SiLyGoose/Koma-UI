import markup from './databank.html?raw';
import { API } from '../shared/ui';
import type { Page } from '../site/page';
import { api } from '../site/session';
import { bossById, createContext, itemById, status, type DatabankContext, type View } from './context';
import { wireControls } from './controls';
import { loadMember } from './owned';
import { render } from './render';
import type { Databank } from './types';

/*
 * The databank page (the bot's /api/databank, which needs no login). /databank/ is the way in: what
 * there is to look up, each a mark on the star chart to click into (hub.ts). /databank/items/ is every
 * item in the game, by star tier on the armory's parchment, and what the one picked does at each
 * refinement level, like the `databank` command; logged in, it also marks the items the member owns in
 * the server picked (from their /api/gear) and can show only those. /databank/bosses/ is the raid
 * bosses: what each does, and what each difficulty level makes of it, like `raid stats` (bosses.ts);
 * logged in, it also says which is this week's in the server picked, and how far its difficulty is
 * unlocked (week.ts). A #hash opens one item or boss. Going between the three swaps them in place.
 *
 * Its parts share one DatabankContext (./context.ts): render.ts draws the one showing; for the items,
 * list.ts (as filter.ts picks them) and detail.ts (the panel); owned.ts loads what goes by the server
 * picked; controls.ts hooks up the search, the filters and the server picker.
 */

export const databankPage: Page = { path: '/databank', subpaths: true, title: 'Databank · Komaverse', icon: '📖', markup, mount };

const PATHS: Record<View, string> = { hub: '/databank/', items: '/databank/items/', bosses: '/databank/bosses/' };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate: (url: URL) => void } {
  const ctx = createContext(root);
  const unwire = wireControls(ctx);
  return {
    drawn: start(ctx),
    unmount: unwire,
    navigate: (url) => {
      place(ctx, url);
      render(ctx);
      window.scrollTo(0, 0);
    },
  };
}

/**
 * What `url` shows: its path's view, and the item or boss its #hash names. A link from before the
 * databank had more than items (/databank/#piplup) goes to what it names.
 */
function place(ctx: DatabankContext, url: URL): void {
  const path = url.pathname.replace(/\/+$/, '');
  const wanted = decodeURIComponent(url.hash.slice(1));
  const item = itemById(ctx, wanted);
  const boss = bossById(ctx, wanted);
  let view: View = path === '/databank/items' ? 'items' : path === '/databank/bosses' && ctx.databank?.bosses?.length ? 'bosses' : 'hub';
  if (view === 'hub' && (item || boss)) {
    view = item ? 'items' : 'bosses';
    history.replaceState(history.state, '', `${PATHS[view]}${url.hash}`);
  }
  ctx.view = view;
  if (view === 'items' && item) ctx.picked = item.id;
  if (view === 'bosses' && boss) ctx.boss = boss.id;
  // On narrow screens the item's sheet is only up for one that was asked for.
  ctx.sheetOpen = view === 'items' && item !== undefined;
}

async function start(ctx: DatabankContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const [res] = await Promise.all([api<Databank>('/api/databank'), loadMember(ctx)]);
  if (!res.ok) return status(ctx, 'Could not load the databank.', true);
  const databank = res.data;
  ctx.databank = databank;
  ctx.level = databank.maxLevel;
  // The panels start on the first item, and on this week's boss in their server (the first, for anyone else).
  ctx.picked = databank.items[0]?.id ?? null;
  ctx.boss = bossById(ctx, ctx.week?.boss ?? null)?.id ?? databank.bosses?.[0]?.id ?? null;
  place(ctx, new URL(location.href));
  status(ctx, null);
  render(ctx);
}
