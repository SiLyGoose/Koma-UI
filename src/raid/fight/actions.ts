import { send } from '../connection';
import type { RaidAction } from '../protocol';
import { redraw } from '../render';
import { play } from '../sfx';
import { state } from '../state';
import { ui } from '../ui';

/** The action buttons: attack, guard and support go straight off; heal asks who first (when anyone is hurt). */
export function wireActions(): void {
  for (const button of ui.actions) {
    // Picking an action has its own sound (../sfx.ts), not the plain click's.
    button.dataset.sfx = 'own';
    // Over an action that can be picked now.
    button.addEventListener('pointerenter', () => {
      if (!button.disabled) play('actionHover');
    });
    button.addEventListener('click', () => {
      const action = button.dataset.action as RaidAction;
      const f = state.view?.fight;
      if (!f) return;
      // Heal: ask who, when anyone is hurt (with nobody hurt there's nothing to pick).
      if (action === 'heal' && f.players.some((p) => p.hp < p.maxHp)) {
        state.healOpenRound = state.healOpenRound === f.round ? null : f.round;
        redraw();
        return;
      }
      // Heal's own sound plays with who it's for (healAt), and as it lands on them.
      if (action !== 'heal') play(action);
      state.pendingPick = action;
      send({ t: 'act', action });
    });
  }
}
