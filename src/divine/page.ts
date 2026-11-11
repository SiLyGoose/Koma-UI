import { el } from '../shared/items';
import { API, busyWith, type Busy } from '../shared/ui';
import { levelPopup } from '../shared/ui/level/level';
import { navigate } from '../shared/transition';
import { coin, points } from '../shared/util';
import { DIVINE_CARDS } from '../shared/raids';
import { api, currentMe, currentServer, hasSession, loadMe, playGame } from './bot';
import { infiniteAtk, infiniteHp } from '../technomagic/sim/bosses/divine/levels';
import { rewardItem } from '../technomagic/divine-items';
import type { DivineDungeonView, DivineError, DivineGroupId, DivineGroupView, DivineRewardItem, DivineRewardsView, DivineView } from '../protocol/divine';

/*
 * King's Raid's Divine Punishment Raid (the bot's /api/divine; its fights are the raid page's, games/divine/), its windows as
 * the game goes through them (NGame2.NUI.NManager/PunishManagment.cs), each the game's 1920×1080 screen with its parts where its
 * prefab has them (KR-extracted's dump of the CBT2 client: public/kr/ui/divine/ are its pictures), in the games' frame (./main.ts,
 * games/punishment/), a hash each (kept in place: the browser's back leaves the game, as every game's does; the frame's ← goes a
 * window up):
 *   (none)                    PunishmentMainWindow: a group at a time between the goddess statues (its boss, its arrows to the
 *                             others: Solenis' still to come), and Enter
 *   #<group>                  PunishmentDungeonTypeSelectWindow: its Boss Dungeon card (King's Raid's Karma Dungeon, and the
 *                             Shards it fills, are left out for now):
 *                             locked, Unlock and its price (PunishmentLevelSelectPopup first: the Infinite level, 1 to the one
 *                             after their best, with what it adds to the bosses); unlocked, the time left, its clears, Enter
 *                             and Reset
 *   #<group>/boss             PunishmentRaidWindow: its map, the dragons' towers round her arena, a portrait and a name for each,
 *                             the level unlocked top left, and under her the Domain Skills (each lit, and its tower, once its
 *                             dragon is defeated)
 * Each window's art (the statues, the backdrop, the map and what stands on it) covers the whole frame (the `scene`, at --s); its
 * buttons and words keep the game's screen inside it (at --u), never cut off.
 * Both have King's Raid's Reward List (PunishmentRaidRewardInfoPopup: the bot's /api/divine/rewards), the Boss Dungeon card's
 * beside its Unlock or Enter, the map's bottom right: a level picked (1 to five past their best), her Clear Reward, and each
 * dragon's Dynamic Reward (what clearing it takes off hers), darkened once cleared in this opening.
 * An opening lasts 7 days, each dragon beaten once in it and two at most (each left alive lends her its strength), her win
 * closing it. A name pressed asks "This is …'s dungeon. Do you want to enter?" (she, with every dragon alive, "her power is at her
 * greatest"), then opens the raid page against it, alone (4 Main and 4 Sub heroes). Its (?) opens Raid
 * Info. Prices are King's Raid's Stamina numbers, in zeiucoins. Back goes a window up (from the groups, to the games).
 */

type Screen = { kind: 'groups'; group: DivineGroupId | null } | { kind: 'types'; group: DivineGroupId } | { kind: 'map'; group: DivineGroupId };

const ART = '/kr/ui/divine';

/** The groups, as the main window has them (Boss-type PunishmentGroups): their boss's name and title (CREATURE_DESC), picture, and whether they're here yet. */
const GROUPS: readonly { id: DivineGroupId; name: string; title: string; picture: string; card: string; open: boolean }[] = [
  { id: 'apocalypsion', name: 'Apocalypsion', title: 'Calamity of Destruction', picture: 'PunishmentRaid_Apocalypsion_Image', card: 'PUNISHMENTRAID_BOSS_APOCALYPSION', open: true },
  { id: 'solenis', name: 'Solenis', title: 'Holy Guardian of Goddess', picture: 'PunishmentRaid_Solenis_Image', card: 'PUNISHMENTRAID_BOSS_SOLENIS', open: false },
];

/**
 * Each boss on the map (PunishmentRaidTable): its name there (EntryLocalKey: the dragons by kind), where its name stands and its
 * portrait (EntryPosition, PortraitPosition: the game's units from the screen's middle, y up), the side its portrait's line
 * runs to its tower (none: hers, a stem down to her name), its mini portrait, its picture on the Reward List (ImagePath), its
 * tower's light (lit while it isn't beaten: the game's UI.Punishment.Entry.*.Loop, at its tower's crystal) and its Domain Skill
 * (PunishmentRaidTriggerTable: its colour, and King's Raid's words for it).
 */
const MAP: Readonly<
  Record<string, { name: string; entry: [number, number]; portrait: [number, number]; line: 1 | -1 | null; icon: string; picture: string; light: { picture: string; at: [number, number] }; domain?: { color: string; title: string; about: string } }>
