import markup from './gear.html?raw';
import { API } from '../shared/account';
import { currentCharacter } from '../shared/characters';
import { dropdown } from '../shared/dropdown';
import { armoryOrder, forgePlan, type GearCopy, type GearView, type StatSection } from '../shared/items/gear';
import { art, el, rich, SLOT_NAME, stars, type Slot } from '../shared/items/items';
import { go } from '../site/nav';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';

/*
 * The gear page: the member's character (Tsuri, for now) with their three slots around them (weapon and
 * armor on the left, the treasure on the right), and their armory beside it: every copy they own, on
 * parchment. Picking a copy shows what it does over the character and equips it; picking a slot shows
 * what fits in it. Under the character: switching loadouts (and outfits, one day); under the armory,
 * taking everything off. The tabs under the character swap the armory for their stats (Common), worked
 * out by the bot. Logged-in members only (the bot's /api/gear answers them only), in the server picked.
 * Down the left, everyone in the server with gear, them first: picking someone else shows their gear,
 * loadouts and stats the same way, to look at only (nothing to equip, upgrade or take off).
 */

const SLOTS: Slot[] = ['weapon', 'armor', 'treasure'];

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** The Common tab's first group, about the hero rather than their gear. No classes yet, so it's a question mark. */
const HERO_INFO: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: '?', base: null }] };

/** A Discord picture big enough to fill a roster portrait (the bot asks Discord for small ones). */
const bigAvatar = (url: string): string => (url.startsWith('https://cdn.discordapp.com/') ? url.replace(/([?&]size=)\d+/, '$1256') : url);

/** Someone in the roster (the bot's GET /api/gear/members). */
interface Member {
  userId: string;
  name: string;
  avatar: string;
  copies: number;
  you: boolean;
}

