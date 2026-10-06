import { popupClosed } from '../../shared/items';
import { server, token } from '../link';
import { popupShown } from '../widgets';
import type { RaidView } from '../protocol';
import { ui } from '../ui';

/*
 * A raider's gear, in a popup over the raid: the gear page's view in a frame (./gear.ts), with the
 * party to go between.
 */

/**
 * How big the gear's frame is laid out, at least: the gear page's computer layout (roster, character,
 * armory side by side) needs about this much. Smaller popups (a phone on its side) show it scaled down.
 */
const GEAR_LAYOUT_WIDTH = 1100;
const GEAR_LAYOUT_HEIGHT = 640;

/**
 * Shows `userId`'s gear, with the party (`players`, in their order) to go between. `fought`: their gear
 * as they fought the raid (the end screen), rather than as it is now.
 */
export function openGear(v: RaidView, players: string[], userId: string, fought = false): void {
  if (!token || !server) return;
  const party = players.map((id) => ({ id, name: v.names[id] ?? 'Someone', avatar: v.avatars[id], you: id === v.you || undefined }));
  const hash = new URLSearchParams({ t: token, s: server, p: JSON.stringify(party), w: userId, ...(fought ? { g: 'raid' } : {}) });
  ui.gearFrame.src = `${import.meta.env.BASE_URL}games/raid/gear/#${hash}`;
  ui.gearPop.hidden = false;
  popupShown();
  fitGear();
  ui.gearClose.focus();
}

/** Closes the gear popup, with the popup's closing sound unless `quiet` (the raid moving on took it down). */
export function closeGear(quiet = false): void {
  if (ui.gearPop.hidden) return;
  if (!quiet) popupClosed();
  ui.gearPop.hidden = true;
  popupShown();
  ui.gearFrame.src = 'about:blank';
}

/** Lays the frame out at least GEAR_LAYOUT_WIDTH by GEAR_LAYOUT_HEIGHT, scaled to the popup's size. */
function fitGear(): void {
  if (ui.gearPop.hidden) return;
  // Its laid-out size (a bounding box would come out the wrong way round on a page turned sideways).
  const width = ui.gearFit.clientWidth;
  const height = ui.gearFit.clientHeight;
  if (width === 0 || height === 0) return;
  const scale = Math.min(1, width / GEAR_LAYOUT_WIDTH, height / GEAR_LAYOUT_HEIGHT);
  ui.gearFrame.style.width = `${width / scale}px`;
  ui.gearFrame.style.height = `${height / scale}px`;
  ui.gearFrame.style.transform = scale < 1 ? `scale(${scale})` : '';
}

/** The popup's ways out: its ✕, the dark around it, Escape (here or in the frame). And it follows the window's size. */
export function wireGearPopup(): void {
  ui.gearClose.dataset.sfx = 'own';
  ui.gearClose.addEventListener('click', () => closeGear());
  // A click on the dark around the popup closes it too.
  ui.gearPop.addEventListener('click', (event) => {
    if (event.target === ui.gearPop) closeGear();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeGear();
  });
  // Escape inside the frame, with nothing open there (./gear.ts).
  window.addEventListener('message', (event) => {
    if (event.origin === location.origin && (event.data as { t?: string } | null)?.t === 'close-gear') closeGear();
  });
  window.addEventListener('resize', fitGear);
}
