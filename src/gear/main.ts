import '../style.css';
import '../hub/hub.css';
import { API, getSession, profileMenu, setSession, store } from '../account';
import './items.css';
import './gear.css';
import { art, el, rich, SLOT_NAME, stars, type Slot } from './items';

/*
 * The gear page: the member's miner with their three slots around them (weapon and armor on the
 * left, the treasure on the right), and their armory beside it: every copy they own, on parchment.
 * Picking a copy shows what it does over the miner and equips it; picking a slot shows what fits in
 * it. Under the miner: switching loadouts (and outfits, one day); under the armory, taking everything off. The tabs under the miner
 * swap the armory for their stats (Common), worked out by the bot. It needs
 * the front page's login (the bot's /api/gear answers logged-in members only), in the server picked
 * there.
 */


interface Me {
  user: { id: string; name: string; avatar: string };
  servers: { id: string; name: string; icon: string | null; balance: number }[];
}

/** One copy the member owns (the bot's web/gear.ts GearCopy). */
interface GearCopy {
  id: string;
  itemId: string;
  name: string;
  stars: 1 | 2 | 3 | 4;
  slot: Slot;
  description: string;
  level: number;
  maxLevel: number;
  masterwork: boolean;
  effects: string[];
  borrowed: number | null;
}

/** One of the member's loadouts (the bot's web/gear.ts GearLoadout). */
interface GearLoadout {
  number: number;
  name: string;
  active: boolean;
  equipped: Record<Slot, string | null>;
}

/** A group of stats on the Common tab (the bot's web/stats.ts StatSection); `base` is the value without gear, when gear changes it. */
interface StatSection {
  title: string;
  rows: { label: string; value: string; base: string | null }[];
}

interface GearView {
  equipped: Record<Slot, string | null>;
  copies: GearCopy[];
  totals: string[];
  loadouts: GearLoadout[];
  stats: StatSection[];
}

const SLOTS: Slot[] = ['weapon', 'armor', 'treasure'];

const SERVER_KEY = 'koma.server';
/** The armory always shows at least this many cells, and fills out its last row (12 fits 3 or 4 across). */
const GRID_CELLS = 12;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  me: $('me'),
  status: $('status'),
  gear: $('gear'),
  heroName: $('hero-name'),
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
  views: [...document.querySelectorAll<HTMLButtonElement>('[data-view]')],
  slots: [...document.querySelectorAll<HTMLButtonElement>('.slot')],
  tabs: [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')],
};

let session = getSession();
let me: Me | null = null;
let server = store.get(localStorage, SERVER_KEY);
let gear: GearView | null = null;
let filter: Slot | 'all' = 'all';
/** What the panel beside the miner shows. */
let view: 'common' | 'gear' = 'gear';
/** The copy shown over the miner, if any. */
let picked: string | null = null;
/** An equip, unequip or loadout switch on its way: the page waits for it before taking another. */
let busy = false;

function status(text: string | null, bad = false): void {
  ui.status.hidden = text === null;
  ui.status.textContent = text ?? '';
  ui.status.classList.toggle('bad', bad);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}), ...init.headers },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }
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

function renderGrid(): void {
  if (!gear) return;
  ui.grid.textContent = '';
  const shown = gear.copies.filter((c) => filter === 'all' || c.slot === filter);
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
  const cells = Math.max(GRID_CELLS, Math.ceil(shown.length / GRID_CELLS) * GRID_CELLS);
  for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
  if (shown.length === 0) {
    const note = el('p', 'armory-empty', filter === 'all' ? "You don't own any gear yet. Pull some with Koma's gacha in Discord." : `No ${SLOT_NAME[filter].toLowerCase()} yet.`);
    ui.grid.append(note);
  }
}

