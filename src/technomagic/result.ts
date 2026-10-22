import { coin, dust, points } from '../shared/util';
import { GEM_EMOJI } from '../forge/anvil/gem';
import { built } from '../shared/built';
import { el, itemDetailsClosed, itemFace, itemIcons, kindName, mainStatLine, shownName, tmSections, rich } from '../shared/items';
import { ESSENCE_NAME, type EssenceId } from '../protocol/heroes';
import type { DropView, RaidKind } from '../protocol/technomagic';
import { niceScale } from '../raid/result/nice-scale';
import { KEPT } from './assets';

/*
 * A fight over, over the field (the page's #result): won or lost, and then what this player got, as tiles: the points
 * the win paid them, the hero essences and komaGems (the Dragon Raid's; komaGems only the first time at a stage), and each piece of gear they found (the Dragon Raid's are raid items,
 * not TechnoMagic gear). A click on a piece opens its details over the screen (what it
 * is, its potentials, its set's effect and its additional skill); a click outside them, their ✕ or Escape goes back.
 * Under those, what everyone else found (their pieces open the same way), Battle Stats (a button opening, over the screen,
 * what each hero did in the fight: its damage dealt, healing given, damage its defense took off, damage taken and shields given), and the
 * way on: run it again, back to getting ready, or back to the games. Staged (the heroes posing behind it: ../main.ts), what
 * was found shows first, over a dark screen, until a tap anywhere but on a piece; then Battle Stats and the way on.
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

export type ResultIcon = 'again' | 'prep' | 'games' | 'stats';

/** Each way on's symbol, in gold as King's Raid's round buttons draw theirs: going again, back to getting ready (crossed swords), the games (a controller); and Battle Stats' (bars). */
const ICONS: Record<ResultIcon, string> = {
  stats: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
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
  taken: number;
  shielded: number;
}

