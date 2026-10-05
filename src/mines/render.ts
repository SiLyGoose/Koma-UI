import { dropdown } from '../shared/dropdown';
import { renderBoard } from './board';
import { renderPanel } from './panel';
import { ui } from './ui';

/** The mines picker, in the site's style (the <select> stays underneath, keeping the value). */
export const minesDropdown = dropdown(ui.mines);

export function render(): void {
  renderBoard();
  renderPanel();
  minesDropdown.refresh();
}
