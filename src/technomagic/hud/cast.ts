import { el, shown } from './dom';

/**
 * The boss winding up a skill, over its head, as King's Raid shows it: the skill's name, and under it a red bar filling
 * until its first blow lands (../fight/view.ts FightView.charging).
 */
export interface CastBar {
  /** Where on the field's picture its foot's middle goes (CSS pixels from its top left), the skill's name, and how far it is (0 to 1). */
  draw(x: number, y: number, name: string, share: number): void;
  hide(): void;
}

export function makeCastBar(parent: HTMLElement): CastBar {
  const root = el('div', 'tm-cast');
  const name = el('span', 'tm-cast-name');
  const bar = el('div', 'tm-cast-bar');
  const fill = el('i', '');
  bar.append(fill);
  root.append(name, bar);
  root.hidden = true;
  parent.append(root);
  return {
    draw(x, y, said, share) {
      shown(root, true);
      root.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      if (name.textContent !== said) name.textContent = said;
      fill.style.transform = `scaleX(${Math.max(0, Math.min(1, share))})`;
    },
    hide() {
      shown(root, false);
    },
  };
}
