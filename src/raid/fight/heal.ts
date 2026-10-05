import { send } from '../connection';
import { avatar, el, hpBar } from '../dom';
import type { RaidView } from '../protocol';
import { redraw } from '../render';
import { play } from '../sfx';
import { state } from '../state';
import { ui } from '../ui';
import { fmt } from '../words';

/** Heals `target` (undefined: whoever needs it most, the bot's pick), and closes the picker. */
export function healAt(target: string | undefined): void {
  state.healOpenRound = null;
  // Healing someone else (or whoever needs it most): the heal's sound now. Healing themselves, it plays as it lands.
  if (target !== state.view?.you) play('heal');
  state.pendingPick = 'heal';
  send(target === undefined ? { t: 'act', action: 'heal' } : { t: 'act', action: 'heal', target });
  redraw();
}

/** Heal's "who?": Auto (the bot's pick), then everyone hurt, the worst first. */
export function renderHealPick(v: RaidView): void {
  const f = v.fight!;
  ui.healPick.hidden = state.healOpenRound !== f.round;
  if (ui.healPick.hidden) return;
  ui.healOptions.textContent = '';
  /** One choice: a circle (their picture, or the word Auto), their name under it, and their HP. */
  const option = (face: HTMLElement, name: string, target: string | undefined, hp: { hp: number; maxHp: number } | null, className = ''): void => {
    const button = el('button', `rd-heal-option ${className}`);
    button.type = 'button';
    button.title = hp ? `Heal ${name} (${hp.hp <= 0 ? 'down' : `${fmt(hp.hp)}/${fmt(hp.maxHp)} HP`})` : 'Heal whoever needs it most';
    const circle = el('span', 'rd-heal-face');
    circle.append(face);
    if (hp && hp.hp <= 0) circle.append(el('span', 'rd-badge', '💀'));
    button.append(circle);
    if (name) button.append(el('span', 'rd-heal-name', name));
    if (hp) button.append(hpBar(hp.hp, hp.maxHp, 'rd-heal-bar'));
    button.dataset.sfx = 'own';
    button.addEventListener('click', () => healAt(target));
    button.addEventListener('pointerenter', () => play('hover'));
    ui.healOptions.append(button);
  };
  // First, let the bot choose; then everyone hurt, the worst first.
  option(el('span', 'rd-heal-auto', 'Auto'), '', undefined, null, 'auto');
  const share = (p: { hp: number; maxHp: number }): number => p.hp / p.maxHp;
  for (const p of f.players.filter((q) => q.hp < q.maxHp).sort((a, b) => share(a) - share(b))) {
    option(avatar(p.userId, v), p.userId === v.you ? 'You' : (v.names[p.userId] ?? 'Someone'), p.userId, p, p.hp <= 0 ? 'down' : '');
  }
}
