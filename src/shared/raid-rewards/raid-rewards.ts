import './raid-rewards.css';
import { built } from '../built';
import { coin } from '../util/coin';
import { ANY_CLASS, itemFace } from '../items/items';
import type { RaidReward } from '../raids';
import { rich } from '../items/items';
import { GEM_EMOJI } from '../../forge/anvil/gem';

/*
 * What a win against a boss gives (../raids.ts), as icons (./raid-rewards.css): zeiucoins, komaGems, essences (one rolled: a ?), and
 * gear (its slot's icon; TechnoMagic gear as the armories' TM card; a kind of a set's gear as King's Raid's icon for it). In
 * the front page's Raid List (../../hub/raid-list.ts), in a raid's Raid Info (../../technomagic/prep/prep.ts) and in the
 * databank's raid bosses (../../databank/bosses.ts).
 */

/**
 * A kind of gear a win gives (a set's armor, its orb…): King's Raid's icon for one (public/kr/items/<icon>.webp), the kind,
 * and the piece it shows; `open`, what clicking it does (none: it doesn't click).
 */
export interface GearKind {
  kind: 'piece';
  icon: string;
  name: string;
  piece: string;
  open?: () => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// (Not lazy: they are small, and in a box that opens from nothing they'd be read only as it opens.)
const image = (src: string): HTMLImageElement => {
  const img = el('img', 'raid-reward-art');
  img.src = src;
  img.alt = '';
  return img;
};

const icon = (reward: RaidReward | GearKind): [HTMLElement, string, string] => {
  switch (reward.kind) {
    case 'piece':
      return [image(`/kr/items/${reward.icon}.webp`), reward.name, 'piece'];
    case 'points':
      return [coin('raid-reward-art', ''), 'zeiucoins', 'points'];
    case 'gems': {
      // (The bot's emoji for them, as the raid shop draws them.)
      const gem = rich(GEM_EMOJI).firstChild as HTMLImageElement;
      gem.className = 'raid-reward-art';
      return [gem, 'komaGems', 'gems'];
    }
    case 'essence':
      return reward.id === null
        ? [el('span', 'raid-reward-any', '?'), 'Any essence', 'essence']
        : [image(built(`/technomagic/transcend/essences/${reward.id}.png`)), `${reward.id[0]?.toUpperCase()}${reward.id.slice(1)}`, 'essence'];
    case 'gear':
      return [image(`/gear/slots/${reward.slot}.png`), reward.name, 'gear'];
    case 'tm':
      return [el('span'), reward.name, 'tm'];
  }
};

/** A TechnoMagic card, as the armories draw TM gear: its slot's picture, its "TM" tab, and "?" for its class (a set's pieces come in every class). */
const tmCard = (slot: 'weapon' | 'armor'): HTMLElement => {
  const card = el('span', 'item raid-reward-tm');
  card.dataset.stars = '4';
  card.append(...itemFace({ level: 1, maxLevel: 1, itemId: '', slot, stars: 4, heroOnly: true, itemClass: ANY_CLASS }));
  return card;
};

/** "Rewards", a row of `rewards`' icons, and `note` under them. */
export function raidRewards(rewards: readonly (RaidReward | GearKind)[], note: string): HTMLElement {
  const box = el('div', 'raid-rewards');
  box.append(el('p', 'raid-rewards-label', 'Rewards'));
  const list = el('ul', 'raid-rewards-list');
  list.append(
    ...rewards.map((reward) => {
      const [picture, name, kind] = icon(reward);
      const item = el('li', 'raid-reward');
      item.title = reward.kind === 'piece' ? reward.piece : name;
      if (reward.kind === 'tm') item.append(tmCard(reward.slot), el('span', 'raid-reward-name', name));
      else {
        const open = reward.kind === 'piece' ? reward.open : undefined;
        const face = el(open ? 'button' : 'span', `raid-reward-face reward-${kind}`);
        if (open && face instanceof HTMLButtonElement) {
          face.type = 'button';
          face.setAttribute('aria-label', `${name}: see a sample`);
          face.addEventListener('click', open);
        }
        face.append(picture);
        item.append(face, el('span', 'raid-reward-name', name));
      }
      return item;
    }),
  );
  box.append(list, el('p', 'raid-rewards-note', note));
  return box;
}