/** The stats Battle Stats can chart, in groups down its left (as the Weekly Boss's More stats has them), and what each is. */
const STATS = [
  { group: 'Offense', key: 'dealt', label: 'Damage Dealt', about: 'Damage its blows dealt' },
  { group: 'Support', key: 'healed', label: 'Healing Done', about: 'Healing its heals gave its allies and itself' },
  { group: 'Support', key: 'shielded', label: 'Amount Shielded', about: 'Shields it put on its allies and itself' },
  { group: 'Defense', key: 'mitigated', label: 'Damage Mitigated', about: 'Damage its defense took off the blows on it: its DEF, blocks, less damage taken, and blows dodged' },
  { group: 'Defense', key: 'taken', label: 'Damage Taken', about: 'Damage the blows on it dealt, after its defense: on its shields and its health' },
] as const;
type StatKey = (typeof STATS)[number]['key'];
/** The stat charted (the last picked, this page's). */
let charted: StatKey = 'dealt';

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
  // Battle Stats: a button (staged, King's Raid's round one in the bottom left corner) opening them in a popup in the
  // middle of the screen, the Weekly Boss's More stats (../raid/result/stats.ts): the stats to pick down its left, and
  // on its right every hero's bar for the one picked, from its picture, against a scale. A click outside it, its ✕ or
  // Escape closes it.
  const statsOpen = el('button', 'action secondary tm-act tm-stats-open');
  statsOpen.type = 'button';
  statsOpen.setAttribute('aria-haspopup', 'dialog');
  statsOpen.append(el('span', 'tm-act-label', 'Battle Stats'), ring('stats'));
  tap.before(statsOpen);
  const statsPop = el('div', 'rd-stats tm-stats-pop');
  statsPop.hidden = true;
  statsPop.setAttribute('role', 'dialog');
  statsPop.setAttribute('aria-modal', 'true');
  statsPop.setAttribute('aria-label', 'Battle Stats');
  const statsBox = el('div', 'rd-stats-box');
  const statsBody = el('div', 'rd-stats-body');
  const statsPick = el('div', 'rd-stats-pick');
  statsPick.setAttribute('role', 'radiogroup');
  statsPick.setAttribute('aria-label', 'Stat');
  const chart = el('div', 'rd-stats-chart');
  const chartTitle = el('h3', 'rd-stats-title');
  const chartScroll = el('div', 'rd-stats-scroll');
  const chartRows = el('div', 'rd-stats-rows');
  const chartAxis = el('div', 'rd-stats-axis');
  chartAxis.setAttribute('aria-hidden', 'true');
  chartScroll.append(chartRows);
  chart.append(chartTitle, chartScroll, chartAxis);
  statsBody.append(statsPick, chart);
  const statsClose = el('button', 'rd-gear-close', '✕');
  statsClose.type = 'button';
  statsClose.setAttribute('aria-label', 'Close');
  statsClose.dataset.sfx = 'own';
  statsBox.append(statsBody, statsClose);
  statsPop.append(statsBox);
  root.append(statsPop);
  // The choices: a radio for each stat, under its group's heading.
  let group = '';
  for (const stat of STATS) {
    if (stat.group !== group) {
      group = stat.group;
      statsPick.append(el('p', 'rd-stats-group', group));
    }
    const label = el('label', 'rd-stats-option');
    label.title = stat.about;
    const input = el('input');
    input.type = 'radio';
    input.name = 'tm-stat';
    input.value = stat.key;
    input.addEventListener('change', () => {
      charted = stat.key;
      drawChart();
    });
    label.append(input, el('span', 'rd-stats-radio'), el('span', '', stat.label));
    statsPick.append(label);
  }
  /** What each hero did in the fight shown. */
  let statRows: readonly ResultStat[] = [];
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

  function closeStats(): void {
    if (statsPop.hidden) return;
    statsPop.hidden = true;
    itemDetailsClosed();
    statsOpen.focus();
  }
  statsClose.addEventListener('click', closeStats);

  // Outside the details or Battle Stats (on the dark around them), or Escape: back to the result.
  detail.addEventListener('click', (event) => {
    if (event.target === detail) closeDetail();
  });
  statsPop.addEventListener('click', (event) => {
    if (event.target === statsPop) closeStats();
  });
  statsOpen.addEventListener('click', () => openStats());
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || (detail.hidden && statsPop.hidden)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!detail.hidden) closeDetail();
    else closeStats();
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
    const salvaged = drop.salvaged !== undefined;
    const note = el(
      'p',
      'tm-loot-note',
      salvaged
        ? `Salvaged as it dropped, for ${points(drop.salvaged ?? 0)} komaDust: your salvage rule takes it (Sell, then By rule, on the `
        : raid
          ? 'Wear it yourself on the Gear page, or put it on a hero on the '
          : 'Only heroes wear TechnoMagic gear: put it on one on the ',
    );
    const link = el('a', '', 'Heroes page');
    link.href = '/heroes/';
    note.append(link, salvaged ? ').' : '.');
    body.append(note);

    box.append(bar, top, body);
    detail.replaceChildren(box);
    detail.hidden = false;
    close.focus();
  }

  /**
   * A piece found, as a tile: its card and its name under it, opening its details. One salvaged as it dropped (their
   * salvage rule's): its card greyed and stamped Salvaged, and the komaDust it gave under its name.
   */
  function gearTile(drop: DropView, small = false): HTMLElement {
    const salvaged = drop.salvaged !== undefined;
    const tile = el('button', `tm-tile${small ? ' small' : ''}${salvaged ? ' salvaged' : ''}`);
    tile.type = 'button';
    tile.title = salvaged ? `${shownName(drop)}: salvaged for ${points(drop.salvaged ?? 0)} komaDust as it dropped` : `${shownName(drop)}: see its details`;
    const face = card(drop, '', raid);
    if (salvaged) face.append(el('span', 'tm-salvaged-stamp', 'Salvaged'));
    const name = el('span', 'tm-tile-name', shownName(drop));
    if (salvaged) {
      const gave = el('span', 'tm-tile-dust', `+${points(drop.salvaged ?? 0)} `);
      gave.append(dust('tm-dust', 'komaDust'));
      name.append(gave);
    }
    tile.append(face, name);
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

  /**
   * The stat picked, charted: every hero in the fight's order, a bar each from its picture (its name and whose over it;
   * this player's in gold) against a round scale, its lines down the bars and its numbers along the bottom.
   */
  function drawChart(): void {
    for (const input of statsPick.querySelectorAll('input')) input.checked = input.value === charted;
    const stat = STATS.find(({ key }) => key === charted) ?? STATS[0];
    chartTitle.textContent = stat.label;
    const { top, step } = niceScale(Math.max(0, ...statRows.map((row) => row[stat.key])));
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const grid = el('div', 'rd-stats-grid');
    grid.setAttribute('aria-hidden', 'true');
    for (const tick of ticks) {
      const line = el('span');
      line.style.left = `${(tick / top) * 100}%`;
      grid.append(line);
    }
    chartRows.replaceChildren(
      grid,
      ...statRows.map((row) => {
        const value = row[stat.key];
        const line = el('div', `rd-stats-row${row.mine ? ' you' : ''}`);
        line.title = `${row.name}${row.tag ? ` (${row.tag})` : ''}: ${points(Math.round(value))}`;
        const face = el('span', 'rd-stats-face');
        const picture = el('img', '');
        picture.src = row.face;
        picture.alt = '';
        picture.draggable = false;
        face.append(picture);
        const who = el('span', 'tm-stats-who', row.name);
        if (row.tag) who.append(' ', el('span', 'tm-stats-tag', row.tag));
        const track = el('span', 'rd-stats-track');
        const bar = el('span', 'rd-stats-bar');
        bar.style.width = `${(value / top) * 100}%`;
        track.append(bar, el('b', 'rd-stats-value', short.format(value)));
        const words = el('span', 'tm-stats-line');
        words.append(who, track);
        line.append(face, words);
        return line;
      }),
    );
    chartAxis.replaceChildren(
      ...ticks.map((tick) => {
        const label = el('span', '', short.format(tick));
        label.style.left = `${(tick / top) * 100}%`;
        return label;
      }),
    );
  }

  function openStats(): void {
    drawChart();
    statsPop.hidden = false;
    statsClose.focus();
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
      closeStats();
      statRows = shown.stats ?? [];
      statsOpen.hidden = statRows.length === 0;
      root.classList.toggle('rewarding', root.classList.contains('staged') && !(rewards.hidden && others.hidden));
      drawActions(shown.actions);
      root.hidden = false;
    },
    actions: drawActions,
    hide() {
      closeDetail();
      closeStats();
      root.classList.remove('rewarding');
      root.hidden = true;
    },
  };
}