> = {
  'dp-temeraire': {
    name: 'Fire Dragon',
    entry: [-370, 40],
    portrait: [-504, 260],
    line: 1,
    icon: 'Dragon_Fire',
    picture: 'PunishmentRaid_DragonRed_Image',
    light: { picture: 'Punishment_Entry_Dragon_RedTowerLight', at: [-380, 250] },
    domain: { color: '#f60000', title: "Temeraire's Flame", about: "Uses Temeraire's Flame to greatly reduce enemy's P.DMG and deal massive DMG with [Blessing of the Flame]. This effect is deactivated upon defeating Temeraire." },
  },
  'dp-scalaxia': {
    name: 'Frost Dragon',
    entry: [370, 40],
    portrait: [504, 260],
    line: -1,
    icon: 'Dragon_Ice',
    picture: 'PunishmentRaid_DragonIce_Image',
    light: { picture: 'Punishment_Entry_Dragon_BlueTowerLight', at: [372, 250] },
    domain: { color: '#017df1', title: "Scalaxia's Chill", about: "Uses Scalaxia's Chill to greatly reduce enemy's M.DMG and inflict Frost continuously. This effect is deactivated upon defeating Scalaxia." },
  },
  'dp-zyrrkinoth': {
    name: 'Poison Dragon',
    entry: [-700, -280],
    portrait: [-830, 0],
    line: 1,
    icon: 'Dragon_Poison',
    picture: 'PunishmentRaid_DragonPoison_Image',
    light: { picture: 'Punishment_Entry_Dragon_GreenTowerLight', at: [-704, 76] },
    domain: { color: '#3af700', title: "Zyrrkinoth's Poison", about: "Uses Zyrrkinoth's Poison to reduce the enemy's Crit Chance and Heal Rate, and deal continuous DMG. This effect is deactivated upon defeating Zyrrkinoth." },
  },
  'dp-armarta': {
    name: 'Black Dragon',
    entry: [700, -280],
    portrait: [830, 0],
    line: -1,
    icon: 'Dragon_Black',
    picture: 'PunishmentRaid_DragonBlack_Image',
    light: { picture: 'Punishment_Entry_Dragon_PurpleTowerLight', at: [700, 76] },
    domain: { color: '#8000f8', title: "Armarta's Storm", about: "Uses Armarta's Storm to continuously increase the target's Cooldown and inflict Stun. This effect is deactivated upon defeating Armarta." },
  },
  apocalypsion: { name: 'Apocalypsion', entry: [0, -130], portrait: [0, 260], line: null, icon: 'Boss_Apocalypsion', picture: 'PunishmentRaid_Apocalypsion_Image', light: { picture: 'Punishment_Entry_Center_TowerLight', at: [0, -20] } },
};

/** The map's line along its bottom (the group's guidance: Label_Info). */
const GUIDANCE: Readonly<Record<DivineGroupId, string>> = {
  apocalypsion:
    'Apocalypsion is very powerful due to the surrounding Dragons. You can defeat the surrounding Dragons first to weaken her. However, doing so will reduce the rewards you receive upon defeating Apocalypsion. Up to 2 Dragons can be defeated at a time.',
  solenis: 'Each time a Mid-Boss is defeated, Solenis becomes stronger and the rewards increase.',
};

/** The Reward List's caution under Dynamic Rewards (King's Raid's, its two colours). */
const CAUTION: Readonly<Record<DivineGroupId, [string, string][]>> = {
  apocalypsion: [
    ['#978d83', 'Whenever you clear each Dragon dungeon, '],
    ['#ff8102', "Apocalypsion's dynamic rewards are reduced."],
  ],
  solenis: [
    ['#ff8102', 'Reward of Solenis increases '],
    ['#978d83', 'whenever each Mid-Boss is cleared.'],
  ],
};

/** The Infinite levels the bot's rewards are tabled for (its DP_REWARD_LEVELS): the Reward List goes no further. */
const REWARD_LEVELS = 110;

/** How often the opening's time left is said again (King's Raid's counts the seconds). */
const TICK_MS = 1000;

const ERRORS: Partial<Record<DivineError, string>> = {
  too_poor: "You don't have enough zeiucoins for that.",
  already_open: 'Its dungeons are unlocked already.',
  bad_level: 'That level can’t be unlocked yet.',
  not_open: 'This Dungeon is Closed.',
  busy: 'Something else is being done for you right now. Try again in a moment.',
};

/** The window an address's hash is (#apocalypsion, #apocalypsion/boss; a group this page hasn't yet: the main window, on it). */
function screenAt(hash: string): Screen {
  const [group, kind] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const known = GROUPS.find((one) => one.id === group);
  if (!known?.open) return { kind: 'groups', group: known?.id ?? null };
  return kind === 'boss' ? { kind: 'map', group: known.id } : { kind: 'types', group: known.id };
}
const hashOf = (screen: Screen): string => (screen.kind === 'groups' ? '' : `#${screen.group}${screen.kind === 'map' ? '/boss' : ''}`);

/** What's left of an opening's 7 days, as King's Raid's GetRemainTimeTextAll says it. */
function left(expires: string): string {
  const s = Math.max(0, Math.floor((Date.parse(expires) - Date.now()) / 1000));
  const parts: [number, string][] = [
    [Math.floor(s / 86_400), 'Day'],
    [Math.floor(s / 3600) % 24, 'Hour'],
    [Math.floor(s / 60) % 60, 'Min'],
    [s % 60, 'Sec'],
  ];
  return parts
    .filter(([n], i) => n > 0 || i === 3)
    .map(([n, word]) => `${n} ${word}${n === 1 ? '' : 's'}`)
    .join(' ');
}

