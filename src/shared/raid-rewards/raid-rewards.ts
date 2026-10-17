import './raid-rewards.css';
import { built } from '../built';
import { coin } from '../util/coin';
import { ANY_CLASS, itemFace } from '../items/items';
import type { RaidReward } from '../raids';

/*
 * What a win against a boss gives (../raids.ts), as icons (./raid-rewards.css): zeiucoins, essences (one rolled: a ?), and
 * gear (its slot's icon; TechnoMagic gear as the armories' TM card). In the front page's Raid List (../../hub/raid-list.ts)
 * and in a raid's Raid Info (../../technomagic/prep/prep.ts).
 */

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

const icon = (reward: RaidReward): [HTMLElement, string, string] => {
  switch (reward.kind) {
    case 'points':
      return [coin('raid-reward-art', ''), 'Zeiucoins', 'points'];
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
export function raidRewards(rewards: readonly RaidReward[], note: string): HTMLElement {
  const box = el('div', 'raid-rewards');
  box.append(el('p', 'raid-rewards-label', 'Rewards'));
  const list = el('ul', 'raid-rewards-list');
  list.append(
    ...rewards.map((reward) => {
      const [picture, name, kind] = icon(reward);
      const item = el('li', 'raid-reward');
      item.title = name;
      if (reward.kind === 'tm') item.append(tmCard(reward.slot), el('span', 'raid-reward-name', name));
      else {
        const face = el('span', `raid-reward-face reward-${kind}`);
        face.append(picture);
        item.append(face, el('span', 'raid-reward-name', name));
      }
      return item;
    }),
  );
  box.append(list, el('p', 'raid-rewards-note', note));
  return box;
}
