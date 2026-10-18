import { coin, points } from '../shared/util';
import { built } from '../shared/built';
import { el, itemDetailsClosed, itemFace, itemIcons, mainStatLine, SLOT_NAME, tmSections, rich } from '../shared/items';
import { ESSENCE_NAME, type EssenceId } from '../protocol/heroes';
import type { DropView, RaidKind } from '../protocol/technomagic';
import { KEPT } from './assets';

/*
 * A fight over, over the field (the page's #result): won or lost, and then what this player got, as tiles: the points
 * the win paid them, the hero essences (the Dragon Raid's), and each piece of gear they found (the Dragon Raid's are raid items,
 * not TechnoMagic gear). A click on a piece opens its details over the screen (what it
 * is, its potentials, its set's effect and its additional skill); a click outside them, their ✕ or Escape goes back.
 * Under those, what everyone else found (their pieces open the same way), and the way on: run it again, back to getting
 * ready, or back to the games. Staged (the heroes posing behind it: ../main.ts), what was found shows first, over a dark
 * screen, until a tap anywhere but on a piece; then the way on.
 */

/** One of the ways on, along the bottom. */
export interface ResultAction {
  label: string;
  /** The site's main button (the rest are its dark ones). */
  main?: boolean;
  run: () => void;
}

export interface ResultShown {
  title: string;
  text: string;
  /** The points the win paid this player (0: none, and no tile for them). */
  points: number;
  /** The hero essences the win gave this player, so many of each kind (none: no tiles). */
  essences?: Readonly<Record<string, number>>;
  /** The gear this player found: TechnoMagic gear, or (the Dragon Raid's) raid items. */
  raid?: RaidKind;
  mine: readonly DropView[];
  /** What everyone else found, by name (only those who found something). */
  others: readonly { who: string; drops: readonly DropView[] }[];
  actions: readonly ResultAction[];
}

export interface Result {
  show(shown: ResultShown): void;
  hide(): void;
}

const className = (id: string): string => `${id[0]?.toUpperCase()}${id.slice(1)}`;

/** A piece of gear's card, as the armories draw TechnoMagic gear (never refined: no rank), or (`raid`) a raid item. */
function card(drop: DropView, extra = '', raid = false): HTMLElement {
  const face = el('span', `item ${extra}`.trim());
  face.dataset.stars = String(drop.stars);
  // (King's Raid's hero gear: its icon.)
  if (drop.icon) itemIcons.set(drop.itemId, drop.icon);
  face.append(...itemFace({ level: 1, maxLevel: raid ? 5 : 1, itemId: drop.itemId, slot: drop.slot, stars: drop.stars, heroOnly: !raid, itemClass: drop.itemClass }));
  return face;
}

