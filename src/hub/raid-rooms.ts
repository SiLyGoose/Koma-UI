import { closeButton } from '../shared/ui/close/close';
import { raidBanner, type RaidCard } from '../shared/raids';
import type { LobbyView } from '../protocol/technomagic';

/*
 * A boss's Multiplayer, from its Raid List (./raid-list.ts): over the list, a panel with its tabs down the left, as
 * King's Raid has it. Find Raid lists the server's raids against the boss (the bot's /api/raid-rooms), those that can be
 * joined first, each with its host, stage and how many are in it, and Join; Refresh asks again. Create Raid creates one
 * (its creator the host), which others then find there, and which the bot says in Discord. A press outside it, its ✕ or
 * Escape closes it, back to the Raid List.
 */

export type RoomsTab = 'find' | 'create';

export interface RaidRooms {
  /** Opens it for `card`'s boss, on `tab` (Find Raid, to begin with). */
  open(card: RaidCard, tab?: RoomsTab): void;
  close(): void;
  readonly shown: boolean;
}

export interface RaidRoomsActions {
  /** The server's raids against `boss` (null: it couldn't ask; the reason is said). */
  find(boss: string): Promise<LobbyView[] | null>;
  /** Goes into raid `room` against `boss`, or a new one (`new`), `button` saying it is opening meanwhile. */
  join(boss: string, room: string, button: HTMLButtonElement): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const PHASE: Record<LobbyView['phase'], string> = { prep: 'Getting ready', fight: 'In battle', over: 'Battle over' };

export function makeRaidRooms(root: HTMLElement, act: RaidRoomsActions): RaidRooms {
  const shade = el('div', 'raid-list raid-rooms');
  shade.hidden = true;
  const panel = el('section', 'raid-list-panel raid-rooms-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const head = el('header', 'raid-list-head');
  const title = el('h2', 'raid-list-title');
  title.id = 'raid-rooms-title';
  panel.setAttribute('aria-labelledby', title.id);
  const close = closeButton('Back to the Raid List');
  close.classList.add('raid-list-close');
  head.append(title, close);

  // The tabs, down the left; what each shows, on the right.
  const body = el('div', 'raid-rooms-body');
  const tabs = el('div', 'raid-rooms-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-orientation', 'vertical');
  const tab = (id: RoomsTab, label: string, icon: string): HTMLButtonElement => {
    const button = el('button', 'raid-rooms-tab');
    button.type = 'button';
    button.id = `raid-rooms-tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `raid-rooms-pane-${id}`);
    const mark = el('span', 'raid-rooms-tab-icon', icon);
    mark.setAttribute('aria-hidden', 'true');
    button.append(mark, el('span', '', label));
    button.addEventListener('click', () => show(id));
    return button;
  };
  const findTab = tab('find', 'Find Raid', '🔍');
  const createTab = tab('create', 'Create Raid', '⚔️');
  tabs.append(findTab, createTab);

  const pane = (id: RoomsTab): HTMLElement => {
    const box = el('div', 'raid-rooms-pane');
    box.id = `raid-rooms-pane-${id}`;
    box.setAttribute('role', 'tabpanel');
    box.setAttribute('aria-labelledby', `raid-rooms-tab-${id}`);
    return box;
  };

  // Find Raid: what it's against, Refresh, and the raids (or why there are none).
  const findPane = pane('find');
  const findBar = el('div', 'raid-rooms-bar');
  const findSays = el('p', 'raid-rooms-says');
  const refresh = el('button', 'raid-rooms-refresh', 'Refresh');
  refresh.type = 'button';
  findBar.append(findSays, refresh);
  const list = el('ol', 'raid-rooms-list');
  const empty = el('div', 'raid-rooms-empty');
  findPane.append(findBar, list, empty);

  // Create Raid: the boss's banner, what creating one does, and Create Raid.
  const createPane = pane('create');
  const banner = el('div', 'raid-row-banner raid-rooms-banner');
  const art = el('img', 'raid-row-art');
  art.alt = '';
  const names = el('div', 'raid-row-names');
  const raidTitle = el('span', 'raid-row-title');
  const bossName = el('span', 'raid-row-name');
  names.append(raidTitle, bossName);
  banner.append(art, names);
  const createSays = el('p', 'raid-rooms-create-says');
  const create = el('button', 'raid-action multi raid-rooms-create', 'Create Raid');
  create.type = 'button';
  createPane.append(banner, createSays, create);

  body.append(tabs, findPane, createPane);
  panel.append(head, body);
  shade.append(panel);
  root.append(shade);

  let card: RaidCard | null = null;
  /** Each search asked for, so one answered late never draws over a newer one's. */
  let asked = 0;

  function show(id: RoomsTab): void {
    for (const [button, box, which] of [
      [findTab, findPane, 'find'],
      [createTab, createPane, 'create'],
    ] as const) {
      const on = which === id;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      box.hidden = !on;
    }
    if (id === 'find') void search();
  }

  /** Asks the bot for the raids against the boss, and lists them. */
  async function search(): Promise<void> {
    if (!card) return;
    const boss = card;
    const mine = ++asked;
    refresh.disabled = true;
    findSays.textContent = `Raids against ${boss.name}`;
    if (list.childElementCount === 0) showEmpty('Looking for raids…');
    const rooms = await act.find(boss.id);
    if (mine !== asked || card !== boss) return;
    refresh.disabled = false;
    if (rooms === null) {
      list.replaceChildren();
      return showEmpty('Could not look for raids. Try again.');
    }
    list.replaceChildren(...rooms.map((room) => row(boss, room)));
    if (rooms.length > 0) {
      empty.hidden = true;
      return;
    }
    showEmpty(`No raids against ${boss.name} right now.`, true);
  }

  /** Why there's nothing listed, and (none open) the way to create one. */
  function showEmpty(text: string, offerCreate = false): void {
    empty.hidden = false;
    empty.replaceChildren(el('p', '', text));
    if (!offerCreate) return;
    const go = el('button', 'raid-rooms-refresh', 'Create Raid');
    go.type = 'button';
    go.addEventListener('click', () => {
      show('create');
      create.focus();
    });
    empty.append(go);
  }

  /** A raid: its host, its stage, how many are in it (a pip for each place) and what it's doing, and Join. */
  function row(boss: RaidCard, room: LobbyView): HTMLLIElement {
    const item = el('li', 'raid-room');
    const face = el('img', 'raid-room-avatar');
    face.src = room.host.avatar;
    face.alt = '';
    face.loading = 'lazy';
    const who = el('div', 'raid-room-who');
    // (A dragon's: its mode, Normal or Hard, before its stage.)
    const mode = room.boss.normal === undefined ? '' : `${room.mode === 'normal' ? 'Normal' : 'Hard'} · `;
    who.append(el('span', 'raid-room-host', `${room.host.name}’s raid`), el('span', 'raid-room-phase', `${mode}Stage ${room.stage} · ${PHASE[room.phase]}`));
    const seats = el('span', 'raid-room-seats');
    seats.setAttribute('aria-label', `${room.players} of ${room.most} in`);
    for (let i = 0; i < room.most; i++) seats.append(el('i', i < room.players ? 'taken' : ''));
    seats.append(el('b', '', `${room.players}/${room.most}`));
    const full = room.players >= room.most;
    const join = el('button', 'raid-action single raid-room-join', full ? 'Full' : 'Join');
    join.type = 'button';
    join.disabled = full;
    join.addEventListener('click', () => act.join(boss.id, room.id, join));
    item.append(face, who, seats, join);
    return item;
  }

  refresh.addEventListener('click', () => void search());
  create.addEventListener('click', () => {
    if (card) act.join(card.id, 'new', create);
  });
  close.addEventListener('click', () => rooms.close());
  shade.addEventListener('click', (event) => {
    if (event.target === shade) rooms.close();
  });
  // Up and down the tabs with the arrow keys.
  tabs.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next = findTab.getAttribute('aria-selected') === 'true' ? createTab : findTab;
    next.focus();
    show(next === findTab ? 'find' : 'create');
  });

  const rooms: RaidRooms = {
    open(next, at = 'find') {
      card = next;
      title.textContent = `Multiplayer · ${next.name}`;
      art.src = raidBanner(next.id);
      banner.dataset.boss = next.id;
      raidTitle.textContent = next.title;
      bossName.textContent = next.name;
      createSays.textContent = `Create a raid against ${next.name} and be its host. Others in the server can find it here under Find Raid, and Koma says it in the server’s channel so they can join.`;
      create.disabled = false;
      create.textContent = 'Create Raid';
      list.replaceChildren();
      shade.hidden = false;
      show(at);
      (at === 'find' ? findTab : createTab).focus();
    },
    close() {
      shade.hidden = true;
      card = null;
      asked++;
    },
    get shown() {
      return !shade.hidden;
    },
  };
  return rooms;
}
