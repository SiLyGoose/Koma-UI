import type { GearView } from '../../shared/items/gear';
import type { Slot } from '../../shared/items/items';
import { copyById, status, type GearContext } from './context';
import { renderDetail } from './detail';
import { renderFoot } from './foot';
import { renderGrid } from './grid';
import { render } from './render';

/** Says why asking the bot didn't work (or, for a link or login that ran out, deals with it). */
export function failed(ctx: GearContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return ctx.party ? status(ctx, 'This link has run out. Open the raid again for a new one.', true) : ctx.host.logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void loadGear(ctx);
  status(
    ctx,
    res.error === 'not_member'
        ? "You don't seem to be in that server any more. Log out and in again to refresh it."
        : res.error === 'busy'
          ? 'Your gear was changing somewhere else. Try again.'
          : res.error === 'nothing_to_sell'
            ? 'None of those can be sold any more. Take another look and try again.'
            : what,
    true,
  );
}

/** Loads (and draws) the gear of whoever is shown. */
export async function loadGear(ctx: GearContext): Promise<void> {
  const { host, party } = ctx;
  const server = host.server();
  if (!server && !party) return;
  const load = ++ctx.loads;
  const whose = ctx.viewing;
  const user = whose ? `&user=${encodeURIComponent(whose.userId)}` : '';
  const res = await host.api<GearView>(`/api/gear?guild=${encodeURIComponent(server ?? '')}${user}`);
  // Someone else was picked meanwhile.
  if (load !== ctx.loads) return;
  if (!res.ok) {
    // They left the server: off the roster, and back to their own gear.
    if (whose && res.status === 404 && !party) {
      ctx.members = ctx.members.filter((m) => m.userId !== whose.userId);
      ctx.viewing = null;
      await loadGear(ctx);
      return status(ctx, `${whose.name} isn't in this server any more.`, true);
    }
    return failed(ctx, res, whose ? `Could not load ${whose.name}'s gear.` : 'Could not load your gear.');
  }
  ctx.gear = res.data;
  if (!copyById(ctx, ctx.picked)) ctx.picked = null;
  status(ctx, null);
  render(ctx);
}

/** Asks the bot to change their gear (one at a time), and draws what it comes back as. */
export async function change(ctx: GearContext, path: string, body: Record<string, unknown>, what: string): Promise<GearView | null> {
  // A party's link says its server itself.
  const server = ctx.host.server();
  if (ctx.busy || (!server && !ctx.party)) return null;
  ctx.busy = true;
  renderGrid(ctx);
  renderDetail(ctx);
  renderFoot(ctx);
  const res = await ctx.host.api<GearView>(path, { method: 'POST', body: JSON.stringify({ guild: server ?? undefined, ...body }) });
  ctx.busy = false;
  if (!res.ok) {
    renderGrid(ctx);
    renderDetail(ctx);
    renderFoot(ctx);
    failed(ctx, res, what);
    return null;
  }
  ctx.gear = res.data;
  status(ctx, null);
  render(ctx);
  return res.data;
}

export const equip = (ctx: GearContext, copy: string): Promise<unknown> => change(ctx, '/api/gear/equip', { copy }, 'Could not equip that. Try again.');
export const unequip = (ctx: GearContext, slot: Slot): Promise<unknown> => change(ctx, '/api/gear/unequip', { slot }, 'Could not unequip that. Try again.');
export const unequipEverything = (ctx: GearContext): Promise<unknown> => change(ctx, '/api/gear/unequip-all', {}, 'Could not unequip everything. Try again.');
export const switchTo = (ctx: GearContext, loadout: number): Promise<unknown> => change(ctx, '/api/gear/loadout', { loadout }, 'Could not switch loadouts. Try again.');
export const setLocked = (ctx: GearContext, copy: string, locked: boolean): Promise<unknown> =>
  change(ctx, '/api/gear/lock', { copy, locked }, locked ? 'Could not lock that. Try again.' : 'Could not unlock that. Try again.');