function renderDetail(): void {
  const copy = copyById(picked);
  ui.detail.hidden = !copy;
  ui.gear.classList.toggle('picking', !!copy);
  ui.detail.textContent = '';
  if (!copy || !gear) return;
  ui.detail.dataset.stars = String(copy.stars);
  ui.detail.setAttribute('aria-label', copy.name);

  const head = el('div', 'detail-head');
  const title = el('div', 'detail-title');
  const name = el('h3', '', copy.name);
  if (copy.masterwork) name.append(el('span', 'detail-mw', '✨ Masterwork'));
  title.append(name);
  const meta = el('p', 'detail-meta');
  meta.append(stars(copy.stars), ` ${SLOT_NAME[copy.slot]} · R${copy.level}/${copy.maxLevel}`);
  title.append(meta);
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', unpick);
  head.append(art(copy.itemId, copy.slot), title, close);

  const effects = el('ul', 'detail-effects');
  for (const line of copy.effects) effects.appendChild(el('li')).append(rich(line));
  if (copy.effects.length === 0) effects.append(el('li', 'muted', 'No effects.'));

  const worn = isWorn(copy);
  const current = worn ? undefined : copyById(gear.equipped[copy.slot]);
  const action = el('button', 'detail-action', worn ? 'Unequip' : 'Equip');
  action.type = 'button';
  action.disabled = busy;
  action.classList.toggle('secondary', worn);
  action.addEventListener('click', () => void (worn ? unequip(copy.slot) : equip(copy.id)));

  ui.detail.append(head, el('p', 'detail-desc', copy.description), effects);
  if (copy.borrowed !== null) {
    ui.detail.append(el('p', 'detail-note', `This one is made for someone else: you get ${Math.round(copy.borrowed * 100)}% of its effects.`));
  }
  const foot = el('div', 'detail-foot');
  foot.append(action);
  if (current) foot.append(el('span', 'muted', `Replaces ${current.name} (R${current.level})`));
  ui.detail.append(foot);
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

  ui.loadoutMenu.textContent = '';
  for (const loadout of gear.loadouts) {
    const row = el('button', 'loadout-row');
    row.type = 'button';
    row.disabled = busy;
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
      if (!loadout.active) void switchTo(loadout.number);
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

/** The Common tab's first group, about the hero rather than their gear. No classes yet, so it's a question mark. */
const HERO_INFO: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: '?', base: null }] };

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

function render(): void {
  if (!me || !gear) return;
  ui.gear.hidden = false;
  ui.heroName.textContent = me.user.name;
  ui.armoryTitle.textContent = `${me.user.name}'s Armory`;
  ui.statsTitle.textContent = `${me.user.name}'s Stats`;
  for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === filter));
  renderSlots();
  renderGrid();
  renderDetail();
  renderFoot();
  renderTotals();
  renderStats();
  renderView();
}

// ---------------------------------------------------------------------------
// Asking the bot

function failed(res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  status(
    res.status === 0
      ? 'Koma is not answering right now. Try again in a moment.'
      : res.error === 'not_member'
        ? "You don't seem to be in that server any more. Log out and in again to refresh it."
        : res.error === 'busy'
          ? 'Your loadouts were changing somewhere else. Try again.'
          : what,
    true,
  );
}

async function loadGear(): Promise<void> {
  if (!server) return;
  const res = await api<GearView>(`/api/gear?guild=${encodeURIComponent(server)}`);
  if (!res.ok) return failed(res, 'Could not load your gear.');
  gear = res.data;
  if (!copyById(picked)) picked = null;
  status(null);
  render();
}

async function change(path: string, body: Record<string, unknown>, what: string): Promise<void> {
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

function logOut(): void {
  setSession(null);
  location.href = '/';
}

function renderServers(): void {
  if (!me) return;
  ui.server.textContent = '';
  ui.server.hidden = me.servers.length < 2;
  for (const s of me.servers) {
    const option = el('option', '', s.name);
    option.value = s.id;
    option.selected = s.id === server;
    ui.server.append(option);
  }
}

ui.server.addEventListener('change', () => {
  server = ui.server.value;
  store.set(localStorage, SERVER_KEY, server);
  picked = null;
  void loadGear();
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
document.addEventListener('click', (event) => {
  if (!ui.loadoutMenu.hidden && !ui.loadoutMenu.contains(event.target as Node)) showMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!ui.loadoutMenu.hidden) {
    showMenu(false);
    ui.loadoutButton.focus();
  } else if (picked) unpick();
});

async function start(): Promise<void> {
  if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  // Logging in happens on the front page.
  if (!session) {
    location.href = '/';
    return;
  }
  status('Loading…');
  const res = await api<Me>('/api/me');
  if (!res.ok) return failed(res, 'Could not load your servers.');
  me = res.data;
  ui.me.hidden = false;
  ui.me.append(
    profileMenu(me.user, [
      { label: 'Games', icon: 'games', href: '/#games', className: 'site-nav-item' },
      { label: 'Gear', icon: 'gear', href: '/gear/', className: 'site-nav-item' },
      { label: 'Databank', icon: 'databank', href: '/databank/', className: 'site-nav-item' },
      { label: 'My Servers', icon: 'servers', href: '/#play' },
      { label: 'Logout', icon: 'logout', onSelect: logOut },
    ]),
  );
  if (!me.servers.some((s) => s.id === server)) server = me.servers[0]?.id ?? null;
  if (!server) return status('None of your servers have Koma in them yet.');
  renderServers();
  await loadGear();
}

void start();
