import type { TableListing } from '../protocol/poker';

/*
 * The server's poker tables, before joining one, as the Dragon Raid's Multiplayer lists its raids
 * (../hub/raid-rooms.ts): its tabs down the left, what each shows on the right. Find Table lists the
 * tables, each with who sits at it, a pip for each seat (a member's, a bot's or a free one) and Join;
 * a table with bots in its seats can be joined even with none free: the page watches until a bot gets
 * up for the player, once the hand it's in is over. Create Table opens a new one. The list asks again
 * every few seconds while it's shown, and on Refresh.
 */

export interface Lobby {
  /** Shows the tables the bot sent. */
  show(tables: TableListing[]): void;
  hide(): void;
  /** Says why something couldn't be done (null: nothing). */
  error(text: string | null): void;
  readonly shown: boolean;
}

export interface LobbyActions {
  /** Asks the bot for the tables again. */
  refresh(): void;
  /** Joins table `table`, or a new one. */
  join(table: number | 'new'): void;
}

const REFRESH_MS = 5000;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function makeLobby(act: LobbyActions): Lobby {
  const ui = {
    lobby: $('lobby'),
    findTab: $<HTMLButtonElement>('lobby-tab-find'),
    createTab: $<HTMLButtonElement>('lobby-tab-create'),
    findPane: $('lobby-find'),
    createPane: $('lobby-create'),
    refresh: $<HTMLButtonElement>('lobby-refresh'),
    list: $<HTMLOListElement>('lobby-list'),
    empty: $('lobby-empty'),
    create: $<HTMLButtonElement>('lobby-create-button'),
    error: $('lobby-error'),
  };
  let timer = 0;

  /** Opens tab `which`: Find Table asks for the tables again (`ask`). */
  function tab(which: 'find' | 'create', ask = true): void {
    for (const [button, pane, id] of [
      [ui.findTab, ui.findPane, 'find'],
      [ui.createTab, ui.createPane, 'create'],
    ] as const) {
      const on = id === which;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      pane.hidden = !on;
    }
    if (which === 'find' && ask) act.refresh();
  }

  /** Waiting on the bot: every button off until it answers (with the table, or the list again). */
  function busy(button: HTMLButtonElement): void {
    button.textContent = 'Joining…';
    for (const b of [ui.create, ...ui.list.querySelectorAll('button')]) b.disabled = true;
  }

  /** A table: who sits at it, how many bots and whether a hand is on, a pip for each seat, and Join. */
  function row(table: TableListing): HTMLLIElement {
    const item = el('li', 'pk-lobby-table');
    const faces = el('div', 'pk-lobby-faces');
    for (const p of table.players.slice(0, 3)) {
      const face = el('img', 'pk-lobby-face');
      face.src = p.avatar;
      face.alt = '';
      face.loading = 'lazy';
      faces.append(face);
    }
    if (table.players.length === 0) faces.append(el('span', 'pk-lobby-face none', '♠'));
    const who = el('div', 'pk-lobby-who');
    const names = table.players.map((p) => p.name).join(', ') || 'Nobody seated';
    const what = [plural(table.players.length, 'player', 'players'), ...(table.bots > 0 ? [plural(table.bots, 'bot', 'bots')] : []), table.playing ? 'Playing' : 'Waiting'];
    who.append(el('span', 'pk-lobby-name', `Table ${table.table}`), el('span', 'pk-lobby-players', names), el('span', 'pk-lobby-what', what.join(' · ')));
    const seats = el('span', 'pk-lobby-seats');
    const taken = table.players.length + table.bots;
    seats.setAttribute('aria-label', `${table.players.length} players and ${table.bots} bots in ${table.seats} seats`);
    for (let i = 0; i < table.seats; i++) seats.append(el('i', i < table.players.length ? 'member' : i < taken ? 'bot' : ''));
    seats.append(el('b', '', `${taken}/${table.seats}`));
    const join = el('button', 'pk-button primary pk-lobby-join', table.open ? 'Join' : 'Full');
    join.type = 'button';
    join.disabled = !table.open;
    // No free seat, but a bot's: it gets up for them after its hand.
    if (table.open && taken >= table.seats) join.title = 'A bot gets up for you once the hand it’s in is over';
    join.addEventListener('click', () => {
      busy(join);
      act.join(table.table);
    });
    item.append(faces, who, seats, join);
    return item;
  }

  ui.findTab.addEventListener('click', () => tab('find'));
  ui.createTab.addEventListener('click', () => tab('create'));
  ui.refresh.addEventListener('click', () => act.refresh());
  ui.create.addEventListener('click', () => {
    busy(ui.create);
    act.join('new');
  });
  // Up and down the tabs with the arrow keys.
  ui.findTab.parentElement?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next = ui.findTab.getAttribute('aria-selected') === 'true' ? ui.createTab : ui.findTab;
    next.focus();
    tab(next === ui.findTab ? 'find' : 'create');
  });

  const lobby: Lobby = {
    show(tables) {
      const opening = ui.lobby.hidden;
      ui.lobby.hidden = false;
      ui.create.disabled = false;
      ui.create.textContent = 'Create Table';
      ui.list.replaceChildren(...tables.map(row));
      ui.empty.hidden = tables.length > 0;
      if (tables.length === 0) {
        const go = el('button', 'pk-button', 'Create Table');
        go.type = 'button';
        go.addEventListener('click', () => {
          tab('create');
          ui.create.focus();
        });
        ui.empty.replaceChildren(el('p', '', 'No tables in this server right now.'), go);
      }
      if (opening) {
        tab('find', false);
        clearInterval(timer);
        timer = window.setInterval(() => {
          if (!document.hidden && !ui.findPane.hidden) act.refresh();
        }, REFRESH_MS);
      }
    },
    hide() {
      ui.lobby.hidden = true;
      clearInterval(timer);
      lobby.error(null);
    },
    error(text) {
      ui.error.hidden = text === null;
      ui.error.textContent = text ?? '';
    },
    get shown() {
      return !ui.lobby.hidden;
    },
  };
  return lobby;
}
