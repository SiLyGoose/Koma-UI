import { ui } from './ui';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** A line along the bottom for a few seconds (what didn't go through, and why). */
export function toast(text: string): void {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast.hidden = true), 3500);
}
