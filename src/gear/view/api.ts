import type { GearView, Slot } from '../../shared/items';
import { busyWith } from '../../shared/ui';
import { copyById, status, type GearContext } from './context';
import { renderDetail } from './detail';
import { renderFoot, renderMenu } from './foot';
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

/**
 * Asks the bot to change their gear (one at a time), and draws what it comes back as. `action` names the
 * button that asked, and what it's on (`equip:<copy>`), so only that button shows it's working.
 */
export async function change(ctx: GearContext, action: string, path: string, body: Record<string, unknown>, what: string): Promise<GearView | null> {
  // A party's link says its server itself.
  const server = ctx.host.server();
  if (ctx.busy || (!server && !ctx.party)) return null;
  ctx.busy = busyWith(action);
  renderGrid(ctx);
  renderDetail(ctx);
  renderFoot(ctx);
  const res = await ctx.host.api<GearView>(path, { method: 'POST', body: JSON.stringify({ guild: server ?? undefined, ...body }) });
  ctx.busy = null;
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

export const equip = (ctx: GearContext, copy: string): Promise<unknown> =>
  change(ctx, `equip:${copy}`, '/api/gear/equip', { copy }, 'Could not equip that. Try again.');
export const unequip = (ctx: GearContext, slot: Slot): Promise<unknown> =>
  change(ctx, `unequip:${slot}`, '/api/gear/unequip', { slot }, 'Could not unequip that. Try again.');
export const unequipEverything = (ctx: GearContext): Promise<unknown> =>
  change(ctx, 'unequip-all', '/api/gear/unequip-all', {}, 'Could not unequip everything. Try again.');
export const switchTo = (ctx: GearContext, loadout: number): Promise<unknown> =>
  change(ctx, 'loadout', '/api/gear/loadout', { loadout }, 'Could not switch loadouts. Try again.');
/** The longest name a loadout takes (the bot's LOADOUTS.maxNameLength). */
export const LOADOUT_NAME_MAX = 24;

/** Why the bot wouldn't have a loadout's name (its checkLoadoutName), as the menu says it under the name. */
const NAME_REFUSED: Record<string, (name: string) => string> = {
  name_too_long: () => `Keep it to ${LOADOUT_NAME_MAX} characters.`,
  name_bad_characters: () => "Only letters, numbers, spaces and . ! ? ' & + -",
  name_no_letters: () => 'It needs at least one letter.',
  name_reserved: (name) => `"${name}" is a word Koma's loadout command uses. Pick another.`,
  name_taken: () => 'Another of your loadouts has that name.',
};

/**
 * Names the loadout being named in the menu (ctx.renaming) what's typed there; nothing typed puts back
 * its own name ("Loadout 2"). A name the bot won't have is said under it, the menu left as it is.
 */
export async function renameLoadout(ctx: GearContext): Promise<void> {
  const { renaming, gear } = ctx;
  const server = ctx.host.server();
  if (!renaming || !gear || ctx.busy || !server) return;
  const { number } = renaming;
  const name = renaming.value.trim().replace(/\s+/g, ' ');
  const back = (): void => ctx.ui.loadoutMenu.querySelector<HTMLElement>(`[data-rename="${number}"]`)?.focus();
  // The name it has: nothing to ask.
  if (name === gear.loadouts.find((l) => l.number === number)?.name) {
    ctx.renaming = null;
    renderMenu(ctx);
    return back();
  }
  ctx.busy = busyWith(`rename:${number}`);
  renderMenu(ctx);
  const res = await ctx.host.api<GearView>('/api/gear/loadout/rename', { method: 'POST', body: JSON.stringify({ guild: server, loadout: number, name }) });
  ctx.busy = null;
  if (res.ok) {
    if (ctx.renaming === renaming) ctx.renaming = null;
    ctx.gear = res.data;
    status(ctx, null);
    render(ctx);
    return back();
  }
  const refused = NAME_REFUSED[res.error];
  if (refused && ctx.renaming === renaming) renaming.error = refused(name);
  renderMenu(ctx);
  if (!refused) failed(ctx, res, 'Could not rename that loadout. Try again.');
}

export const setLocked = (ctx: GearContext, copy: string, locked: boolean): Promise<unknown> =>
  change(ctx, `lock:${copy}`, '/api/gear/lock', { copy, locked }, locked ? 'Could not lock that. Try again.' : 'Could not unlock that. Try again.');