/** Part of a window's art, scaled with it to cover the whole frame (./divine.css --s), not kept inside the game's screen. */
function scene<T extends HTMLElement>(node: T): T {
  node.classList.add('dp-scene');
  return node;
}

/** An element at a place on a window: `x`, `y` in the game's units from its middle (y up). */
function at<T extends HTMLElement>(node: T, x: number, y: number): T {
  node.classList.add('dp-at');
  node.style.setProperty('--x', String(x));
  node.style.setProperty('--y', String(y));
  return node;
}
const picture = (name: string, className: string): HTMLImageElement => {
  const img = el('img', className);
  img.src = `${ART}/${name}.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
};
const price = (amount: number, short = false): HTMLElement[] => [coin('outfit-coin', 'zeiucoins'), el('span', short ? 'price-short' : '', points(amount))];

/**
 * The page in its game frame (./main.ts): `back` is the frame's ←, `title` its name and `balance` where the zeiucoins go in its
 * bar; `conn` says how asking the bot went (and lifts the loading screen).
 */
export interface DivineFrame {
  back: HTMLButtonElement;
  title: HTMLElement;
  balance: HTMLElement;
  conn(text: string, kind: 'ok' | 'bad'): void;
}

export function mount(root: HTMLElement, frame: DivineFrame): void {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const ui = {
    back: frame.back,
    title: frame.title,
    balance: frame.balance,
    status: $('status'),
    groups: $('groups'),
    types: $('types'),
    map: $('map'),
    ask: $('ask'),
    askTitle: $('ask-title'),
    askText: $('ask-text'),
    askCancel: $<HTMLButtonElement>('ask-cancel'),
    askConfirm: root.querySelector('[data-ask="confirm"]') as HTMLButtonElement,
  };
  let view: DivineView | null = null;
  let screen = screenAt(location.hash);
  /** The group the main window shows. */
  let shown = GROUPS.findIndex((one) => one.id === (screen.group ?? 'apocalypsion'));
  let busy: Busy | null = null;

  function status(text: string | null, bad = false): void {
    ui.status.hidden = text === null;
    ui.status.textContent = text ?? '';
    ui.status.classList.toggle('bad', bad);
  }

  /** Not logged in (or the login ran out): to the front page, to log in. */
  function loggedOut(): void {
    status('Log in on the games page first, then open the Divine Punishment Raid from there.', true);
    frame.conn('Logged out', 'bad');
  }

  /** Says why asking the bot didn't work (or, for a login that ran out, says to log in). */
  function failed(res: { status: number; error: string }, what: string): void {
    if (res.status === 401) return loggedOut();
    frame.conn('Offline', 'bad');
    if (res.status === 0) return void load();
    status(res.error === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : (ERRORS[res.error as DivineError] ?? what), true);
  }

  async function load(): Promise<void> {
    const server = currentServer();
    if (!server) return;
    const res = await api<DivineView>(`/api/divine?guild=${encodeURIComponent(server)}`);
    if (!res.ok) return failed(res, res.status === 404 ? 'The Divine Punishment Raid isn’t open yet.' : 'Could not load the Divine Punishment Raid.');
    view = res.data;
    status(null);
    frame.conn('Connected', 'ok');
    draw();
  }

  // ---- Asking first (King's Raid's PayShopMessage3ButtonPopup), or (no `then`) only saying something (its MessagePopup) ----

  let asked: (() => Promise<void> | void) | null = null;
  let askedFrom: HTMLElement | null = null;
  function ask(title: string, text: string, then: (() => Promise<void> | void) | null, from: HTMLElement | null): void {
    asked = then;
    askedFrom = from;
    ui.askTitle.textContent = title;
    ui.askText.textContent = text;
    ui.askCancel.hidden = then === null;
    ui.askConfirm.textContent = then ? 'Yes' : 'OK';
    ui.ask.hidden = false;
    ui.askConfirm.focus();
  }
  const closeAsk = (): void => {
    if (ui.ask.hidden) return;
    ui.ask.hidden = true;
    asked = null;
    if (askedFrom?.isConnected) askedFrom.focus();
    askedFrom = null;
  };
  ui.ask.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-ask]')?.dataset.ask;
    if (action === 'confirm') {
      const then = asked;
      closeAsk();
      if (then) void then();
    } else if (action === 'cancel' || e.target === ui.ask) closeAsk();
  });
  ui.ask.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAsk();
  });

  // ---- Unlocking: the level (PunishmentLevelSelectPopup), then its price ----

  const levels = levelPopup({ id: 'dp-level-pop', title: 'Select Level', label: 'Lv.', confirm: 'Unlock', down: 'Lower level', up: 'Higher level' });
  root.append(levels.root);
  let picking: { group: DivineGroupView; level: number; from: HTMLElement } | null = null;
  const most = (group: DivineGroupView): number => Math.max(1, Math.min(group.highest, view?.levels ?? group.highest));
  function drawLevels(): void {
    if (!picking) return;
    const { group } = picking;
    picking.level = Math.min(Math.max(1, picking.level), most(group));
    const level = picking.level;
    levels.picture.src = `${ART}/${GROUPS.find((one) => one.id === group.id)?.picture ?? 'PunishmentRaid_Apocalypsion_Image'}.webp`;
    levels.bossName.textContent = group.name;
    levels.number.textContent = String(level);
    levels.down.disabled = level <= 1;
    levels.up.disabled = level >= most(group);
    // (King's Raid's Additional Stats: the enemies' ATK from level 2, their max HP from level 6.)
    const atk = infiniteAtk(level) / 10;
    const hp = infiniteHp(level) / 10;
    const stats = [atk > 0 && `ATK +${points(atk)}%`, hp > 0 && `Max HP +${points(hp)}%`].filter(Boolean).join(', ');
    levels.note.textContent = `Rewards and difficulties differ for each stage. ${stats ? `Enemies: ${stats}.` : 'Enemies at their own strength.'} Up to Lv. ${points(most(group))} (one past your best, Lv. ${points(group.best)}).`;
  }
  const closeLevels = (): void => {
    if (!levels.root.hidden && picking?.from.isConnected) picking.from.focus();
    levels.root.hidden = true;
    picking = null;
  };
  levels.bind({
    step(by) {
      if (!picking) return;
      picking.level += by;
      drawLevels();
    },
    confirm() {
      if (!picking) return;
      const { group, level, from } = picking;
      closeLevels();
      const short = view !== null && group.price > view.balance;
      ask('Unlock', `${points(group.price)} zeiucoins will be used for unlocking ${group.name}'s Boss Dungeon at Lv. ${points(level)}. Used zeiucoins cannot be recovered. Unlock anyways?${short ? ` (You have ${points(view?.balance ?? 0)}.)` : ''}`, () => unlock(group, level), from);
    },
    close: closeLevels,
  });
  function pickLevel(group: DivineGroupView, from: HTMLElement): void {
    picking = { group, level: most(group), from };
    drawLevels();
    levels.root.hidden = false;
    levels.confirm.focus();
  }

  async function unlock(group: DivineGroupView, level: number): Promise<void> {
    const server = currentServer();
    if (busy || !server) return;
    busy = busyWith('unlock');
    status(null);
    const res = await api<DivineView>('/api/divine/open', { method: 'POST', body: JSON.stringify({ guild: server, group: group.id, type: 'boss', level }) });
    busy = null;
    if (!res.ok) {
      if (res.error === 'already_open' || res.error === 'bad_level') await load();
      return failed(res, 'Could not unlock it. Try again.');
    }
    view = res.data;
    draw();
  }

  async function reset(group: DivineGroupView): Promise<void> {
    const server = currentServer();
    if (busy || !server) return;
    busy = busyWith('reset');
    status(null);
    const res = await api<DivineView>('/api/divine/reset', { method: 'POST', body: JSON.stringify({ guild: server, group: group.id }) });
    busy = null;
    if (!res.ok) return failed(res, 'Could not reset it. Try again.');
    view = res.data;
    draw();
  }

  // ---- The Reward List (PunishmentRaidRewardInfoPopup): a level, her Clear Reward, each dragon's Dynamic Reward ----

  /** A button of the popup's (its parts placed as the game's prefab has them, from the popup's middle, y up). */
  const button = (className: string, text: string | null, label: string): HTMLButtonElement => {
    const one = el('button', className, text ?? undefined);
    one.type = 'button';
    one.setAttribute('aria-label', label);
    return one;
  };
  const rw = {
    root: el('div', 'dp-rewards'),
    box: el('div', 'dp-rw-box'),
    close: at(button('dp-rw-close', null, 'Close'), 678, 455),
    min: button('dp-rw-end', 'Min', 'Lowest level'),
    down: button('dp-rw-step left', null, 'Lower level'),
    level: el('span', 'dp-rw-level'),
    up: button('dp-rw-step right', null, 'Higher level'),
    max: button('dp-rw-end', 'Max', 'Highest level'),
    boss: at(picture('PunishmentRaid_Apocalypsion_Image', 'dp-rw-boss'), -390, -130),
    clear: el('div', 'dp-rw-items'),
    caution: el('p', 'dp-rw-caution'),
    cards: el('div', 'dp-rw-cards'),
    note: el('p', 'dp-rw-note'),
  };
  {
    const title = at(el('h3', 'dp-rw-title', 'Reward List'), 0, 455);
    title.id = 'dp-rw-title';
    rw.level.setAttribute('aria-live', 'polite');
    // (The level picker, CountInputField2: Min at -374, the arrows at ±274, the number between, Max at 374.)
    const pick = at(el('div', 'dp-rw-pick'), 0, 323);
    pick.append(rw.min, rw.down, rw.level, rw.up, rw.max);
    // Its right side, one column down the frame under the level picker (King's Raid's Clear Reward at 168, Dynamic Rewards at
    // -121, its caution and cards under it): laid out one under another, so on a small screen, where its words and tiles keep
    // a size that can be read, they push the rest down (and, at the last, scroll) rather than spill out of the frame.
    const side = at(el('div', 'dp-rw-side'), 300, -115);
    const deco = (): HTMLElement => el('span', 'dp-rw-deco');
    rw.root.hidden = true;
    rw.root.setAttribute('role', 'dialog');
    rw.root.setAttribute('aria-modal', 'true');
    rw.root.setAttribute('aria-labelledby', title.id);
    rw.box.append(
      at(el('span', 'dp-rw-frame'), 0, -61),
      title,
      rw.close,
      at(el('span', 'dp-rw-shadow'), 0, 236),
      pick,
      at(el('span', 'dp-rw-logo'), -390, -130),
      rw.boss,
      side,
    );
    const clearPart = el('div', 'dp-rw-part');
    clearPart.append(el('h4', 'dp-rw-head', 'Clear Reward'), deco(), rw.clear);
    const dynamicPart = el('div', 'dp-rw-part');
    dynamicPart.append(el('h4', 'dp-rw-head', 'Dynamic Rewards'), deco(), rw.caution, rw.cards);
    side.append(clearPart, rw.note, dynamicPart);
    rw.root.append(rw.box);
    root.append(rw.root);
  }
  /** What the popup shows: its group, the level picked, the most it goes to, and the lists fetched (by level). */
  let rewarding: { group: DivineGroupView; level: number; most: number; from: HTMLElement | null; lists: Map<number, DivineRewardsView> } | null = null;

  /** One reward's tile: its picture and its count (a chance: its percent), its name and what it's for on hover. */
  function rewardTile(item: DivineRewardItem): HTMLElement {
    const known = rewardItem(item.key);
    const chance = item.ratio !== undefined;
    const tile = el('span', `dp-rw-item${chance ? ' chance' : ''}`);
    if (known?.icon) {
      const img = el('img', 'dp-rw-item-art');
      img.src = known.icon;
      img.alt = '';
      img.draggable = false;
      tile.append(img);
    } else tile.append(el('span', 'dp-rw-item-art blank', '?'));
    const pct = `${points(Math.round((item.ratio ?? 0) / 10))}%`;
    tile.append(el('span', 'dp-rw-count', chance ? pct : points(item.count)));
    const name = known?.name ?? item.key;
    tile.title = `${chance ? `${name}: a ${pct} chance of one` : `${name} ×${points(item.count)}`}${known ? `\n${known.about}` : ''}`;
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', chance ? `${name}, ${pct} chance` : `${name} ×${points(item.count)}`);
    return tile;
  }

  function drawRewards(): void {
    if (!rewarding) return;
    const { group, level, most, lists } = rewarding;
    const one = GROUPS.find((g) => g.id === group.id);
    rw.boss.src = `${ART}/${one?.picture ?? 'PunishmentRaid_Apocalypsion_Image'}.webp`;
    rw.level.textContent = String(level);
    rw.min.disabled = rw.down.disabled = level <= 1;
    rw.max.disabled = rw.up.disabled = level >= most;
    rw.caution.replaceChildren(
      ...(CAUTION[group.id] ?? []).map(([color, text]) => {
        const part = el('span', '', text);
        part.style.color = color;
        return part;
      }),
    );
    const list = lists.get(level);
    rw.note.hidden = !!list;
    if (!list) {
      rw.clear.replaceChildren();
      rw.cards.replaceChildren();
      return;
    }
    rw.clear.style.setProperty('--n', String(Math.max(5, list.final.items.length)));
    rw.clear.replaceChildren(...list.final.items.map(rewardTile));
    // (A dragon cleared in this opening: King's Raid's ClearSprite over its card, its reward no longer hers.)
    const opening = openOf(group);
    rw.cards.replaceChildren(
      ...list.sides.map((side) => {
        const cleared = !!opening?.cleared.includes(side.id);
        const card = el('div', `dp-rw-card${cleared ? ' cleared' : ''}`);
        const name = MAP[side.id]?.name ?? side.name;
        card.title = cleared ? `${name} (${side.name}): cleared in this opening, so this is no longer part of ${list.final.name}'s reward` : `${name} (${side.name}): clearing it pays this, and takes it off ${list.final.name}'s reward`;
        const items = el('div', 'dp-rw-card-items');
        items.append(...side.items.map(rewardTile));
        card.append(picture(MAP[side.id]?.picture ?? MAP[side.id]?.icon ?? '', 'dp-rw-card-art'), items);
        return card;
      }),
    );
  }

  /** The list at the level picked, fetched if it isn't yet (pressed on meanwhile: kept, but only the level shown is drawn). */
  async function fetchRewards(): Promise<void> {
    const server = currentServer();
    if (!rewarding || !server || rewarding.lists.has(rewarding.level)) return;
    const asked = rewarding;
    const level = asked.level;
    rw.note.textContent = 'Loading…';
    const res = await api<DivineRewardsView>(`/api/divine/rewards?guild=${encodeURIComponent(server)}&group=${asked.group.id}&level=${level}`);
    if (rewarding !== asked) return;
    if (!res.ok) {
      if (res.status === 401) return loggedOut();
      if (asked.level === level) rw.note.textContent = res.error === 'bad_level' ? 'That level isn’t on the list.' : 'Could not load the rewards. Try again.';
      return;
    }
    asked.lists.set(level, res.data);
    asked.most = res.data.most;
    if (asked.level === level) drawRewards();
  }

  function stepRewards(to: number): void {
    if (!rewarding) return;
    rewarding.level = Math.min(Math.max(1, to), rewarding.most);
    drawRewards();
    void fetchRewards();
  }

  /** Opens the Reward List: at the opening's level while one is open, else the one after their best (King's Raid's), up to five past their best. */
  function showRewards(group: DivineGroupView, from: HTMLElement): void {
    const most = Math.max(1, Math.min(REWARD_LEVELS, group.best + 5));
    const opening = openOf(group);
    rewarding = { group, level: Math.min(most, opening ? opening.level : group.best + 1), most, from, lists: new Map() };
    drawRewards();
    rw.root.hidden = false;
    rw.close.focus();
    void fetchRewards();
  }
  const closeRewards = (): void => {
    if (rw.root.hidden) return;
    rw.root.hidden = true;
    if (rewarding?.from?.isConnected) rewarding.from.focus();
    rewarding = null;
  };
  rw.close.addEventListener('click', closeRewards);
  rw.root.addEventListener('click', (e) => {
    if (e.target === rw.root) closeRewards();
  });
  rw.min.addEventListener('click', () => stepRewards(1));
  rw.down.addEventListener('click', () => stepRewards((rewarding?.level ?? 1) - 1));
  rw.up.addEventListener('click', () => stepRewards((rewarding?.level ?? 1) + 1));
  rw.max.addEventListener('click', () => stepRewards(rewarding?.most ?? 1));
  rw.root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRewards();
    else if (e.key === 'ArrowLeft' && !rw.down.disabled) stepRewards((rewarding?.level ?? 1) - 1);
    else if (e.key === 'ArrowRight' && !rw.up.disabled) stepRewards((rewarding?.level ?? 1) + 1);
    else return;
    e.preventDefault();
  });
  /** A Reward List button (the Boss Dungeon card's, the map's). */
  function rewardsButton(group: DivineGroupView | undefined, className: string): HTMLButtonElement {
    const one = button(className, 'Reward List', 'Reward List');
    one.disabled = !group;
    if (group) one.addEventListener('click', () => showRewards(group, one));
    return one;
  }

  // ---- The windows ----

  const groupOf = (id: DivineGroupId): DivineGroupView | undefined => view?.groups.find((one) => one.id === id);
  const openOf = (group: DivineGroupView | undefined) => (group?.window?.open && Date.parse(group.window.expires) > Date.now() ? group.window : null);

  /** To another window (its hash in the address, in place: the browser's back leaves the raid, as every game's does). */
  function go(next: Screen): void {
    closeAsk();
    closeLevels();
    closeRewards();
    screen = next;
    if (screen.group) shown = Math.max(0, GROUPS.findIndex((one) => one.id === screen.group));
    history.replaceState(history.state, '', `${location.pathname}${location.search}${hashOf(screen)}`);
    draw();
  }

  // The frame's ←: a window up (from the main window, out to the games, as the frame's own does).
  ui.back.addEventListener('click', () => {
    if (screen.kind === 'groups') return navigate('/', { back: true });
    go(screen.kind === 'map' ? { kind: 'types', group: screen.group } : { kind: 'groups', group: screen.group });
  });

  function draw(): void {
    // (The map with no opening: back to its card, whose Unlock opens one.)
    if (screen.kind === 'map' && view && !openOf(groupOf(screen.group))) {
      screen = { kind: 'types', group: screen.group };
      history.replaceState(history.state, '', `${location.pathname}${location.search}${hashOf(screen)}`);
    }
    ui.groups.hidden = screen.kind !== 'groups';
    ui.types.hidden = screen.kind !== 'types';
    ui.map.hidden = screen.kind !== 'map';
    ui.back.setAttribute('aria-label', screen.kind === 'groups' ? 'Back to the games' : 'Back');
    ui.back.title = screen.kind === 'groups' ? 'Back to the games' : 'Back';
    ui.balance.hidden = !view;
    if (view) ui.balance.replaceChildren(...price(view.balance));
    ui.title.textContent = screen.kind === 'map' ? '⚡ Boss Dungeon' : '⚡ Divine Punishment';
    if (screen.kind === 'groups') drawGroups();
    else if (screen.kind === 'types') drawTypes(screen.group);
    else drawMap(screen.group);
  }

  /** PunishmentMainWindow: the group shown between the goddess statues, its boss over the portal, its names, the arrows and Enter. */
  function drawGroups(): void {
    const one = GROUPS[shown] ?? (GROUPS[0] as (typeof GROUPS)[number]);
    const group = groupOf(one.id);
    const opening = openOf(group);
    const glow = scene(at(el('div', 'dp-portal'), 0, 60));
    const boss = scene(at(picture(one.picture, `dp-main-boss${one.open ? '' : ' soon'}`), 0, 40));
    const statues = scene(at(picture('Punishment_GoddessStatues', 'dp-statues'), 0, -13));
    const shade = at(el('div', 'dp-main-shade'), 0, -429);
    const title = at(el('p', 'dp-main-title', one.title), 0, -377);
    const name = at(el('p', 'dp-main-name', one.name), 0, -453);
    const arrow = (by: 1 | -1): HTMLButtonElement => {
      const button = at(el('button', `dp-arrow${by < 0 ? ' prev' : ''}`), 340 * by, -429);
      button.type = 'button';
      button.setAttribute('aria-label', by < 0 ? 'Previous' : 'Next');
      button.disabled = shown + by < 0 || shown + by >= GROUPS.length;
      button.addEventListener('click', () => {
        shown += by;
        draw();
      });
      return button;
    };
    const enter = at(el('button', 'dp-button dp-main-enter', 'Enter'), 708, -449);
    enter.type = 'button';
    if (one.open) enter.addEventListener('click', () => go({ kind: 'types', group: one.id }));
    else {
      enter.disabled = true;
      enter.title = `${one.name}: coming soon`;
    }
    const tags = [
      ...(one.open ? [] : [at(el('span', 'dp-soon', 'Coming soon'), 0, -300)]),
      ...(opening ? [at(el('span', 'dp-main-open', `Lv. ${points(opening.level)} unlocked`), 708, -370)] : []),
    ];
    ui.groups.replaceChildren(glow, boss, statues, shade, title, name, arrow(-1), arrow(1), enter, ...tags);
  }

  /** A dungeon card of the type select (EventFrame_Main02 round its portrait, its name on a dark band). */
  function card(kind: 'boss', x: number, portrait: string, name: string): HTMLElement {
    const box = at(el('div', `dp-card dp-card-${kind}`), x, -36);
    box.append(picture(portrait, 'dp-card-art'), el('span', 'dp-card-frame'), el('span', 'dp-card-name', name));
    return box;
  }

  /** PunishmentDungeonTypeSelectWindow: the Boss Dungeon (locked: Unlock, its price; open: its time left, clears, Enter, Reset). King's Raid's Karma Dungeon card is left out for now. */
  function drawTypes(id: DivineGroupId): void {
    const one = GROUPS.find((g) => g.id === id) ?? (GROUPS[0] as (typeof GROUPS)[number]);
    const group = groupOf(id);
    const opening = openOf(group);

    const boss = card('boss', 0, one.card, 'Boss Dungeon');
    // (Its two buttons, King's Raid's: Reward List, then Unlock or Enter.)
    const rewards = rewardsButton(group, 'dp-button dp-card-button half first');
    if (group && opening) {
      const enter = el('button', 'dp-button dp-card-button half', 'Enter');
      enter.type = 'button';
      enter.addEventListener('click', () => go({ kind: 'map', group: id }));
      const resetButton = el('button', 'dp-card-reset');
      resetButton.type = 'button';
      resetButton.setAttribute('aria-label', 'Reset');
      resetButton.title = 'Reset';
      resetButton.addEventListener('click', () => ask('Reset', 'Progress will be reset to the pre-unlock state. Do you want to reset?', () => reset(group), resetButton));
      const timer = el('span', 'dp-card-time', left(opening.expires));
      timer.dataset.expires = opening.expires;
      boss.append(el('span', 'dp-card-reset-label', 'Reset'), timer, el('span', 'dp-card-clears', `Clear count: ${points(opening.clears)}`), resetButton, rewards, enter);
    } else {
      boss.classList.add('locked');
      const unlockButton = el('button', 'dp-button dp-card-button half', 'Unlock');
      unlockButton.type = 'button';
      unlockButton.disabled = !group;
      if (group) unlockButton.addEventListener('click', () => pickLevel(group, unlockButton));
      const cost = el('span', 'dp-card-cost');
      if (group) cost.append(...price(group.price, view !== null && group.price > view.balance));
      boss.append(cost, rewards, unlockButton);
    }
    ui.types.replaceChildren(boss);
  }

  /** A boss's portrait on the map: its face in the rhombus frame, and its line to its tower (hers, a stem down to her name). Greyed once beaten. */
  function portraitOf(id: string, beaten: boolean, enter: () => void): HTMLElement {
    const spot = MAP[id];
    const final = spot?.line === null;
    const box = scene(at(el('button', `dp-portrait${final ? ' final' : ''}${beaten ? ' beaten' : ''}`), ...(spot?.portrait ?? [0, 0])));
    box.type = 'button';
    box.tabIndex = -1;
    box.setAttribute('aria-hidden', 'true');
    box.append(picture('Common_Rhombus_Line2', 'dp-rhombus outer'), picture('Common_Rhombus_Line1', 'dp-rhombus'), picture(spot?.icon ?? '', 'dp-portrait-face'));
    if (final) box.append(el('span', 'dp-stem'));
    else box.append(el('span', `dp-line ${spot?.line === 1 ? 'right' : 'left'}`));
    box.addEventListener('click', enter);
    return box;
  }

  /** A boss's name on the map (PunishmentRaidComponent): pressed, asked whether to enter; its (?) opens Raid Info. */
  function entryOf(id: string, dungeon: DivineDungeonView, group: DivineGroupView): HTMLElement[] {
    const spot = MAP[id];
    if (!spot) return [];
    const beaten = dungeon.refusal === 'cleared';
    const label = scene(at(el('button', `dp-entry${beaten ? ' beaten' : ''}`), ...spot.entry));
    label.type = 'button';
    label.dataset.boss = id;
    label.dataset.state = dungeon.refusal ?? 'ready';
    label.append(el('span', 'dp-entry-name', spot.name), el('span', 'dp-entry-line'));
    label.title = beaten ? `${spot.name}: defeated this opening` : `Enter ${spot.name}'s dungeon`;
    const go = (): void => enter(id, spot.name, dungeon, group, label);
    label.addEventListener('click', go);
    const info = scene(at(el('button', 'dp-entry-info'), spot.entry[0] + 170, spot.entry[1]));
    info.type = 'button';
    info.setAttribute('aria-label', `${spot.name}: Raid Info`);
    info.title = 'Raid Info';
    info.addEventListener('click', () => void import('../technomagic/prep/raid-info').then((m) => m.openRaidInfo(id)));
    return [portraitOf(id, beaten, go), label, info];
  }

  /** PunishmentRaidWindow: the map's backdrop, a light on each tower whose boss is defeated this opening, each boss's portrait and name, the level top left, her Domain Skills, the guidance. */
  function drawMap(id: DivineGroupId): void {
    const group = groupOf(id);
    const opening = openOf(group);
    if (!group || !opening) return void ui.map.replaceChildren();
    const backdrop = scene(at(picture('Punishment_Entry_Background', 'dp-map-backdrop'), 0, 0));
    const dungeons = DIVINE_CARDS.flatMap((card) => {
      const dungeon = group.dungeons.find((one) => one.id === card.id);
      return dungeon && MAP[card.id] ? [{ id: card.id, dungeon }] : [];
    });
    const lights = dungeons.filter(({ dungeon }) => dungeon.refusal === 'cleared').map(({ id: boss }) => scene(at(picture(MAP[boss]?.light.picture ?? '', 'dp-light'), ...(MAP[boss]?.light.at ?? [0, 0]))));
    const vignette = el('span', 'dp-map-vignette');

    // Top left: the level unlocked (Label_Level, in red under its title).
    const level = at(el('div', 'dp-map-level'), -814, 331);
    level.append(el('span', 'dp-map-level-title', 'Current Stage'), el('span', 'dp-map-level-line'), el('span', 'dp-map-level-number', points(opening.level)));

    // Under her name: the Domain Skills the dragons lend her, lit while each dragon lives.
    const domain = scene(at(el('div', 'dp-domain'), 0, -240));
    domain.append(el('span', 'dp-domain-title', 'Domain Skill'));
    const icons = el('div', 'dp-domain-icons');
    for (const { id: boss, dungeon } of dungeons) {
      const skill = MAP[boss]?.domain;
      if (!skill) continue;
      // (Lit once its dragon is defeated: the strength it lent her is gone.)
      const alive = dungeon.refusal !== 'cleared';
      const icon = el('span', `dp-domain-icon${alive ? '' : ' on'}`);
      icon.style.setProperty('--tint', skill.color);
      icon.title = `${skill.title}\n${skill.about}${alive ? '' : ' (Deactivated)'}`;
      icon.append(picture('Punishment_RaidIcon', 'dp-domain-art'));
      icons.append(icon);
    }
    domain.append(icons);

    const guidance = at(el('p', 'dp-map-info', GUIDANCE[id]), -234, -449);
    // Bottom right: Reward List (Btn_PayShop_Emphasis), the opening's time left above it.
    const rewards = at(rewardsButton(group, 'dp-button emphasis dp-map-rewards'), 708, -449);
    const timer = at(el('span', 'dp-map-time', `${left(opening.expires)} left`), 708, -366);
    timer.dataset.expires = opening.expires;
    timer.dataset.suffix = ' left';
    ui.map.replaceChildren(backdrop, ...lights, vignette, level, ...dungeons.flatMap(({ id: boss, dungeon }) => entryOf(boss, dungeon, group)), domain, guidance, timer, rewards);
  }

  /** A boss pressed: beaten, nothing; a third dragon, why not; else asked (she, with every dragon alive, warned), then into the raid page against it, alone. */
  function enter(id: string, name: string, dungeon: DivineDungeonView, group: DivineGroupView, from: HTMLElement): void {
    if (dungeon.refusal === 'cleared') return;
    if (dungeon.refusal === 'not_allowed') return ask('Notice', 'Up to 2 dungeons can be cleared at a time.', null, from);
    if (dungeon.refusal === 'not_open') return ask('Notice', 'This Dungeon is Closed.', null, from);
    const alive = group.dungeons.filter((one) => one.kind === 'side' && one.refusal !== 'cleared').length;
    const strongest = dungeon.kind === 'final' && alive === group.dungeons.filter((one) => one.kind === 'side').length;
    ask(name, strongest ? `${name}'s power is at her greatest. Do you wish to enter?` : `This is ${name}'s dungeon. Do you want to enter?`, async () => {
      const refused = await playGame('divine', id);
      if (refused === 'logged_out') return loggedOut();
      if (refused) status(refused === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : 'Could not open the raid. Try again.', true);
    }, from);
  }

  // The time left counts down each second; once an opening runs out, what's there now is fetched.
  const tick = window.setInterval(() => {
    if (!view) return;
    const ran = view.groups.some((one) => one.window?.open && Date.parse(one.window.expires) <= Date.now());
    if (ran && !busy) {
      for (const one of view.groups) if (one.window) one.window.open = false;
      draw();
      void load();
      return;
    }
    for (const timer of root.querySelectorAll<HTMLElement>('[data-expires]')) timer.textContent = `${left(timer.dataset.expires ?? '')}${timer.dataset.suffix ?? ''}`;
  }, TICK_MS);

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    status('Loading…');
    draw();
    if (!hasSession()) return loggedOut();
    const res = await loadMe();
    if (!res.ok) return failed(res, 'Could not load your servers.');
    // (The server picked on the games page, as every game is played in one.)
    const server = currentServer();
    if (!server) {
      frame.conn('No server', 'bad');
      return status('Pick a server on the games page first.', true);
    }
    const name = currentMe()?.servers.find((one) => one.id === server)?.name;
    if (name) frame.balance.title = `zeiucoins in ${name}`;
    await load();
  }

  // Its hash changed by hand (or a link to a window of it): that window.
  addEventListener('hashchange', () => go(screenAt(location.hash)));
  void start();
  void tick;
}
