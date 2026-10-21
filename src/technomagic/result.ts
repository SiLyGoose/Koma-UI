import { coin, points } from '../shared/util';
import { GEM_EMOJI } from '../forge/anvil/gem';
import { built } from '../shared/built';
import { el, itemDetailsClosed, itemFace, itemIcons, kindName, mainStatLine, shownName, tmSections, rich } from '../shared/items';
import { ESSENCE_NAME, type EssenceId } from '../protocol/heroes';
import type { DropView, RaidKind } from '../protocol/technomagic';
import { KEPT } from './assets';

/*
 * A fight over, over the field (the page's #result): won or lost, and then what this player got, as tiles: the points
 * the win paid them, the hero essences and komaGems (the Dragon Raid's; komaGems only the first time at a stage), and each piece of gear they found (the Dragon Raid's are raid items,
 * not TechnoMagic gear). A click on a piece opens its details over the screen (what it
 * is, its potentials, its set's effect and its additional skill); a click outside them, their ✕ or Escape goes back.
 * Under those, what everyone else found (their pieces open the same way), what each hero did in the fight (Battle Stats:
 * its damage dealt, healing given, damage its defense took off and shields given), and the way on: run it again, back to
 * getting ready, or back to the games. Staged (the heroes posing behind it: ../main.ts), what was found shows first, over a
 * dark screen, until a tap anywhere but on a piece; then the stats and the way on.
 */

/** One of the ways on, along the bottom. */
export interface ResultAction {
  label: string;
  /** What its round button shows (staged: King's Raid's round button, ../../public/kr/ui/round-button.webp). */
  icon: ResultIcon;
  /** The site's main button (the rest are its dark ones). */
  main?: boolean;
  /** Small, after its name (how many are in for running it again). */
  note?: string;
  /** Pressed already: shown, not pressable. */
  disabled?: boolean;
  title?: string;
  run: () => void;
}

export type ResultIcon = 'again' | 'prep' | 'games';

/** Each way on's symbol, in gold as King's Raid's round buttons draw theirs: going again, back to getting ready (crossed swords), the games (a controller). */
const ICONS: Record<ResultIcon, string> = {
  again: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  prep: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  games: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
};

/** A way on's round button: King's Raid's, its symbol in gold (shown only staged: styles/over.css). */
function ring(icon: ResultIcon): HTMLElement {
  const round = el('span', 'tm-act-ring');
  round.setAttribute('aria-hidden', 'true');
  round.innerHTML = `<svg viewBox="0 0 24 24"><defs><linearGradient id="tm-gold-${icon}" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22"><stop offset="0" stop-color="#fff6dc"/><stop offset="0.55" stop-color="#ebc97f"/><stop offset="1" stop-color="#a8772f"/></linearGradient></defs><g stroke="url(#tm-gold-${icon})">${ICONS[icon]}</g></svg>`;
  return round;
}

/** What a hero did in the fight, for Battle Stats. */
export interface ResultStat {
  name: string;
  /** Its picture (the meter's). */
  face: string;
  /** Whose it is, in a room with others (1P, 2P…); and whether it is this player's. */
  tag?: string;
  mine: boolean;
  dealt: number;
  healed: number;
  mitigated: number;
  shielded: number;
}

/** Battle Stats' columns: each a number every hero has, what heads it, and what it is. */
const STAT_COLUMNS = [
  { key: 'dealt', name: 'Damage', about: 'Damage dealt' },
  { key: 'healed', name: 'Healing', about: 'Healing given' },
  { key: 'mitigated', name: 'Mitigated', about: 'Damage its defense took off: its DEF, blocks, less damage taken, and blows dodged' },
  { key: 'shielded', name: 'Shielded', about: 'Shields given' },
] as const;

/** A number in a few figures (12.3K, 4.56M): the whole of it on pointing at it. */
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 });

export interface ResultShown {
  title: string;
  text: string;
  /** The points the win paid this player (0: none, and no tile for them). */
  points: number;
  /** The hero essences the win gave this player, so many of each kind (none: no tiles). */
  essences?: Readonly<Record<string, number>>;
  /** The komaGems the win gave this player (none: no tile), and how many stages it cleared for them for the first time (what pays them). */
  gems?: number;
  firstClears?: number;
  /** The gear this player found: TechnoMagic gear, or (the Dragon Raid's) raid items. */
  raid?: RaidKind;
  mine: readonly DropView[];
  /** What everyone else found, by name (only those who found something). */
  others: readonly { who: string; drops: readonly DropView[] }[];
  /** What each hero did in the fight (none: no Battle Stats). */
  stats?: readonly ResultStat[];
  actions: readonly ResultAction[];
}

