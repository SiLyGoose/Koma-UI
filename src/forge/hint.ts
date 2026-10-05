import { points } from '../shared/format';
import type { GearCopy, Plan } from '../shared/items/gear';
import { balance, choosing, copyById, type ForgeContext } from './context';

/** The line over the slots: how the anvil works, what's in the way, or what was just done. */
export function hintFor(ctx: ForgeContext, copy: GearCopy | undefined, plan: Plan | null): { text: string; tone?: 'good' | 'bad' } {
  if (ctx.done) return { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' };
  if (!copy || !plan) return { text: 'Pick a piece of gear from your armory to put on the anvil.' };
  switch (plan.kind) {
    case 'unavailable':
      return { text: 'Refining on the site isn’t available yet: use `refine` in Discord.' };
    case 'done':
      return { text: plan.masterwork ? 'A fully refined masterwork: there’s nothing left to forge.' : `Fully refined (R${copy.maxLevel}).` };
    case 'forge': {
      if (!plan.forge) return { text: 'Forge it into a masterwork with `forge` in Discord to awaken its bonus.' };
      if (plan.forge.blocked === 'too_poor') return { text: 'You don’t have enough komaGems to forge it. Win raids to earn more.', tone: 'bad' };
      return { text: `Forging it into a masterwork awakens its bonus, for ${points(plan.forge.cost)} komaGems.` };
    }
    case 'refine': {
      const { refine } = plan;
      if (refine.blocked === 'no_duplicate' || choosing(ctx)?.size === 0) return { text: `You need another ${copy.name} to use up as material.`, tone: 'bad' };
      const have = balance(ctx);
      if (refine.blocked === 'too_poor' || (have !== null && refine.cost !== null && have < refine.cost)) {
        return { text: `You need ${points((refine.cost ?? 0) - (have ?? 0))} more zeiucoins to refine it.`, tone: 'bad' };
      }
      const spare = copyById(ctx, ctx.material);
      if (!spare) return { text: `Pick a spare ${copy.name} from your armory to use up as material.` };
      if (spare.level > 1) return { text: `This spare is R${spare.level}: its refinement is lost when it's used up.`, tone: 'bad' };
      return { text: 'The same gear as the target is used up as material.' };
    }
  }
}
