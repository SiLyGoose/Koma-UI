import { avatar, el, hpBar } from '../widgets';
import type { RaidFightView, RaidView } from '../protocol';
import { play } from '../sfx';
import { nameOf, state } from '../state';
import { CC_NAME, fmt } from '../words';
import { buffRow } from './buffs';
import { healAt } from './heal';

/** A raider in the party row: their picture with their pick, name and HP, HP bar and buffs. `front`: in the row in front (the one to pick from). */
export function memberItem(p: RaidFightView['players'][number], f: RaidFightView, v: RaidView, front: boolean): HTMLElement {
  const li = el('li', `rd-member${p.userId === v.you ? ' you' : ''}${p.hp <= 0 ? ' down' : ''}${p.picked ? ' ready' : ''}`);
  li.title = nameOf(p.userId);
  const portrait = el('div', 'rd-portrait');
  portrait.append(avatar(p.userId, v));
  // What they picked this turn (or that they're down, or held by crowd control), on the portrait's corner.
  // Their pick shows as its action's picture (public/raid/actions); down, stunned and still choosing as signs.
  if (p.hp > 0 && p.canAct && p.picked) {
    const badge = el('span', 'rd-badge picked');
    const icon = el('img');
    icon.src = `/raid/actions/action_${p.picked}.png`;
    icon.alt = p.picked;
    icon.draggable = false;
    badge.append(icon);
    portrait.append(badge);
  } else {
    const sign = p.hp <= 0 ? '💀' : !p.canAct ? '💫' : f.open ? '…' : '';
    if (sign) portrait.append(el('span', 'rd-badge', sign));
  }
  if (p.cc && p.hp > 0) portrait.append(el('span', 'rd-cc', `${CC_NAME[p.cc.effect].split(' ')[0]}${p.cc.turns}`));
  // Under the portrait, as in a game's party bar: their name on the left and their HP on the right, over the bar.
  const stats = el('div', 'rd-member-stats');
  stats.append(el('span', 'rd-member-name', v.names[p.userId] ?? 'Someone'), el('span', 'rd-member-hp', fmt(Math.max(0, p.hp))));
  li.append(portrait, stats, hpBar(p.hp, p.maxHp, 'rd-member-bar'), buffRow(p, f));
  // Picking who to heal: a hurt raider here can be picked too (the swap button still shows the others).
  if (front && state.healOpenRound === f.round) {
    if (p.hp < p.maxHp) {
      li.classList.add('heal-target');
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Heal ${nameOf(p.userId)}`);
      li.title = `Heal ${nameOf(p.userId)}`;
      li.dataset.sfx = 'own';
      li.addEventListener('click', () => healAt(p.userId));
      li.addEventListener('pointerenter', () => play('hover'));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          healAt(p.userId);
        }
      });
    } else {
      li.classList.add('heal-off');
    }
  }
  return li;
}