export const gearPage: Page = { path: '/gear', title: 'Gear · Komaverse', icon: '⚔️', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const ui = {
    status: $('status'),
    gear: $('gear'),
    heroName: $('hero-name'),
    sprite: $<HTMLImageElement>('stage-sprite'),
    server: $<HTMLSelectElement>('server'),
    totals: $('totals'),
    armoryTitle: $('armory-title'),
    grid: $('armory-grid'),
    detail: $('detail'),
    loadoutButton: $<HTMLButtonElement>('loadout-button'),
    loadoutMenu: $('loadout-menu'),
    unequipAll: $<HTMLButtonElement>('unequip-all'),
    armory: $('armory'),
    stats: $('stats'),
    statsTitle: $('stats-title'),
    statsList: $('stats-list'),
    roster: $('roster'),
    rosterList: $('roster-list'),
    views: [...root.querySelectorAll<HTMLButtonElement>('[data-view]')],
    slots: [...root.querySelectorAll<HTMLButtonElement>('.slot')],
    tabs: [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')],
  };

  let gear: GearView | null = null;
  let filter: Slot | 'all' = 'all';
  /** What the panel beside the character shows. */
  let view: 'common' | 'gear' = 'gear';
  /** The copy shown over the character, if any. */
  let picked: string | null = null;
  /** An equip, unequip or loadout switch on its way: the page waits for it before taking another. */
  let busy = false;
  /** Everyone in the roster (empty until it's loaded, or with a bot from before it). */
  let members: Member[] = [];
  /** Whose gear is shown: someone else's (to look at only), or null for their own. */
  let viewing: Member | null = null;
  /** Counts gear loads, so only the latest one asked for is drawn. */
  let loads = 0;

  function status(text: string | null, bad = false): void {
    ui.status.hidden = text === null;
    ui.status.textContent = text ?? '';
    ui.status.classList.toggle('bad', bad);
  }



  // ---------------------------------------------------------------------------
  // Drawing

  const copyById = (id: string | null): GearCopy | undefined => (id ? gear?.copies.find((c) => c.id === id) : undefined);
  const isWorn = (copy: GearCopy): boolean => gear?.equipped[copy.slot] === copy.id;

  function renderSlots(): void {
    for (const button of ui.slots) {
      const slot = button.dataset.slot as Slot;
      const copy = copyById(gear?.equipped[slot] ?? null);
      button.textContent = '';
      button.dataset.stars = copy ? String(copy.stars) : '';
      button.classList.toggle('empty', !copy);
      button.classList.toggle('masterwork', copy?.masterwork === true);
      button.classList.toggle('filtered', filter === slot);
      button.setAttribute('aria-label', copy ? `${SLOT_NAME[slot]}: ${copy.name}` : `${SLOT_NAME[slot]}: empty`);
      const frame = el('span', 'slot-frame');
      frame.append(art(copy?.itemId ?? null, slot));
      if (copy) {
        frame.append(el('span', 'slot-level', `R${copy.level}`), stars(copy.stars));
      }
      button.append(frame, el('span', 'slot-name', SLOT_NAME[slot]));
    }
  }

  /** How many cards across the armory is (3 to 5, by the screen: ../shared/items/items.css), so its blanks fill out the last row. */
  let gridColumns = 0;
  const columns = (): number => getComputedStyle(ui.grid).gridTemplateColumns.split(' ').length || 4;

  function renderGrid(): void {
    if (!gear) return;
    // Measured before emptying the grid, and the sheet's scroll put back after: a layout of the empty
    // grid would scroll the sheet back to the top on every pick.
    gridColumns = columns();
    const sheet = ui.grid.parentElement as HTMLElement;
    const scrolled = sheet.scrollTop;
    ui.grid.textContent = '';
    const shown = armoryOrder(gear.copies).filter((c) => filter === 'all' || c.slot === filter);
    for (const copy of shown) {
      const card = el('button', 'item');
      card.type = 'button';
      card.dataset.stars = String(copy.stars);
      card.classList.toggle('picked', copy.id === picked);
      card.classList.toggle('masterwork', copy.masterwork);
      card.setAttribute('aria-label', `${copy.name}, ${copy.stars} star${copy.stars === 1 ? '' : 's'}, R${copy.level}${isWorn(copy) ? ', equipped' : ''}`);
      if (isWorn(copy)) card.append(el('span', 'item-tag', 'Equipped'));
      card.append(el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl'));
      card.addEventListener('click', () => {
        picked = picked === copy.id ? null : copy.id;
        renderGrid();
        renderDetail();
      });
      ui.grid.append(card);
    }
    const row = (n: number): number => Math.ceil(n / gridColumns) * gridColumns;
    const cells = Math.max(row(GRID_CELLS), row(shown.length));
    for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
    if (shown.length === 0) {
      const none = viewing ? `${viewing.name} doesn't own any gear yet.` : "You don't own any gear yet. Pull some with Koma's gacha in Discord.";
      const note = el('p', 'armory-empty', filter === 'all' ? none : `No ${SLOT_NAME[filter].toLowerCase()} yet.`);
      ui.grid.append(note);
    }
    sheet.scrollTop = scrolled;
  }

  function renderDetail(): void {
    const copy = copyById(picked);
    ui.detail.hidden = !copy;
    ui.gear.classList.toggle('picking', !!copy);
    ui.detail.textContent = '';
    if (!copy || !gear) return;
    ui.detail.dataset.stars = String(copy.stars);
    ui.detail.setAttribute('aria-label', copy.name);

    // Its name across the top, with the close button at the end.
    const bar = el('div', 'detail-bar');
    const close = el('button', 'detail-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', unpick);
    bar.append(el('h3', '', copy.name), close);

    // Its card, big, beside its slot and rank.
    const top = el('div', 'detail-top');
    const card = bigCard(copy);
    const info = el('div', 'detail-info');
    const kind = el('p', 'detail-kind', SLOT_NAME[copy.slot]);
    if (copy.level >= copy.maxLevel) kind.append(el('span', 'detail-max', 'MAX'));
    const rank = el('p', 'detail-rank', `R${copy.level}`);
    rank.append(el('span', 'detail-rank-of', ` / ${copy.maxLevel}`));
    info.append(kind, rank);
    if (copy.masterwork) info.append(el('span', 'detail-mw', '✨ Masterwork'));
    top.append(card, info);

    const effects = el('ul', 'detail-effects');
    for (const line of copy.effects) effects.appendChild(el('li')).append(rich(line));
    if (copy.effects.length === 0) effects.append(el('li', 'muted', 'No effects.'));

    const worn = isWorn(copy);
    const current = worn || viewing ? undefined : copyById(gear.equipped[copy.slot]);
    const action = el('button', 'detail-action', worn ? 'Unequip' : 'Equip');
    action.type = 'button';
    action.disabled = busy;
    action.classList.toggle('secondary', worn);
    action.addEventListener('click', () => void (worn ? unequip(copy.slot) : equip(copy.id)));

    // Upgrade: to the forge, with this copy on the anvil. Off when there's nothing left to do: fully
    // refined, and a masterwork or with no bonus.
    const upgrade = el('button', 'detail-action secondary', 'Upgrade');
    upgrade.type = 'button';
    upgrade.disabled = busy || forgePlan(copy).kind === 'done';
    upgrade.addEventListener('click', () => go(`/forge/?copy=${encodeURIComponent(copy.id)}`));

    // What it does.
    const body = el('div', 'detail-body');
    body.append(el('p', 'detail-desc', copy.description), el('p', 'detail-label', 'Effects'), effects);
    if (copy.borrowed !== null) {
      const who = viewing ? `${viewing.name} gets` : 'you get';
      body.append(el('p', 'detail-note', `This one is made for someone else: ${who} ${Math.round(copy.borrowed * 100)}% of its effects.`));
    }
    // The copy equipping it would take off, and what it does, set apart from this one's effects.
    if (current) {
      const replaced = el('ul', 'detail-effects detail-replaced');
      for (const line of current.effects) replaced.appendChild(el('li')).append(rich(line));
      if (current.effects.length === 0) replaced.append(el('li', 'muted', 'No effects.'));
      body.append(el('p', 'detail-replaces', `Replaces ${current.name} (R${current.level})`), replaced);
    }

    // What can be done with it, under a line along the bottom.
    const foot = el('div', 'detail-foot');
    foot.append(upgrade, action);
    // All but the buttons scrolls, when it runs longer than the panel.
    const scroll = el('div', 'detail-scroll');
    scroll.append(bar, top, body);
    ui.detail.append(scroll);
    // Someone else's: nothing to do with it, so no buttons, just whether they wear it.
    if (!viewing) ui.detail.append(foot);
    else if (worn) info.append(el('span', 'detail-mw detail-worn', 'Equipped'));
  }

  /** A copy's card, big (the detail panel's). */
  function bigCard(copy: GearCopy): HTMLElement {
    const card = el('span', 'item detail-card');
    card.dataset.stars = String(copy.stars);
    card.classList.toggle('masterwork', copy.masterwork);
    card.append(el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl'));
    return card;
  }

  /** The loadout chip (the one being worn) and its menu of all of them, and Unequip all. */
  function renderFoot(): void {
    if (!gear) return;
    const active = gear.loadouts.find((l) => l.active);
    // An icon of stacked cards, with the worn loadout's number on its corner.
    ui.loadoutButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h11a2 2 0 0 1 2 2v11h-2V5H7Z" /><rect x="4" y="7" width="12" height="14" rx="2" /></svg>';
    if (active) ui.loadoutButton.append(el('span', 'hero-chip-badge', String(active.number)));
    ui.loadoutButton.setAttribute('aria-label', `Loadout: ${active?.name ?? 'none'}`);
    ui.loadoutButton.title = active ? `Loadout: ${active.name}` : 'Loadout';
    ui.loadoutButton.disabled = busy || gear.loadouts.length < 2;
    ui.unequipAll.disabled = busy || SLOTS.every((slot) => !gear?.equipped[slot]);
    ui.unequipAll.hidden = viewing !== null;

    ui.loadoutMenu.textContent = '';
    for (const loadout of gear.loadouts) {
      const row = el('button', 'loadout-row');
      row.type = 'button';
      // Someone else's loadouts are there to look at, not to switch.
      row.disabled = busy || (viewing !== null && !loadout.active);
      row.classList.toggle('active', loadout.active);
      row.setAttribute('aria-current', String(loadout.active));
      const icons = el('span', 'loadout-icons');
      for (const slot of SLOTS) {
        const copy = copyById(loadout.equipped[slot]);
        const cell = el('span', `loadout-icon${copy ? '' : ' empty'}`);
        if (copy) cell.dataset.stars = String(copy.stars);
        cell.title = copy ? `${copy.name} (R${copy.level})` : `No ${SLOT_NAME[slot].toLowerCase()}`;
        cell.append(art(copy?.itemId ?? null, slot));
        icons.append(cell);
      }
      row.append(el('span', 'loadout-name', loadout.name), icons);
      if (loadout.active) row.setAttribute('aria-label', `${loadout.name} (wearing)`);
      row.addEventListener('click', () => {
        showMenu(false);
        if (!loadout.active && !viewing) void switchTo(loadout.number);
      });
      ui.loadoutMenu.append(row);
    }
  }

  function showMenu(open: boolean): void {
    ui.loadoutMenu.hidden = !open;
    ui.loadoutButton.setAttribute('aria-expanded', String(open));
  }

  function unpick(): void {
    picked = null;
    renderGrid();
    renderDetail();
  }

  function renderStats(): void {
    ui.statsList.textContent = '';
    for (const section of [HERO_INFO, ...(gear?.stats ?? [])]) {
      const block = el('section', 'stats-section');
      block.append(el('h3', '', section.title));
      const list = el('dl');
      for (const row of section.rows) {
        const line = el('div', `stats-row${row.base === null ? '' : ' changed'}`);
        const value = el('dd', '', row.value);
        if (row.base !== null) value.append(el('span', 'stats-base', `base ${row.base}`));
        line.append(el('dt', '', row.label), value);
        list.append(line);
      }
      block.append(list);
      ui.statsList.append(block);
    }
    if (!gear?.stats?.length) ui.statsList.append(el('p', 'stats-empty', 'Stats are not available yet.'));
  }

  function renderView(): void {
    // Not `hidden`: on wide screens the one not shown still keeps the row as tall as the other (gear.css).
    ui.armory.classList.toggle('off', view !== 'gear');
    ui.stats.classList.toggle('off', view !== 'common');
    for (const tab of ui.views) tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  }

  function renderTotals(): void {
    ui.totals.textContent = '';
    for (const line of gear?.totals ?? []) ui.totals.appendChild(el('li')).append(rich(line));
    if (!gear?.totals.length) ui.totals.append(el('li', 'muted', 'Nothing equipped yet.'));
  }

  function renderRoster(): void {
    ui.roster.hidden = members.length === 0;
    ui.rosterList.textContent = '';
    for (const member of members) {
      const shown = member.you ? viewing === null : viewing?.userId === member.userId;
      // A portrait: their picture filling the square, their class's badge in its top left corner (no classes yet, so a
      // question mark, as on the stage's ribbon), how many items they own in its top right, their name along the bottom.
      const tile = el('button', 'roster-tile');
      tile.type = 'button';
      tile.classList.toggle('you', member.you);
      tile.setAttribute('aria-current', String(shown));
      const count = `${member.copies} item${member.copies === 1 ? '' : 's'}`;
      tile.setAttribute('aria-label', member.you ? `You (${member.name}), ${count}` : `${member.name}, ${count}`);
      tile.title = `${member.name} · ${count}`;
      const avatar = el('img', 'roster-avatar');
      avatar.src = bigAvatar(member.avatar);
      avatar.alt = '';
      avatar.loading = 'lazy';
      const badge = el('span', 'roster-class', '?');
      badge.title = 'Class: ?';
      badge.setAttribute('aria-hidden', 'true');
      tile.append(avatar, badge, el('span', 'roster-count', String(member.copies)), el('span', 'roster-name', member.you ? 'You' : member.name));
      tile.addEventListener('click', () => {
        if (shown) return;
        viewing = member.you ? null : member;
        picked = null;
        filter = 'all';
        showMenu(false);
        renderRoster();
        void loadGear();
      });
      ui.rosterList.append(tile);
    }
  }

  function render(): void {
    const me = currentMe();
    if (!me || !gear) return;
    ui.gear.hidden = false;
    const name = viewing?.name ?? me.user.name;
    ui.gear.classList.toggle('peeking', viewing !== null);
    ui.heroName.textContent = name;
    const character = currentCharacter();
    if (ui.sprite.getAttribute('src') !== character.sprite) ui.sprite.src = character.sprite;
    ui.sprite.width = character.width;
    ui.sprite.height = character.height;
    ui.armoryTitle.textContent = `${name}'s Armory`;
    ui.statsTitle.textContent = `${name}'s Stats`;
    for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === filter));
    renderSlots();
    renderGrid();
    renderDetail();
    renderFoot();
    renderTotals();
    renderStats();
    renderView();
    renderRoster();
  }

  // ---------------------------------------------------------------------------
  // Asking the bot

  function failed(res: { status: number; error: string }, what: string): void {
    if (res.status === 401) return logOut();
    // No answer to a change ("Reconnecting…" waited for the bot to be back): it may have gone through, so load what's there.
    if (res.status === 0) return void loadGear();
    status(
      res.error === 'not_member'
          ? "You don't seem to be in that server any more. Log out and in again to refresh it."
          : res.error === 'busy'
            ? 'Your gear was changing somewhere else. Try again.'
            : what,
      true,
    );
  }

  async function loadGear(): Promise<void> {
    const server = currentServer();
    if (!server) return;
    const load = ++loads;
    const whose = viewing;
    const user = whose ? `&user=${encodeURIComponent(whose.userId)}` : '';
    const res = await api<GearView>(`/api/gear?guild=${encodeURIComponent(server)}${user}`);
    // Someone else was picked meanwhile.
    if (load !== loads) return;
    if (!res.ok) {
      // They left the server: off the roster, and back to their own gear.
      if (whose && res.status === 404) {
        members = members.filter((m) => m.userId !== whose.userId);
        viewing = null;
        await loadGear();
        return status(`${whose.name} isn't in this server any more.`, true);
      }
      return failed(res, whose ? `Could not load ${whose.name}'s gear.` : 'Could not load your gear.');
    }
    gear = res.data;
    if (!copyById(picked)) picked = null;
    status(null);
    render();
  }

  async function change(path: string, body: Record<string, unknown>, what: string): Promise<void> {
    const server = currentServer();
    if (busy || !server) return;
    busy = true;
    renderDetail();
    renderFoot();
    const res = await api<GearView>(path, { method: 'POST', body: JSON.stringify({ guild: server, ...body }) });
    busy = false;
    if (!res.ok) {
      renderDetail();
      renderFoot();
      return failed(res, what);
    }
    gear = res.data;
    status(null);
    render();
  }

  const equip = (copy: string): Promise<void> => change('/api/gear/equip', { copy }, 'Could not equip that. Try again.');
  const unequip = (slot: Slot): Promise<void> => change('/api/gear/unequip', { slot }, 'Could not unequip that. Try again.');
  const unequipEverything = (): Promise<void> => change('/api/gear/unequip-all', {}, 'Could not unequip everything. Try again.');
  const switchTo = (loadout: number): Promise<void> => change('/api/gear/loadout', { loadout }, 'Could not switch loadouts. Try again.');

  /** The roster. A bot from before it has none to give: the page is then just their own gear, as before. */
  async function loadMembers(): Promise<void> {
    const server = currentServer();
    if (!server) return;
    const res = await api<{ members: Member[] }>(`/api/gear/members?guild=${encodeURIComponent(server)}`);
    if (server !== currentServer()) return;
    members = res.ok ? res.data.members : [];
    renderRoster();
  }

  function renderServers(): void {
    const me = currentMe();
    if (!me) return;
    const server = currentServer();
    ui.server.textContent = '';
    ui.server.hidden = me.servers.length < 2;
    for (const s of me.servers) {
      const option = el('option', '', s.name);
      option.value = s.id;
      option.selected = s.id === server;
      ui.server.append(option);
    }
  }

  // The server picker in the site's dropdown, not the browser's (it follows the select, options and all).
  const serverPicker = dropdown(ui.server);

  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    picked = null;
    viewing = null;
    members = [];
    void loadGear();
    void loadMembers();
  });

  for (const tab of ui.tabs) {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter as Slot | 'all';
      render();
    });
  }

  for (const tab of ui.views) {
    tab.addEventListener('click', () => {
      view = tab.dataset.view as typeof view;
      if (view === 'common') picked = null;
      render();
    });
  }

  // A slot shows what fits in it, with what's in it picked (again: back to everything).
  for (const button of ui.slots) {
    button.addEventListener('click', () => {
      const slot = button.dataset.slot as Slot;
      // From the Common tab, a slot always opens the gear on it.
      const fromStats = view === 'common';
      view = 'gear';
      if (filter === slot && !fromStats) {
        filter = 'all';
        picked = null;
      } else {
        filter = slot;
        picked = gear?.equipped[slot] ?? null;
      }
      render();
    });
  }

  ui.unequipAll.addEventListener('click', () => void unequipEverything());
  ui.loadoutButton.addEventListener('click', (event) => {
    event.stopPropagation();
    showMenu(ui.loadoutMenu.hidden);
  });
  // A click anywhere else closes the menu; Escape closes the menu, else the picked copy.
  const onClick = (event: MouseEvent): void => {
    if (!ui.loadoutMenu.hidden && !ui.loadoutMenu.contains(event.target as Node)) showMenu(false);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (!ui.loadoutMenu.hidden) {
      showMenu(false);
      ui.loadoutButton.focus();
    } else if (picked) unpick();
  };
  // A resize that changes how many cards fit across refills the blanks.
  const onResize = (): void => {
    if (gridColumns && columns() !== gridColumns) renderGrid();
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    status('Loading…');
    const res = await loadMe();
    if (!res.ok) return failed(res, 'Could not load your servers.');
    if (!currentServer()) return status('None of your servers have Koma in them yet.');
    renderServers();
    void loadMembers();
    await loadGear();
  }

  return {
    drawn: start(),
    unmount() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      serverPicker.destroy();
    },
  };
}
