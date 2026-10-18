import { points } from '../../shared/util';
import { type GearCopy, hasLevels, heroGear, levelLabel, type Plan } from '../../shared/items';
import { balance, choosing, copyById, type ForgeContext } from '../context';

/** The line over the slots: how the anvil works, what's in the way, or what was just done. */
export function hintFor(ctx: ForgeContext, copy: GearCopy | undefined, plan: Plan | null): { text: string; tone?: 'good' | 'bad' } {
  if (ctx.done) return { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' };
  if (!copy || !plan) return { text: 'Pick a piece of gear from your armory to put on the anvil.' };
  switch (plan.kind) {
    case 'unavailable':
      return { text: 'Refining on the site isn’t available yet: use `refine` in Discord.' };
    case 'done':
      if (!hasLevels(copy)) return { text: 'TechnoMagic gear is never refined: what it does is its potentials.' };
      return { text: heroGear(copy) ? `Fully awakened (★${copy.maxLevel}).` : `Fully refined (★${copy.maxLevel}).` };
    case 'refine': {
      const { refine } = plan;
      // (A hero's gear is awakened, King's Raid's, raising its stars.)
      const verb = heroGear(copy) ? 'awaken' : 'refine';
      if (refine.blocked === 'no_duplicate' || choosing(ctx)?.size === 0) return { text: `You need another ${copy.name} to use up as material.`, tone: 'bad' };
      const have = balance(ctx);
      if (refine.blocked === 'too_poor' || (have !== null && refine.cost !== null && have < refine.cost)) {
        return { text: `You need ${points((refine.cost ?? 0) - (have ?? 0))} more zeiucoins to ${verb} it.`, tone: 'bad' };
      }
      const spare = copyById(ctx, ctx.material);
      if (!spare) return { text: `Pick a spare ${copy.name} from your armory to use up as material.` };
      if (spare.level > 1) return { text: `This spare is ${levelLabel(spare)}: its stars are lost when it's used up.`, tone: 'bad' };
      return { text: 'The same gear as the target is used up as material.' };
    }
  }
}
