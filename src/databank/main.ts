import '../shared/style.css';
import '../shared/header.css';
import { API, getSession, profileMenu, setSession, store } from '../shared/account';
import { dropdown } from '../shared/dropdown';
import '../shared/items/items.css';
import './databank.css';
import { art, el, rich, SLOT_NAME, stars, type Slot } from '../shared/items/items';

/*
 * The databank page: every item in the game (the bot's /api/databank, which needs no login), by star
 * tier on the armory's parchment, and what the one picked does at each refinement level, like the
 * `databank` command. Logged in, it also marks the items the member owns in the server picked (from
 * their /api/gear) and can show only those.
 */

type Stars = 1 | 2 | 3 | 4;

/** One item (the bot's web/databank.ts DatabankItem). */
interface DatabankItem {
  id: string;
  name: string;
  stars: Stars;
  slot: Slot;
  description: string;
  /** `effects[0]` is R1. */
  effects: string[][];
  masterwork: string[] | null;
  borrowed: number | null;
}

interface Databank {
  maxLevel: number;
  items: DatabankItem[];
}

interface Me {
  user: { id: string; name: string; avatar: string };
  servers: { id: string; name: string }[];
}

/** What the member owns of one item: how many copies, and the best one's level. */
interface Owned {
  count: number;
  best: number;
}

const SERVER_KEY = 'koma.server';
const TIERS: readonly Stars[] = [4, 3, 2, 1];

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  me: $('me'),
  login: $('header-login'),
  status: $('status'),
  databank: $('databank'),
  detail: $('detail'),
  detailBody: $('detail-body'),
  search: $<HTMLInputElement>('search'),
  server: $<HTMLSelectElement>('server'),
  list: $('db-list'),
  count: $('db-count'),
  ownedOnly: $<HTMLButtonElement>('owned-only'),
  tabs: [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')],
  chips: [...document.querySelectorAll<HTMLButtonElement>('[data-stars-filter]')],
};

const session = getSession();
let server = store.get(localStorage, SERVER_KEY);
let databank: Databank | null = null;
/** By item id; null when not logged in (nothing to mark). */
let owned: Map<string, Owned> | null = null;

let slotFilter: Slot | 'all' = 'all';
let starFilter: Stars | 'all' = 'all';
let onlyOwned = false;
let query = '';
/** The item shown in the panel. On narrow screens it's only open once one is picked. */
let picked: string | null = null;
let sheetOpen = false;
/** The level the panel shows (1 to maxLevel), and whether the masterwork bonus is on (at the top level only). */
let level = 5;
let masterwork = false;

const narrow = window.matchMedia('(max-width: 899px)');

function status(text: string | null, bad = false): void {
  ui.status.hidden = text === null;
  ui.status.textContent = text ?? '';
  ui.status.classList.toggle('bad', bad);
}

