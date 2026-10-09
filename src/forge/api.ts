import { forgePlan, type GearView } from '../shared/items';
import { busyWith } from '../shared/ui';
import { sleep } from '../shared/util';
import { curtain } from '../shared/transition';
import { api, currentServer, loadMe, logOut } from '../site/session';
import { renderAnvil } from './anvil';
import { choosing, copyById, status, type ForgeContext } from './context';
import { playAnimation } from './play-animation';
import { render } from './render';
import { showResult } from './result';

/** How long the heat behind the target builds before the cover wipes over (its brightest: forge.css's heat). */
const HEAT_MS = 420;

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
export function failed(ctx: ForgeContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void loadGear(ctx);
  status(
    ctx,
    res.error === 'not_member'
        ? "You don't seem to be in that server any more. Log out and in again to refresh it."
        : res.error === 'busy'
          ? 'Your gear was changing somewhere else. Try again.'
          : res.error === 'too_poor'
            ? "You can't afford that."
            : ['no_duplicate', 'maxed', 'bad_material', 'too_low', 'forged'].includes(res.error)
              ? 'That changed in the meantime. Take another look and try again.'
              : what,
    true,
  );
}

export async function loadGear(ctx: ForgeContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<GearView>(`/api/gear?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load your gear.');
  ctx.gear = res.data;
  if (!copyById(ctx, ctx.picked)) ctx.picked = null;
  if (!ctx.picked || !choosing(ctx)?.has(ctx.material ?? '')) ctx.material = null;
  status(ctx, null);
  render(ctx);
}

/** Refines or forges the copy on the anvil, using up the material picked for a refine. */
export async function strikeAnvil(ctx: ForgeContext): Promise<void> {
  const server = currentServer();
  const copy = copyById(ctx, ctx.picked);
  const plan = copy ? forgePlan(copy) : null;
  if (ctx.busy || !server || !copy || !plan || (plan.kind !== 'refine' && plan.kind !== 'forge')) return;
  const forging = plan.kind === 'forge';
  ctx.busy = busyWith('strike');
  renderAnvil(ctx);
  // The heat builds up bright behind the target, then the cover wipes over while the bot does it, and
  // comes off on the result.
  playAnimation(ctx.ui.target, 'heat', 'heat');
  const request = api<GearView>(forging ? '/api/gear/forge' : '/api/gear/refine', {
    method: 'POST',
    body: JSON.stringify({ guild: server, copy: copy.id, ...(forging ? {} : { material: ctx.material }) }),
  });
  await sleep(HEAT_MS);
  const res = await curtain(async () => {
    const res = await request;
    ctx.busy = null;
    // It cost zeiucoins or gems (or whatever the refusal was, the balance may be old): the header's balances follow.
    void loadMe(true);
    if (!res.ok) return res;
    ctx.gear = res.data;
    ctx.material = null;
    const after = copyById(ctx, copy.id);
    const success = res.data.outcome !== 'fail';
    ctx.doneWell = success;
    ctx.done = !success
      ? forging
        ? `The forge didn't take: ${copy.name} isn't a masterwork yet.`
        : `The refine didn't take: ${copy.name} is still R${after?.level ?? copy.level}.`
      : forging
        ? `${copy.name} is now a masterwork. ✨`
        : `${copy.name} is now R${after?.level ?? copy.level + 1}.`;
    status(ctx, null);
    render(ctx);
    if (after) showResult(ctx, copy, after, forging, success);
    return res;
  }, forging ? 'Forging…' : 'Refining…');
  if (!res.ok) {
    renderAnvil(ctx);
    failed(ctx, res, forging ? 'Could not forge that. Try again.' : 'Could not refine that. Try again.');
  }
}
