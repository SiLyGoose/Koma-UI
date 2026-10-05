import { ui } from './ui';

/** Whether a popup (a raider's gear, More stats) is up: the raid behind it stops blurring meanwhile (raid.css). */
export function popupShown(): void {
  document.body.classList.toggle('rd-popup-open', !ui.gearPop.hidden || !ui.statsPop.hidden);
}
