import { fillServers } from '../../shared/server-options';
import { failed, loadGear } from './api';
import { createContext, status, type GearContext } from './context';
import { wireControls } from './controls';
import { loadMembers, renderRoster } from './roster';
import type { GearHost } from './types';

export type { ApiResult, GearHost, Member } from './types';

/*
 * The gear view (the gear page's, and the raid's party's gear): the member's character (Tsuri, for now) with their three slots around them (weapon and
 * armor on the left, the treasure on the right), and their armory beside it: every copy they own, on
 * parchment. Picking a copy shows what it does over the character and equips it; picking a slot shows
 * what fits in it. Under the character: switching loadouts (and outfits, one day); under the armory,
 * selling copies (pick them, then confirm) and taking everything off. The tabs under the character swap the armory for their stats (Common), worked
 * out by the bot. Logged-in members only (the bot's /api/gear answers them only), in the server picked.
 * Down the left, everyone in the server with gear, them first: picking someone else shows their gear,
 * loadouts and stats the same way, to look at only (nothing to equip, upgrade or take off).
 *
 * Where it gets all that is its host's (GearHost): the site's gear page (../page.ts) asks the bot as the
 * member logged in; the raid (src/raid/gear.ts) as the raid's link, with the party for the roster: before
 * the fight they can change what they wear there too (not sell, upgrade or lock, which stay on the gear page).
 *
 * The view's parts, each in its own file here, share one GearContext (./context.ts): what it's showing.
 *   render.ts   draws it all, from slots.ts (round the character), grid.ts (the armory), detail.ts (the
 *               copy picked), foot.ts (loadouts, Sell, Unequip all), stats.ts (the Common tab) and
 *               roster.ts (down the left)
 *   api.ts      asks the bot (loading gear, and every change to it); selling.ts picks copies and sells them
 *   controls.ts hooks up everything that can be pressed
 */

export function mountGear(root: HTMLElement, host: GearHost): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root, host);
  const unwire = wireControls(ctx);
  return { drawn: start(ctx), unmount: unwire };
}

async function start(ctx: GearContext): Promise<void> {
  const { host } = ctx;
  if (!host.ready) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  if (ctx.party) {
    renderRoster(ctx);
    return loadGear(ctx);
  }
  const res = await host.loadMe();
  if (!res.ok) return failed(ctx, res, 'Could not load your servers.');
  if (!host.server()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = host.me();
  if (me) fillServers(ctx.ui.server, me.servers, host.server());
  void loadMembers(ctx);
  await loadGear(ctx);
}
