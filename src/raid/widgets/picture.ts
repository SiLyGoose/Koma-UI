import { firstPaint } from '../message';
import { ui } from '../ui';

let pictureShown = '';

/**
 * Puts the boss's picture up once it's loaded and decoded, so the old one stays until the new one is
 * ready (swapping the src straight away blanks it for a moment: a flash as the fight ends and the boss
 * changes its look). A newer picture asked for meanwhile wins. The first one uncovers the page once
 * it's drawn (`first`).
 */
export function showPicture(url: string, first: boolean): void {
  if (url === pictureShown) return;
  pictureShown = url;
  const shown = load(url);
  if (first) void shown.then(() => requestAnimationFrame(() => requestAnimationFrame(firstPaint)));
}

async function load(url: string): Promise<void> {
  const next = new Image();
  next.src = url;
  await next.decode().catch(() => {});
  if (url !== pictureShown) return;
  for (const img of [ui.battlePicture, ui.battleBackdrop, ui.prepPicture, ui.prepBackdrop]) img.src = url;
}
