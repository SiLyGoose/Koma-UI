import markup from './forge.html?raw';
import { API } from '../shared/account';
import { fillServers } from '../shared/server-options';
import type { Page } from '../site/page';
import { currentMe, currentServer, loadMe } from '../site/session';
import { failed, loadGear } from './api';
import { copyById, createContext, status, type ForgeContext } from './context';
import { wireControls } from './controls';
import { pick } from './picking';

/*
 * The forge: the member's armory on the right, the anvil on the left. Picking a copy puts it on the
 * anvil as the target, and the armory greys out everything that can't be its material; for a refine,
 * the member picks the spare copy to use up from what's left. Under them: the odds, what it does now
 * against what it will do (each number that changes as old » new), and the price in the corner beside
 * the button. Every copy is its own: the one on the anvil is the one refined or forged, whatever level
 * its item's other copies are at. Clicking a slot on the anvil empties it. Refining (or forging) wipes a
 * quick cover over the page while the bot does it, which comes off on the result: what it's become and
 * each number that went up, over the page blurred, until a click. A fully refined
 * copy with a masterwork bonus waiting is forged instead, for komaGems, when the bot takes that on the
 * site (else it points to `forge` in Discord). The gear page's Upgrade comes here with ?copy=<id>, which
 * starts with that copy on the anvil. Logged-in members only, in the server picked.
 *
 * Its parts share one ForgeContext (./context.ts): render.ts draws grid.ts (the armory) and anvil.ts
 * (with hint.ts, cost.ts and effects.ts, the numbers paired up by compare.ts); picking.ts puts copies on
 * the anvil; api.ts asks the bot, and result.ts shows what a refine or forge did; controls.ts hooks up
 * everything that can be pressed.
 */

export const forgePage: Page = { path: '/forge', title: 'Forge · Komaverse', icon: '🔨', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const unwire = wireControls(ctx);
  return { drawn: start(ctx), unmount: unwire };
}

async function start(ctx: ForgeContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await loadMe();
  if (!res.ok) return failed(ctx, res, 'Could not load your servers.');
  if (!currentServer()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = currentMe();
  if (me) fillServers(ctx.ui.server, me.servers, currentServer());
  await loadGear(ctx);
  // From the gear page's Upgrade: that copy on the anvil, and the link back to plain /forge/.
  const url = new URL(location.href);
  const wanted = copyById(ctx, url.searchParams.get('copy'));
  if (wanted) pick(ctx, wanted);
  if (url.searchParams.has('copy')) {
    url.searchParams.delete('copy');
    history.replaceState(history.state, '', url);
  }
}