async function api<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const res = await fetch(`${API}${path}`, { headers: session ? { Authorization: `Bearer ${session}` } : {} });
    return res.ok ? { ok: true, data: (await res.json()) as T } : { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ---------------------------------------------------------------------------
// Drawing

const itemById = (id: string | null): DatabankItem | undefined => (id ? databank?.items.find((item) => item.id === id) : undefined);

function matches(item: DatabankItem): boolean {
  if (slotFilter !== 'all' && item.slot !== slotFilter) return false;
  if (starFilter !== 'all' && item.stars !== starFilter) return false;
  if (onlyOwned && !owned?.has(item.id)) return false;
  if (query === '') return true;
  const text = `${item.name} ${item.id} ${item.description}`.toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
}

function card(item: DatabankItem): HTMLButtonElement {
  const mine = owned?.get(item.id);
  const button = el('button', 'item db-item');
  button.type = 'button';
  button.dataset.stars = String(item.stars);
  button.classList.toggle('picked', item.id === picked);
  button.classList.toggle('unowned', owned !== null && !mine);
  button.setAttribute('aria-label', `${item.name}, ${item.stars} star${item.stars === 1 ? '' : 's'}, ${SLOT_NAME[item.slot]}${mine ? `, you own ${mine.count}` : ''}`);
  if (mine) button.append(el('span', 'item-level', `×${mine.count}`));
  button.append(stars(item.stars), art(item.id, item.slot), el('span', 'db-name', item.name), el('span', 'item-curl'));
  button.addEventListener('click', () => {
    picked = item.id;
    sheetOpen = true;
    renderList();
    renderDetail();
  });
  return button;
}

function renderList(): void {
  if (!databank) return;
  ui.list.textContent = '';
  const shown = databank.items.filter(matches);
  for (const tier of TIERS) {
    const items = shown.filter((item) => item.stars === tier);
    if (items.length === 0) continue;
    const section = el('section', 'db-tier');
    section.dataset.stars = String(tier);
    const head = el('h3', 'db-tier-head');
    head.append(stars(tier), el('span', '', `${items.length} item${items.length === 1 ? '' : 's'}`));
    const grid = el('div', 'armory-grid');
    for (const item of items) grid.append(card(item));
    section.append(head, grid);
    ui.list.append(section);
  }
  if (shown.length === 0) ui.list.append(el('p', 'db-empty', onlyOwned && owned?.size === 0 ? "You don't own any gear here yet." : 'No items match that.'));
  const total = databank.items.length;
  ui.count.textContent = shown.length === total ? `${total} items` : `${shown.length} of ${total} items`;
  if (owned) ui.count.textContent += ` · you own ${databank.items.filter((item) => owned!.has(item.id)).length}`;
}

function levelButton(label: string, pressed: boolean, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'db-level', label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(pressed));
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

function renderDetail(): void {
  const item = itemById(picked);
  ui.detailBody.textContent = '';
  ui.detail.hidden = !item || (narrow.matches && !sheetOpen);
  if (!item || !databank) return;
  const { maxLevel } = databank;
  ui.detail.dataset.stars = String(item.stars);
  ui.detail.setAttribute('aria-label', item.name);

  const head = el('div', 'detail-head');
  const title = el('div', 'detail-title');
  const name = el('h3', '', item.name);
  const bonusOn = masterwork && level === maxLevel && item.masterwork !== null;
  if (bonusOn) name.append(el('span', 'detail-mw', '✨ Masterwork'));
  const meta = el('p', 'detail-meta');
  meta.append(stars(item.stars), ` ${SLOT_NAME[item.slot]}`);
  title.append(name, meta);
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => {
    sheetOpen = false;
    renderDetail();
  });
  head.append(art(item.id, item.slot), title, close);

  // The level picker: R1 to the top, then the masterwork (only items with a bonus have one).
  const levels = el('div', 'db-levels');
  levels.setAttribute('aria-label', 'Refinement level');
  for (let l = 1; l <= maxLevel; l++) {
    levels.append(
      levelButton(`R${l}`, l === level && !bonusOn, false, () => {
        level = l;
        masterwork = false;
        renderDetail();
      }),
    );
  }
  if (item.masterwork !== null) {
    levels.append(
      levelButton('✨', bonusOn, false, () => {
        level = maxLevel;
        masterwork = true;
        renderDetail();
      }),
    );
  }

  const lines = bonusOn ? (item.masterwork ?? []) : (item.effects[level - 1] ?? []);
  const effects = el('ul', 'detail-effects');
  for (const line of lines) effects.appendChild(el('li')).append(rich(line));
  if (lines.length === 0) effects.append(el('li', 'muted', 'No effects.'));

  ui.detailBody.append(head, el('p', 'detail-desc', item.description), levels, effects);
  // At the top level the effects already name the (locked) bonus.
  if (item.masterwork !== null && level < maxLevel) {
    ui.detailBody.append(el('p', 'detail-note', `Has a masterwork bonus at R${maxLevel}: press ✨ to see it.`));
  }
  if (item.borrowed !== null) {
    ui.detailBody.append(el('p', 'detail-note', `Made for certain members. Anyone else can wear it for ${Math.round(item.borrowed * 100)}% of its effects.`));
  }
  const mine = owned?.get(item.id);
  if (owned) {
    ui.detailBody.append(el('p', 'db-owned-line', mine ? `You own ${mine.count} ${mine.count === 1 ? 'copy' : 'copies'}, the best at R${mine.best}.` : "You don't own this one yet."));
  }
}

