import { renderFight } from './fight/fight';
import { closeGear } from './gear/gear-popup';
import { api } from './link';
import { showPicture } from './widgets';
import { renderPrep } from './prep/prep';
import type { RaidView } from './protocol';
import { closeStats, renderResult, renderStats } from './result';
import { play } from './sfx';
import { state } from './state';
import { tick } from './timers';
import { ui } from './ui';

/** How long the battle stays up once the fight ends, before the end screen fades in over it. */
const END_PAUSE_MS = 500;
/** The end screen is showing (after its pause). */
let resultShown = false;
/** The pause before it, while it runs. */
let endTimer: ReturnType<typeof setTimeout> | null = null;

/** Draws the raid as the bot sent it: the party screen before the fight, the fight, or its end. */
export function render(next: RaidView): void {
  const before = state.view?.phase ?? null;
  playLanded(next);
  state.view = next;
  // The first screen: uncovered once it's drawn, the picture in it.
  showPicture(api + next.picture, before === null);
  ui.battlePicture.alt = next.boss.name;
  ui.bossTitle.textContent = `· ${next.boss.emoji} ${next.boss.name}`;

  const fighting = next.phase === 'fight';
  // A fight fought out ends on its own screen, VICTORY or DEFEAT (one that never started shows the party screen).
  const ended = next.phase === 'over' && next.over !== null && ['won', 'wiped', 'fled'].includes(next.over.end);
  // The fight just ended here: the battle stays up a moment (its last blow, the boss's new look), then the end fades in.
  if (!ended) {
    resultShown = false;
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
  } else if (!resultShown && !endTimer) {
    if (before === 'fight') {
      endTimer = setTimeout(() => {
        endTimer = null;
        resultShown = true;
        redraw();
      }, END_PAUSE_MS);
    } else {
      resultShown = true;
    }
  }
  const holding = ended && !resultShown;
  // The end screen goes over the battle's scene (the boss stays put under it) as the battle's own parts fade out.
  // Before the fight (not fought yet this week, the lobby open, or a lobby that never came to a fight): the party screen.
  const preparing = next.phase === 'lobby' || (next.phase === 'idle' && next.idle !== null) || (next.phase === 'over' && next.over !== null && !ended);
  ui.prep.hidden = !preparing;
  ui.battle.hidden = !(fighting || ended);
  ui.battle.classList.toggle('ending', holding);
  ui.battle.classList.toggle('concluded', ended && resultShown);
  ui.result.hidden = !(ended && resultShown);
  document.body.classList.toggle('rd-fighting', fighting || ended);
  ui.tags.textContent = '';

  if (preparing) renderPrep(next);
  // The fight starting (or the lobby going, or the end screen) takes the gear's popup down with the screen it was opened from.
  else if (before !== next.phase) closeGear(true);
  if (!ended) closeStats(true);
  else if (!ui.statsPop.hidden) renderStats(next);
  if (next.phase === 'fight' && next.fight) renderFight(next);
  if (ended) renderResult(next);
  tick();
}

/** Draws the raid again as it last was (something on the page changed: a pick, the party row swapped). */
export function redraw(): void {
  if (state.view) render(state.view);
}

/** The sounds of the round that just resolved, going from the raid shown to `next`. */
function playLanded(next: RaidView): void {
  const { view } = state;
  // A heal (or a revive) landing on them as the round resolved: their HP went up (nothing else raises it).
  const hpBefore = view?.fight?.players.find((p) => p.userId === next.you)?.hp;
  const hpNow = next.fight?.players.find((p) => p.userId === next.you)?.hp;
  if (hpBefore !== undefined && hpNow !== undefined && hpNow > hpBefore) play('heal');
  // Their attack, guard or support landing as the round resolved: the turn closed (no more picks), or the fight ended on it.
  const wasOpen = view?.fight?.open === true;
  const mine = next.fight?.players.find((p) => p.userId === next.you);
  if (next.fight?.open && mine?.picked) state.lastPick = mine.picked;
  const resolved = wasOpen && (next.fight ? !next.fight.open : next.phase === 'over');
  if (resolved && state.lastPick && state.lastPick !== 'heal') play(state.lastPick);
  if (resolved || !next.fight) state.lastPick = null;
}
