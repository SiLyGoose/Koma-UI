import { el, markdown } from '../widgets';
import type { ActProblem, RaidAction, RaidView } from '../protocol';
import { state } from '../state';
import { ui } from '../ui';
import { problemText } from '../words';
import { renderHealPick } from './heal';
import { renderParty } from './party';

/** The fight: the boss's HP and what it's about to do, the round, the actions, the party and the log. */
export function renderFight(v: RaidView): void {
  const f = v.fight!;
  const me = f.players.find((p) => p.userId === v.you);

  const bossShare = f.bossMaxHp > 0 ? Math.max(0, f.bossHp) / f.bossMaxHp : 0;
  ui.bossName.textContent = `${v.boss.emoji} ${v.boss.name}`;
  ui.bossPct.textContent = `${Math.ceil(bossShare * 100)}%`;
  ui.bossFill.style.width = `${bossShare * 100}%`;
  if (f.enrage > 0) ui.tags.append(el('span', 'rd-tag hot', f.enrage >= 2 ? '🔥 Furious' : '😠 Enraged'));
  if (f.shielded) ui.tags.append(el('span', 'rd-tag cold', '🔷 Shielded'));
  ui.intentText.replaceChildren(...markdown(f.intent, v.names));

  ui.round.textContent = `Round ${f.round} of ${f.maxRounds}`;
  const picked = me?.picked ?? null;
  for (const button of ui.actions) {
    const action = button.dataset.action as RaidAction;
    button.classList.toggle('picked', picked === action);
    button.disabled = !f.open || picked !== null || f.problems[action] !== null;
  }
  // Why they can't act, or what they picked.
  const problems = Object.values(f.problems).filter((p): p is ActProblem => p !== null);
  const blocking = f.problems.attack && f.problems.guard ? f.problems.attack : f.problems.attack ?? f.problems.guard ?? f.problems.heal;
  // Only why they can't act (their pick shows on its circle, lit gold).
  ui.actNote.textContent = !picked && problems.length > 0 && blocking ? problemText(blocking, me?.cc?.turns ?? 1) : '';
  if (!f.open || picked !== null || state.healOpenRound !== f.round) state.healOpenRound = null;
  renderHealPick(v);
  renderParty(v);
  renderLog(v);
}

/** What's happened so far, kept scrolled to the bottom when it was there. */
function renderLog(v: RaidView): void {
  const f = v.fight!;
  const atBottom = ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 24;
  ui.log.textContent = '';
  for (const line of f.log) {
    const li = el('li');
    li.append(...markdown(line, v.names));
    ui.log.append(li);
  }
  if (f.log.length === 0) ui.log.append(el('li', 'rd-muted', 'Nothing yet. Pick your moves!'));
  if (atBottom) ui.log.scrollTop = ui.log.scrollHeight;
}