function render(): void {
  ui.databank.hidden = false;
  for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === slotFilter));
  for (const chip of ui.chips) chip.setAttribute('aria-pressed', String(chip.dataset.starsFilter === String(starFilter)));
  ui.ownedOnly.hidden = owned === null;
  ui.ownedOnly.setAttribute('aria-pressed', String(onlyOwned));
  renderList();
  renderDetail();
}

// ---------------------------------------------------------------------------
// Loading

async function loadOwned(): Promise<void> {
  if (!server) return;
  const res = await api<{ copies: { itemId: string; level: number }[] }>(`/api/gear?guild=${encodeURIComponent(server)}`);
  if (!res.ok) {
    owned = null;
    onlyOwned = false;
    return;
  }
  owned = new Map();
  for (const copy of res.data.copies) {
    const mine = owned.get(copy.itemId);
    if (mine) {
      mine.count += 1;
      mine.best = Math.max(mine.best, copy.level);
    } else owned.set(copy.itemId, { count: 1, best: copy.level });
  }
}

/** Logged in: the profile button, the server picker, and what they own. Anyone else just gets the list. */
async function loadMember(): Promise<void> {
  if (!session) {
    ui.login.hidden = false;
    return;
  }
  const res = await api<Me>('/api/me');
  if (!res.ok) {
    if (res.status === 401) setSession(null);
    ui.login.hidden = false;
    return;
  }
  const me = res.data;
  ui.me.hidden = false;
  ui.me.append(
    profileMenu(me.user, [
      { label: 'Games', icon: 'games', href: '/#games', className: 'site-nav-item' },
      { label: 'Gear', icon: 'gear', href: '/gear/', className: 'site-nav-item' },
      { label: 'Databank', icon: 'databank', href: '/databank/', className: 'site-nav-item' },
      { label: 'My Servers', icon: 'servers', href: '/#play' },
      {
        label: 'Logout',
        icon: 'logout',
        onSelect: () => {
          setSession(null);
          location.reload();
        },
      },
    ]),
  );
  if (!me.servers.some((s) => s.id === server)) server = me.servers[0]?.id ?? null;
  ui.server.hidden = me.servers.length < 2;
  for (const s of me.servers) {
    const option = el('option', '', s.name);
    option.value = s.id;
    option.selected = s.id === server;
    ui.server.append(option);
  }
  await loadOwned();
}

ui.search.addEventListener('input', () => {
  query = ui.search.value.trim().toLowerCase();
  renderList();
});

// The server picker in the site's dropdown, not the browser's (it follows the select, options and all).
dropdown(ui.server);

ui.server.addEventListener('change', () => {
  server = ui.server.value;
  store.set(localStorage, SERVER_KEY, server);
  void loadOwned().then(render);
});

for (const tab of ui.tabs) {
  tab.addEventListener('click', () => {
    slotFilter = tab.dataset.filter as Slot | 'all';
    render();
  });
}

for (const chip of ui.chips) {
  chip.addEventListener('click', () => {
    const value = chip.dataset.starsFilter;
    starFilter = value === 'all' ? 'all' : (Number(value) as Stars);
    render();
  });
}

ui.ownedOnly.addEventListener('click', () => {
  onlyOwned = !onlyOwned;
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOpen) {
    sheetOpen = false;
    renderDetail();
  }
});
narrow.addEventListener('change', renderDetail);

async function start(): Promise<void> {
  if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status('Loading…');
  const [res] = await Promise.all([api<Databank>('/api/databank'), loadMember()]);
  if (!res.ok) return status(res.status === 0 ? 'Koma is not answering right now. Try again in a moment.' : 'Could not load the databank.', true);
  databank = res.data;
  level = databank.maxLevel;
  // A link to one item (/databank/#piplup) opens it; otherwise the panel starts on the first.
  const wanted = decodeURIComponent(location.hash.slice(1));
  picked = itemById(wanted)?.id ?? databank.items[0]?.id ?? null;
  sheetOpen = itemById(wanted) !== undefined;
  status(null);
  render();
}

void start();
