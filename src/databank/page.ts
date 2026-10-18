import markup from './databank.html?raw';
import { API } from '../shared/ui';
import type { Page } from '../site/page';
import { prefetchFor } from '../site/session';
import { bossById, classById, createContext, heroById, itemById, kindOf, raidBossById, status, type DatabankContext, type View } from './context';
import { wireControls } from './controls';
import { loadDatabank } from './load';
import { loadMember } from './owned';
import { render } from './render';

/*
 * The databank page (the bot's /api/databank, which needs no login). /databank/ is the way in: what
 * there is to look up, each a mark on the star chart to click into (hub.ts). /databank/items/ is the items'
 * own way in, the same: hero items (/databank/items/hero/: the heroes' unique weapons and treasures) and player items
 * (/databank/items/player/: the members' own); each is its items by tier on the armory's parchment, and what the one picked
 * does at each level, like the `databank` command; logged in, it also marks the items the member owns in the server picked
 * (from their /api/gear) and can show only those. /databank/enemies/ (once /databank/bosses/, still taken) is the enemies:
 * the Weekly Bosses, what each does and what each difficulty level makes of it, like `raid stats`, and logged in, which is
 * this week's in the server picked and how far its difficulty is unlocked (week.ts); and the TechnoMagic Raid's bosses and
 * the Dragon Raid's dragons, what each does and what each stage makes of it (bosses.ts). /databank/classes/ is the raid classes: what each does in a raid, and its class
 * items (classes.ts). /databank/heroes/ is the TechnoMagic Raid's heroes: their stats with no gear, and
 * their skills (heroes.ts). A #hash opens one item, boss, class or hero. Going between them swaps them in place.
 *
 * Its parts share one DatabankContext (./context.ts): render.ts draws the one showing; for the items,
 * list.ts (as filter.ts picks them) and detail.ts (the panel); owned.ts loads what goes by the server
 * picked; controls.ts hooks up the search, the filters and the server picker. Across the top, at the right, are
 * the server picker and the X out of a section, back to the way in.
 */

export const databankPage: Page = {
  title: 'Databank · Komaverse',
  icon: '📖',
  markup,
  mount,
  // The databank (./load.ts: unchanged since the last visit, nothing is downloaded), and, logged in, what they own and how the raid stands (./owned.ts).
  prefetch: () => {
    if (API) void loadDatabank();
    prefetchFor((guild) => `/api/gear?guild=${guild}`, (guild) => `/api/raid/week?guild=${guild}`);
  },
};

const PATHS: Record<View, string> = { hub: '/databank/', itemKinds: '/databank/items/', items: '/databank/items/player/', bosses: '/databank/enemies/', classes: '/databank/classes/', heroes: '/databank/heroes/' };

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

/** An item list's path: its kind's. */
const itemsPath = (ctx: DatabankContext): string => `/databank/items/${ctx.itemKind}/`;

/**
 * What `url` shows: its path's view, and the item or enemy its #hash names. A link from before the databank had more than
 * items (/databank/#piplup), or from before the items had their kinds (/databank/items/#piplup), goes to what it names.
 */
function place(ctx: DatabankContext, url: URL): void {
  const path = url.pathname.replace(/\/+$/, '');
  const wanted = decodeURIComponent(url.hash.slice(1));
  const item = itemById(ctx, wanted);
  const boss = bossById(ctx, wanted) ?? raidBossById(wanted);
  // The classes only with a bot that sends them (the heroes and the raids' bosses are the raid's own).
  let view: View =
    path === '/databank/items/hero' || path === '/databank/items/player'
      ? 'items'
      : path === '/databank/items'
        ? 'itemKinds'
        : path === '/databank/enemies' || path === '/databank/bosses'
          ? 'bosses'
          : path === '/databank/classes' && ctx.databank?.classes?.length
            ? 'classes'
            : path === '/databank/heroes'
              ? 'heroes'
              : 'hub';
  if (view === 'items') ctx.itemKind = path.endsWith('/hero') ? 'hero' : 'player';
  // An item named: in its own kind's list.
  if (item && (view === 'hub' || view === 'itemKinds' || (view === 'items' && kindOf(item) !== ctx.itemKind))) {
    view = 'items';
    ctx.itemKind = kindOf(item);
    history.replaceState(history.state, '', `${itemsPath(ctx)}${url.hash}`);
  } else if (view === 'hub' && boss) {
    view = 'bosses';
    history.replaceState(history.state, '', `${PATHS.bosses}${url.hash}`);
  }
  ctx.view = view;
  if (view === 'items' && item) ctx.picked = item.id;
  if (view === 'bosses' && boss) ctx.boss = boss.id;
  if (view === 'classes') ctx.cls = classById(ctx, wanted)?.id ?? ctx.cls;
  if (view === 'heroes') ctx.hero = heroById(wanted)?.id ?? ctx.hero;
  // On narrow screens the item's sheet is only up for one that was asked for.
  ctx.sheetOpen = view === 'items' && item !== undefined;
}

async function start(ctx: DatabankContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const [res] = await Promise.all([loadDatabank(), loadMember(ctx)]);
  if (!res.ok) return status(ctx, 'Could not load the databank.', true);
  const databank = res.data;
  ctx.databank = databank;
  ctx.ui.filter.setClasses(databank.classes ?? []);
  ctx.level = databank.maxLevel;
  // The panels start on the first item, and on this week's boss in their server (the first, for anyone else).
  ctx.picked = databank.items.find((item) => item.source !== 'technomagic')?.id ?? null;
  ctx.boss = bossById(ctx, ctx.week?.boss ?? null)?.id ?? databank.bosses?.[0]?.id ?? null;
  ctx.cls = databank.classes?.[0]?.id ?? null;
  place(ctx, new URL(location.href));
  status(ctx, null);
  render(ctx);
}
