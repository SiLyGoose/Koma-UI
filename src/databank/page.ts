import markup from './databank.html?raw';
import { API } from '../shared/account';
import type { Page } from '../site/page';
import { api } from '../site/session';
import { createContext, itemById, status, type DatabankContext } from './context';
import { wireControls } from './controls';
import { loadMember } from './owned';
import { render } from './render';
import type { Databank } from './types';

/*
 * The databank page: every item in the game (the bot's /api/databank, which needs no login), by star
 * tier on the armory's parchment, and what the one picked does at each refinement level, like the
 * `databank` command. Logged in, it also marks the items the member owns in the server picked (from
 * their /api/gear) and can show only those.
 *
 * Its parts share one DatabankContext (./context.ts): render.ts draws list.ts (the items, as filter.ts
 * picks them) and detail.ts (the panel); owned.ts loads what they own; controls.ts hooks up the search
 * and the filters.
 */

export const databankPage: Page = { path: '/databank', title: 'Databank · Komaverse', icon: '📖', markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const unwire = wireControls(ctx);
  return { drawn: start(ctx), unmount: unwire };
}

async function start(ctx: DatabankContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const [res] = await Promise.all([api<Databank>('/api/databank'), loadMember(ctx)]);
  if (!res.ok) return status(ctx, 'Could not load the databank.', true);
  const databank = res.data;
  ctx.databank = databank;
  ctx.level = databank.maxLevel;
  // A link to one item (/databank/#piplup) opens it; otherwise the panel starts on the first.
  const wanted = decodeURIComponent(location.hash.slice(1));
  ctx.picked = itemById(ctx, wanted)?.id ?? databank.items[0]?.id ?? null;
  ctx.sheetOpen = itemById(ctx, wanted) !== undefined;
  status(ctx, null);
  render(ctx);
}
