import { ui } from '../ui';

/** Whether a popup (the difficulty to start at, a raider's gear, More stats, their loot) is up: the raid behind it stops blurring meanwhile (../raid.css). */
export function popupShown(): void {
  document.body.classList.toggle('rd-popup-open', !ui.levelPop.hidden || !ui.gearPop.hidden || !ui.statsPop.hidden || !ui.lootPop.hidden);
}