export function makeResult(root: HTMLElement): Result {
  const title = root.querySelector('.message-title') as HTMLElement;
  const text = root.querySelector('.message-text') as HTMLElement;
  const rewards = root.querySelector('.tm-rewards') as HTMLElement;
  const others = root.querySelector('.tm-others') as HTMLElement;
  const actions = root.querySelector('.tm-result-actions') as HTMLElement;
  const detail = root.querySelector('.tm-loot') as HTMLElement;
  const tap = el('p', 'tm-tap', 'Tap to continue');
  actions.before(tap);
  // What was found shown over the dark (staged): a tap anywhere but on a piece, or on its details, goes on.
  root.addEventListener('click', (event) => {
    if (!root.classList.contains('rewarding') || (event.target as Element).closest('.tm-tile, .tm-loot')) return;
    root.classList.remove('rewarding');
  });

  function closeDetail(): void {
    if (detail.hidden) return;
    detail.hidden = true;
    detail.replaceChildren();
    itemDetailsClosed();
  }

  // Outside the details (on the dark around them), or Escape: back to the result.
  detail.addEventListener('click', (event) => {
    if (event.target === detail) closeDetail();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || detail.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    closeDetail();
  });

  /** Whether what was found is the Dragon Raid's (raid items), not TechnoMagic gear. */
  let raid = false;

  /** A piece's details, laid out as the gear page's: its name across the top, its card beside its slot, then what it does. */
  function openDetail(drop: DropView): void {
    const box = el('div', 'tm-loot-card');
    box.dataset.stars = String(drop.stars);
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', drop.name);

    const bar = el('div', 'tm-loot-bar');
    const close = el('button', 'detail-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.dataset.sfx = 'own';
    close.addEventListener('click', closeDetail);
    bar.append(el('h3', '', drop.name), close);

    const top = el('div', 'tm-loot-top');
    const info = el('div', 'tm-loot-info');
    // (Never refined, so no rank: its main stat in its place, King's Raid's at 5★; none for a treasure.)
    info.append(el('p', 'tm-loot-kind', `${raid ? `T${drop.stars} Raid` : 'TechnoMagic'} ${SLOT_NAME[drop.slot]}`), ...(drop.mainStat ? [mainStatLine(drop.mainStat, 'tm-loot-main')] : []));
    if (drop.itemClass) info.append(el('p', 'tm-loot-class', `${className(drop.itemClass)} only`));
    top.append(card(drop, 'tm-loot-face', raid), info);

    const body = el('div', 'tm-loot-body');
    if (drop.description) body.append(el('p', 'detail-desc', drop.description));
    // (A raid item has no potentials, set or additional skill: what it does is its description.)
    if (!raid) {
      body.append(el('p', 'tm-loot-label', 'Potentials'));
      const list = el('ul', 'detail-effects');
      for (const line of drop.potentials) list.appendChild(el('li')).append(rich(line));
      if (drop.potentials.length === 0) list.append(el('li', 'muted', 'No potentials.'));
      body.append(list, ...tmSections({ setEffect: drop.setEffect, additional: drop.skill }));
    }
    const note = el('p', 'tm-loot-note', raid ? 'Wear it yourself on the Gear page, or put it on a hero on the ' : 'Only heroes wear TechnoMagic gear: put it on one on the ');
    const link = el('a', '', 'Heroes page');
    link.href = '/heroes/';
    note.append(link, '.');
    body.append(note);

    box.append(bar, top, body);
    detail.replaceChildren(box);
    detail.hidden = false;
    close.focus();
  }

  /** A piece found, as a tile: its card and its name under it, opening its details. */
  function gearTile(drop: DropView, small = false): HTMLElement {
    const tile = el('button', `tm-tile${small ? ' small' : ''}`);
    tile.type = 'button';
    tile.title = `${drop.name}: see its details`;
    tile.append(card(drop, '', raid), el('span', 'tm-tile-name', drop.name));
    tile.addEventListener('click', () => openDetail(drop));
    return tile;
  }

  /** The points the win paid, as a tile beside the gear. */
  function pointsTile(amount: number): HTMLElement {
    const tile = el('div', 'tm-tile tm-tile-points');
    const face = el('span', 'tm-points-face');
    // (Only the coin: how many is under it.)
    face.append(coin('tm-points-coin', 'zeiucoins'));
    tile.append(face, el('span', 'tm-tile-name', `×${points(amount)} zeiucoins`));
    return tile;
  }

  /** So many of a kind of hero essence the win gave, as a tile beside the points. */
  function essenceTile(id: string, amount: number): HTMLElement {
    const tile = el('div', 'tm-tile tm-tile-points');
    // (The essence's picture is the whole tile.)
    const face = el('span', 'tm-points-face tm-essence-face');
    const picture = el('img', 'tm-essence-art');
    picture.src = built(`${KEPT}/transcend/essences/${id}.png`);
    picture.alt = '';
    face.append(picture);
    tile.append(face, el('span', 'tm-tile-name', `${ESSENCE_NAME[id as EssenceId] ?? id} ×${points(amount)}`));
    return tile;
  }

  return {
    show(shown) {
      closeDetail();
      raid = shown.raid === 'dragon';
      title.textContent = shown.title;
      text.textContent = shown.text;
      const essences = Object.entries(shown.essences ?? {}).filter(([, amount]) => amount > 0);
      rewards.replaceChildren(
        ...(shown.points > 0 ? [pointsTile(shown.points)] : []),
        ...essences.map(([id, amount]) => essenceTile(id, amount)),
        ...shown.mine.map((drop) => gearTile(drop)),
      );
      rewards.hidden = rewards.childElementCount === 0;
      others.replaceChildren(
        ...shown.others.map(({ who, drops }) => {
          const row = el('li', 'tm-others-row');
          const tiles = el('div', 'tm-others-tiles');
          tiles.append(...drops.map((drop) => gearTile(drop, true)));
          row.append(el('span', 'tm-others-who', who), tiles);
          return row;
        }),
      );
      others.hidden = shown.others.length === 0;
      root.classList.toggle('rewarding', root.classList.contains('staged') && !(rewards.hidden && others.hidden));
      actions.replaceChildren(
        ...shown.actions.map(({ label, main, run }) => {
          const button = el('button', `action ${main ? 'main' : 'secondary'}`, label);
          button.type = 'button';
          button.addEventListener('click', run);
          return button;
        }),
      );
      root.hidden = false;
    },
    hide() {
      closeDetail();
      root.classList.remove('rewarding');
      root.hidden = true;
    },
  };
}