export interface Result {
  show(shown: ResultShown): void;
  /** The ways on drawn again, the rest as it is (the room changed: who is in for running it again). */
  actions(actions: readonly ResultAction[]): void;
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
  const stats = el('section', 'tm-stats');
  stats.setAttribute('aria-label', 'Battle Stats');
  tap.before(stats);
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
    box.setAttribute('aria-label', shownName(drop));

    const bar = el('div', 'tm-loot-bar');
    const close = el('button', 'detail-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.dataset.sfx = 'own';
    close.addEventListener('click', closeDetail);
    bar.append(el('h3', '', shownName(drop)), close);

    const top = el('div', 'tm-loot-top');
    const info = el('div', 'tm-loot-info');
    // (Never refined, so no rank: its main stat in its place, King's Raid's at 5★; none for a treasure.)
    info.append(el('p', 'tm-loot-kind', `${raid ? `T${drop.stars} Raid` : 'TechnoMagic'} ${kindName(drop)}`), ...(drop.mainStat ? [mainStatLine(drop.mainStat, 'tm-loot-main')] : []));
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
    tile.title = `${shownName(drop)}: see its details`;
    tile.append(card(drop, '', raid), el('span', 'tm-tile-name', shownName(drop)));
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

  /** The komaGems the win gave, as a tile beside the essences, with the stages it cleared for the first time under it (`first`). */
  function gemsTile(amount: number, first: number): HTMLElement {
    const tile = el('div', 'tm-tile tm-tile-points');
    const face = el('span', 'tm-points-face tm-gems-face');
    face.append(rich(GEM_EMOJI));
    tile.append(face, el('span', 'tm-tile-name', `×${points(amount)} komaGems`));
    if (first > 0) {
      tile.title = first === 1 ? 'First clear: komaGems come only the first time a stage is cleared' : `${first} first clears: a win clears every stage under it too, and each pays komaGems once`;
      tile.append(el('span', 'tm-tile-first', first === 1 ? 'First clear' : `${first} first clears`));
    }
    return tile;
  }

  /** Battle Stats: a row for each hero, the most damage first; the most of each column in gold. */
  function drawStats(rows: readonly ResultStat[]): void {
    stats.hidden = rows.length === 0;
    if (stats.hidden) return stats.replaceChildren();
    const most = Object.fromEntries(STAT_COLUMNS.map(({ key }) => [key, Math.max(...rows.map((row) => row[key]))]));
    const table = el('table', 'tm-stats-table');
    const head = table.createTHead().insertRow();
    head.append(el('th', 'tm-stats-hero', 'Hero'));
    for (const { name, about } of STAT_COLUMNS) {
      const cell = el('th', '', name);
      cell.title = about;
      head.append(cell);
    }
    const body = table.createTBody();
    for (const row of [...rows].sort((a, b) => b.dealt - a.dealt)) {
      const line = body.insertRow();
      if (row.mine) line.className = 'mine';
      const hero = el('th', 'tm-stats-hero');
      hero.scope = 'row';
      const face = el('img', '');
      face.src = row.face;
      face.alt = '';
      face.draggable = false;
      const who = el('span', 'tm-stats-who');
      who.append(face, el('span', 'tm-stats-name', row.name));
      if (row.tag) who.append(el('span', 'tm-stats-tag', row.tag));
      hero.append(who);
      line.append(hero);
      for (const { key, about } of STAT_COLUMNS) {
        const value = row[key];
        const cell = el('td', value > 0 && value === most[key] ? 'best' : '', value > 0 ? short.format(value) : '–');
        cell.title = `${about}: ${points(Math.round(value))}`;
        line.append(cell);
      }
    }
    stats.replaceChildren(el('h3', 'tm-stats-title', 'Battle Stats'), table);
  }

  function drawActions(list: readonly ResultAction[]): void {
    actions.replaceChildren(
      ...list.map(({ label, icon, main, note, disabled, title, run }) => {
        const button = el('button', `action tm-act ${main ? 'main' : 'secondary'}`);
        button.type = 'button';
        button.disabled = disabled === true;
        if (title) button.title = title;
        const name = el('span', 'tm-act-label', label);
        if (note) name.append(' ', el('span', 'tm-act-note', note));
        button.append(name, ring(icon));
        button.addEventListener('click', run);
        return button;
      }),
    );
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
        ...((shown.gems ?? 0) > 0 ? [gemsTile(shown.gems ?? 0, shown.firstClears ?? 0)] : []),
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
      drawStats(shown.stats ?? []);
      root.classList.toggle('rewarding', root.classList.contains('staged') && !(rewards.hidden && others.hidden));
      drawActions(shown.actions);
      root.hidden = false;
    },
    actions: drawActions,
    hide() {
      closeDetail();
      root.classList.remove('rewarding');
      root.hidden = true;
    },
  };
}
