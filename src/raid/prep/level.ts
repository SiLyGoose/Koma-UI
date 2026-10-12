import { popupClosed } from '../../shared/items';
import { send } from '../connection';
import type { RaidPickView, RaidView } from '../protocol';
import { state } from '../state';
import { ui } from '../ui';
import { popupShown } from '../widgets';

/*
 * The difficulty to start the week's raid at, in a popup over the party screen before its lobby is up:
 * the boss, the level between two arrows (down to 1, up as far as the server has unlocked: one past the
 * hardest it has beaten), and Enter Raid, which puts the lobby up at that level. The lobby's countdown
 * only starts then. What each level does to the boss and drops isn't said here: that's the databank's.
 */

/** The level picked (null until the popup first comes up: it starts at the hardest the server has unlocked). */
let picked: number | null = null;

function draw(pick: RaidPickView, v: RaidView): void {
  const unlocked = Math.max(1, pick.maxDifficulty);
  picked = Math.min(Math.max(1, picked ?? unlocked), unlocked);
  ui.levelBossName.textContent = v.boss.name;
  ui.levelNumber.textContent = String(picked);
  ui.levelDown.disabled = picked <= 1;
  ui.levelUp.disabled = picked >= unlocked;
}

/** Brings the popup up, for the raid as the bot last sent it (the week's not started, and the page can start it). */
export function openLevel(): void {
  const v = state.view;
  const pick = v?.idle?.pick;
  if (!v || !pick) return;
  draw(pick, v);
  ui.levelPop.hidden = false;
  popupShown();
  ui.levelEnter.focus();
}

/** Closes the popup, with the popup's closing sound unless `quiet` (the raid moving on took it down). */
export function closeLevel(quiet = false): void {
  if (ui.levelPop.hidden) return;
  if (!quiet) popupClosed();
  ui.levelPop.hidden = true;
  popupShown();
  if (!quiet) ui.start.focus({ preventScroll: true });
}

/** The raid as the bot just sent it: the popup follows what there is to pick from, and goes once there's nothing to start. */
export function renderLevel(v: RaidView): void {
  if (ui.levelPop.hidden) return;
  const pick = v.idle?.pick;
  if (pick) draw(pick, v);
  else closeLevel(true);
}

/** The bot answered Enter Raid: the popup goes when the lobby is up, and stays to try again when it isn't. */
export function startAnswered(ok: boolean): void {
  ui.levelEnter.disabled = false;
  if (ok) closeLevel(true);
}

function step(by: 1 | -1): void {
  const v = state.view;
  const pick = v?.idle?.pick;
  if (!v || !pick || picked === null) return;
  picked += by;
  draw(pick, v);
}

/** Starts this week's raid at the level picked (its lobby goes up in Discord too), with them in it. */
function enter(): void {
  if (ui.levelEnter.disabled || picked === null || !state.view?.idle?.pick) return;
  // Waiting for the bot's answer (startAnswered), unless it couldn't be sent.
  ui.levelEnter.disabled = send({ t: 'start', level: picked });
}

/** The popup's arrows (and the keyboard's), Enter Raid, and its ways out: its ✕, the dark around it, and Escape. */
export function wireLevel(): void {
  ui.levelDown.addEventListener('click', () => step(-1));
  ui.levelUp.addEventListener('click', () => step(1));
  ui.levelEnter.addEventListener('click', enter);
  ui.levelClose.dataset.sfx = 'own';
  ui.levelClose.addEventListener('click', () => closeLevel());
  ui.levelPop.addEventListener('click', (event) => {
    if (event.target === ui.levelPop) closeLevel();
  });
  document.addEventListener('keydown', (event) => {
    if (ui.levelPop.hidden) return;
    if (event.key === 'Escape') closeLevel();
    else if (event.key === 'ArrowLeft' && !ui.levelDown.disabled) step(-1);
    else if (event.key === 'ArrowRight' && !ui.levelUp.disabled) step(1);
    else return;
    event.preventDefault();
  });
}
