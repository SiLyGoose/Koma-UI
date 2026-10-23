import { forgePlan, type GearView, heroGear, itemIcons, levelLabel, shownName } from '../shared/items';
import type { HeroCopy, HeroesView, HeroKeep } from '../shared/heroes';
import { busyWith } from '../shared/ui';
import { sleep } from '../shared/util';
import { curtain } from '../shared/transition';
import { api, currentServer, loadMe, logOut } from '../site/session';
import { renderAnvil } from './anvil';
import type { HeroMode } from './anvil/hero';
import { compare } from './anvil/compare';
import { choosing, copyById, heroCopyById, status, type ForgeContext } from './context';
import { playAnimation } from './play-animation';
import { render } from './render';
import { closeResult, showChange, showEffectChoice, showResult } from './result';

/** How long the heat behind the target builds before the cover wipes over (its brightest: forge.css's heat). */
const HEAT_MS = 420;

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
export function failed(ctx: ForgeContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
  if (res.status === 0) return void Promise.all([loadGear(ctx), loadHeroes(ctx)]);
  status(
    ctx,
    res.error === 'not_member'
        ? "You don't seem to be in that server any more. Log out and in again to refresh it."
        : res.error === 'busy'
          ? 'Your gear was changing somewhere else. Try again.'
          : res.error === 'too_poor'
            ? "You can't afford that."
            : res.error === 'no_gems'
              ? "You don't have enough komaGems for that."
              : res.error === 'pending'
                ? 'Keep one of its effects first: the one it has, or the one just rolled.'
              : ['no_duplicate', 'maxed', 'bad_material', 'no_option'].includes(res.error)
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

/** Their hero gear (GET /api/heroes), with its substats, its effect and their prices: the menu's other modes work on it. */
export async function loadHeroes(ctx: ForgeContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(ctx, res, 'Could not load your hero gear.');
  ctx.heroes = res.data;
  // (King's Raid's hero gear's pictures: its icons, as the bot says them; the heroes page's too.)
  for (const copy of res.data.copies) if (copy.icon) itemIcons.set(copy.itemId, copy.icon);
  if (ctx.mode && ctx.mode !== 'refine' && !heroCopyById(ctx, ctx.picked)) ctx.picked = null;
  render(ctx);
}

/** What a hero mode changes on a copy, a line each: its substats, or its additional effect. */
const linesOf = (copy: HeroCopy, mode: HeroMode): string[] => (mode === 'effects' ? (copy.additional ? [copy.additional] : []) : copy.options.map((option) => option.line));

/**
 * Rerolls the substat picked, enhances it (its amount rolled again), or rerolls the effect of the piece on the anvil (the mode's: the bot's
 * POST /api/heroes/reroll or /upgrade), with the anvil's heat and cover as a refine has, and shows what changed.
 */
export async function strikeHero(ctx: ForgeContext, mode: HeroMode): Promise<void> {
  const server = currentServer();
  const copy = heroCopyById(ctx, ctx.picked);
  const option = mode === 'effects' ? 'unique' : ctx.option;
  if (ctx.busy || !server || !copy || option === null) return;
  ctx.busy = busyWith('strike');
  renderAnvil(ctx);
  playAnimation(ctx.ui.target, 'heat', 'heat');
  const request = api<HeroesView>(mode === 'enhance' ? '/api/heroes/upgrade' : '/api/heroes/reroll', {
    method: 'POST',
    body: JSON.stringify({ guild: server, copy: copy.id, option }),
  });
  await sleep(HEAT_MS);
  const res = await curtain(async () => {
    const res = await request;
    ctx.busy = null;
    // It cost zeiucoins or komaGems: the header's balances follow, and the gear's (a refine's balance) too.
    void loadMe(true);
    if (!res.ok) return res;
    ctx.heroes = res.data;
    void loadGear(ctx);
    const after = heroCopyById(ctx, copy.id);
    const rows = after ? compare(linesOf(copy, mode), linesOf(after, mode)) : [];
    const changed = rows.filter((row) => row.state !== 'same' && row.state !== 'gone').map((row) => (row.state === 'changed' ? row.changes.map((one) => `${one.from} » ${one.to}`).join(', ') : row.line));
    ctx.doneWell = true;
    // An effect rerolled: the one rolled waits beside the one it has, for the member to keep one.
    if (mode === 'effects' && after?.rerolled) {
      ctx.done = null;
      ctx.keep = null;
      status(ctx, null);
      render(ctx);
      showEffectChoice(ctx, after, (which) => void keepEffect(ctx, which));
      return res;
    }
    ctx.done = mode === 'enhance' ? `Enhanced: ${changed.join(', ') || 'it rolled the same amount again'}.` : `Rerolled into ${changed.join(', ') || 'the same again'}.`;
    // (Rerolling or enhancing: the substat picked stays picked, to roll it again.)
    status(ctx, null);
    render(ctx);
    if (after) showChange(ctx, after, mode === 'enhance' ? 'Substat enhanced' : mode === 'reroll' ? 'Substat rerolled' : 'Effect rerolled', rows);
    return res;
  }, mode === 'enhance' ? 'Enhancing…' : 'Rerolling…');
  if (!res.ok) {
    renderAnvil(ctx);
    failed(ctx, res, mode === 'enhance' ? 'Could not enhance that. Try again.' : 'Could not reroll that. Try again.');
  }
}

/** The name of an additional effect's line ("Vigor: Increases…" is Vigor). */
const effectName = (line: string | null): string => line?.split(':')[0] ?? 'no effect';

/**
 * Keeps the effect of the piece on the anvil (`which`: the one it has, or the one its reroll rolled: the bot's POST
 * /api/heroes/keep), the result closed if it asked; the other one is gone.
 */
export async function keepEffect(ctx: ForgeContext, which: HeroKeep | null): Promise<void> {
  const server = currentServer();
  const copy = heroCopyById(ctx, ctx.picked);
  if (ctx.busy || !server || !copy?.rerolled || which === null) return;
  ctx.busy = busyWith('strike');
  closeResult(ctx);
  render(ctx);
  const res = await api<HeroesView>('/api/heroes/keep', { method: 'POST', body: JSON.stringify({ guild: server, copy: copy.id, keep: which }) });
  ctx.busy = null;
  if (!res.ok) {
    render(ctx);
    return failed(ctx, res, 'Could not keep that effect. Try again.');
  }
  ctx.heroes = res.data;
  ctx.keep = null;
  ctx.doneWell = true;
  ctx.done = which === 'new' ? `Took ${effectName(copy.rerolled)} in place of ${effectName(copy.additional)}.` : `Kept ${effectName(copy.additional)}.`;
  status(ctx, null);
  render(ctx);
}

/** Refines the copy on the anvil, using up the material picked. */
export async function strikeAnvil(ctx: ForgeContext): Promise<void> {
  const server = currentServer();
  const copy = copyById(ctx, ctx.picked);
  const plan = copy ? forgePlan(copy) : null;
  if (ctx.busy || !server || !copy || plan?.kind !== 'refine') return;
  ctx.busy = busyWith('strike');
  renderAnvil(ctx);
  // The heat builds up bright behind the target, then the cover wipes over while the bot does it, and
  // comes off on the result.
  playAnimation(ctx.ui.target, 'heat', 'heat');
  const request = api<GearView>('/api/gear/refine', {
    method: 'POST',
    body: JSON.stringify({ guild: server, copy: copy.id, material: ctx.material }),
  });
  await sleep(HEAT_MS);
  const res = await curtain(async () => {
    const res = await request;
    ctx.busy = null;
    // It cost zeiucoins (or whatever the refusal was, the balance may be old): the header's balances follow.
    void loadMe(true);
    if (!res.ok) return res;
    ctx.gear = res.data;
    ctx.material = null;
    // (A hero's gear awakened: the hero gear's stars too.)
    if (heroGear(copy)) void loadHeroes(ctx);
    const after = copyById(ctx, copy.id);
    ctx.doneWell = true;
    ctx.done = `${shownName(copy)} is now ${levelLabel(after ?? { ...copy, level: copy.level + 1 })}.`;
    status(ctx, null);
    render(ctx);
    // (A refine always takes: the bot has no failed one to say.)
    if (after) showResult(ctx, copy, after, true);
    return res;
  }, heroGear(copy) ? 'Awakening…' : 'Refining…');
  if (!res.ok) {
    renderAnvil(ctx);
    failed(ctx, res, 'Could not refine that. Try again.');
  }
}
