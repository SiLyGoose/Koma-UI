import { el } from '../dom';
import type { RaidFightView } from '../protocol';
import { plural } from '../words';

/**
 * The buffs on a raider, as little squares under their HP (public/raid/buff/buff_<name>.png), each with a
 * blue up arrow for a buff: Attack while Support's rally lasts (everyone standing, with its turns
 * left), and Guard once they've picked it this turn (their guard is up for the boss's next move).
 */
export function buffRow(p: RaidFightView['players'][number], f: RaidFightView): HTMLElement {
  const row = el('div', 'rd-buffs');
  const buff = (name: 'attack' | 'guard', title: string, count?: number): void => {
    const square = el('span', 'rd-buff');
    square.title = title;
    const icon = el('img');
    icon.src = `/raid/buff/buff_${name}.png`;
    icon.alt = '';
    icon.draggable = false;
    square.append(icon, el('span', 'rd-buff-up'));
    if (count !== undefined) square.append(el('span', 'rd-buff-count', String(count)));
    row.append(square);
  };
  if (p.hp > 0 && f.rallied > 0) buff('attack', `Rallied: attacks ×${f.rallyMultiplier} for ${plural(f.rallied, 'more turn', 'more turns')}`, f.rallied);
  if (p.hp > 0 && p.picked === 'guard') buff('guard', 'Guarding this turn');
  return row;
}
