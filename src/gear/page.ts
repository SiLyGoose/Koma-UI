import markup from './gear.html?raw';
import { API } from '../shared/account';
import { currentCharacter } from '../shared/characters';
import { dropdown } from '../shared/dropdown';
import { art, el, rich, SLOT_NAME, stars, type Slot } from '../shared/items/items';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';

/*
 * The gear page: the member's character (Tsuri, for now) with their three slots around them (weapon and
 * armor on the left, the treasure on the right), and their armory beside it: every copy they own, on
 * parchment. Picking a copy shows what it does over the character and equips it; picking a slot shows
 * what fits in it. Under the character: switching loadouts (and outfits, one day); under the armory,
 * taking everything off. The tabs under the character swap the armory for their stats (Common), worked
 * out by the bot. Logged-in members only (the bot's /api/gear answers them only), in the server picked.
 */

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
  /** Refining it, for the confirmation (absent from a bot from before refining on the site). */
  refine?: GearRefine;
}

/** Refining a copy (the bot's web/gear.ts GearRefine). */
interface GearRefine {
  /** Why it can't be done now (null when it can). */
  blocked: RefineBlock | null;
  /** What the next level costs in points. */
  cost: number | null;
  /** The level of the spare copy it uses up. */
  spare: number | null;
  /** What it would do at the next level. */
  after: string[] | null;
}

/** Why a copy can't be refined (the bot's web/gear.ts RefineBlock): also the error a refine is refused with. */
type RefineBlock = 'maxed' | 'no_duplicate' | 'other_copy' | 'too_poor';

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
  /** Their points in the server (null when not known). */
  balance?: number | null;
}

const SLOTS: Slot[] = ['weapon', 'armor', 'treasure'];

/** The armory always shows at least this many cells, and fills out its last row (12 fits 3 or 4 across). */
const GRID_CELLS = 12;

/** The Common tab's first group, about the hero rather than their gear. No classes yet, so it's a question mark. */
const HERO_INFO: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: '?', base: null }] };

const points = (n: number): string => n.toLocaleString('en-US');

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
    confirm: $<HTMLDialogElement>('refine-confirm'),
    confirmTitle: $('refine-title'),
    confirmFrom: $('refine-from'),
    confirmTo: $('refine-to'),
    confirmBefore: $('refine-before'),
    confirmAfter: $('refine-after'),
    confirmSpare: $('refine-spare'),
    confirmCost: $('refine-cost'),
    confirmBalance: $('refine-balance'),
    confirmGo: $<HTMLButtonElement>('refine-go'),
    other: $<HTMLDialogElement>('refine-other'),
    otherTitle: $('refine-other-title'),
    otherCard: $('refine-other-card'),
    otherText: $('refine-other-text'),
    otherGo: $<HTMLButtonElement>('refine-other-go'),
    loadoutButton: $<HTMLButtonElement>('loadout-button'),
    loadoutMenu: $('loadout-menu'),
    unequipAll: $<HTMLButtonElement>('unequip-all'),
    armory: $('armory'),
    stats: $('stats'),
    statsTitle: $('stats-title'),
    statsList: $('stats-list'),
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
    const current = worn ? undefined : copyById(gear.equipped[copy.slot]);
    const action = el('button', 'detail-action', worn ? 'Unequip' : 'Equip');
    action.type = 'button';
    action.disabled = busy;
    action.classList.toggle('secondary', worn);
    action.addEventListener('click', () => void (worn ? unequip(copy.slot) : equip(copy.id)));

    // Refine: asks first (what it does after, what it uses up), when the bot says it can be. Short of
    // points it still opens, to show the price. On a spare copy it offers the item's main copy instead
    // (the one a refine raises), so it goes by whether that one can be. (A bot from before refining on
    // the site sends nothing: the button stays off.)
    const main = mainCopyOf(copy);
    const target = main ?? copy;
    const blocked = target.refine ? target.refine.blocked : 'maxed';
    const refineButton = el('button', 'detail-action secondary', 'Refine');
    refineButton.type = 'button';
    refineButton.disabled = busy || (blocked !== null && blocked !== 'too_poor');
    refineButton.addEventListener('click', () => (main ? offerMain(copy, main) : askRefine(copy)));

    // What it does.
    const body = el('div', 'detail-body');
    body.append(el('p', 'detail-desc', copy.description), effects);
    if (copy.borrowed !== null) {
      body.append(el('p', 'detail-note', `This one is made for someone else: you get ${Math.round(copy.borrowed * 100)}% of its effects.`));
    }
    if (current) body.append(el('p', 'detail-replaces', `Replaces ${current.name} (R${current.level})`));

    // What can be done with it, under a line along the bottom.
    const foot = el('div', 'detail-foot');
    foot.append(refineButton, action);
    // All but the buttons scrolls, when it runs longer than the panel.
    const scroll = el('div', 'detail-scroll');
    scroll.append(bar, top, body);
    ui.detail.append(scroll, foot);
  }

  /** A copy's card, big (the detail panel's, and the spare copy's offer). */
  function bigCard(copy: GearCopy): HTMLElement {
    const card = el('span', 'item detail-card');
    card.dataset.stars = String(copy.stars);
    card.classList.toggle('masterwork', copy.masterwork);
    card.append(el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl'));
    return card;
  }

  /** For a spare copy: the copy of its item a refine raises instead (worn, saved in a loadout, or the best). */
  function mainCopyOf(copy: GearCopy): GearCopy | undefined {
    if (copy.refine?.blocked !== 'other_copy') return undefined;
    return gear?.copies.find((c) => c.itemId === copy.itemId && c.refine?.blocked !== 'other_copy');
  }

  /** Picks `copy` (as a click on its card does), keeping the armory and the panel in step. */
  function pick(copy: GearCopy): void {
    picked = copy.id;
    renderGrid();
    renderDetail();
  }

  /** The main copy the spare-copy offer is about, while it's open. */
  let offering: string | null = null;

  /**
   * Refine on a spare copy: a refine raises the item's main copy, so offer that one. At R1 every copy
   * is the same, so there's nothing to choose: that one is picked quietly and asked about at once.
   */
  function offerMain(spare: GearCopy, main: GearCopy): void {
    if (main.level <= 1) {
      pick(main);
      askRefine(main);
      return;
    }
    offering = main.id;
    ui.otherTitle.textContent = `Refine your R${main.level} copy instead?`;
    ui.otherCard.replaceChildren(bigCard(main));
    ui.otherText.textContent =
      `This is a spare ${spare.name}. Refining raises your ${isWorn(main) ? 'equipped' : 'main'} copy (R${main.level}), ` +
      'and uses up a spare like this one.';
    ui.otherGo.textContent = `Refine R${main.level} copy`;
    ui.other.showModal();
    (ui.other.querySelector('button[value="cancel"]') as HTMLButtonElement).focus();
  }

  ui.other.addEventListener('close', () => {
    const main = copyById(offering);
    offering = null;
    const yes = ui.other.returnValue === 'switch';
    ui.other.returnValue = '';
    if (!yes || !main) return;
    pick(main);
    askRefine(main);
  });
  ui.other.addEventListener('click', (event) => {
    if (event.target === ui.other) ui.other.close('cancel');
  });

  /** The copy the confirmation is asking about, while it's open. */
  let confirming: string | null = null;

  /** Opens the confirmation for refining `copy`: what it does now and at the next level, and what it uses up. */
  function askRefine(copy: GearCopy): void {
    const refine = copy.refine;
    if (!refine || refine.after === null || refine.cost === null) return;
    confirming = copy.id;
    const to = copy.level + 1;
    ui.confirmTitle.textContent = `Refine ${copy.name}?`;
    ui.confirmFrom.textContent = `Now · R${copy.level}`;
    ui.confirmTo.textContent = `After · R${to}${to >= copy.maxLevel ? ' (MAX)' : ''}`;
    const list = (into: HTMLElement, lines: string[], compare?: string[]): void => {
      into.textContent = '';
      for (const [i, line] of lines.entries()) {
        const li = into.appendChild(el('li'));
        li.append(rich(line));
        // A line that's different after the refine stands out.
        if (compare && compare[i] !== line) li.classList.add('changed');
      }
      if (lines.length === 0) into.append(el('li', 'muted', 'No effects.'));
    };
    list(ui.confirmBefore, copy.effects);
    list(ui.confirmAfter, refine.after, copy.effects);

    ui.confirmSpare.textContent = refine.spare === null ? 'A spare copy' : `A spare copy (R${refine.spare})`;
    ui.confirmCost.textContent = `${points(refine.cost)} points`;
    const balance = gear?.balance ?? currentMe()?.servers.find((s) => s.id === currentServer())?.balance ?? null;
    const short = balance !== null && balance < refine.cost;
    ui.confirmBalance.textContent =
      balance === null ? '?' : short ? `${points(balance)} points: not enough` : `${points(balance)} → ${points(balance - refine.cost)} points`;
    ui.confirmBalance.classList.toggle('bad', short);
    ui.confirmGo.disabled = busy || short;
    ui.confirm.showModal();
    // Cancel first, so Enter doesn't refine by accident.
    (ui.confirm.querySelector('button[value="cancel"]') as HTMLButtonElement).focus();
  }

  ui.confirm.addEventListener('close', () => {
    const copy = confirming;
    confirming = null;
    if (ui.confirm.returnValue === 'refine' && copy) void refine(copy);
    ui.confirm.returnValue = '';
  });
  // A click on the dim backdrop (outside the box) cancels.
  ui.confirm.addEventListener('click', (event) => {
    if (event.target === ui.confirm) ui.confirm.close('cancel');
  });

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
    const me = currentMe();
    if (!me || !gear) return;
    ui.gear.hidden = false;
    ui.heroName.textContent = me.user.name;
    const character = currentCharacter();
    if (ui.sprite.getAttribute('src') !== character.sprite) ui.sprite.src = character.sprite;
    ui.sprite.width = character.width;
    ui.sprite.height = character.height;
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
            ? 'Your gear was changing somewhere else. Try again.'
            : res.error === 'too_poor'
              ? "You don't have enough points for that."
              : res.error === 'no_duplicate' || res.error === 'other_copy' || res.error === 'maxed'
                ? 'That changed in the meantime: it can’t be refined right now.'
                : what,
      true,
    );
  }

  async function loadGear(): Promise<void> {
    const server = currentServer();
    if (!server) return;
    const res = await api<GearView>(`/api/gear?guild=${encodeURIComponent(server)}`);
    if (!res.ok) return failed(res, 'Could not load your gear.');
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
  const refine = async (copy: string): Promise<void> => {
    await change('/api/gear/refine', { copy }, 'Could not refine that. Try again.');
    // It cost points (or whatever the refusal was, the balance may be old): the front page's balances follow.
    void loadMe(true);
  };

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
  const onClick = (event: MouseEvent): void => {
    if (!ui.loadoutMenu.hidden && !ui.loadoutMenu.contains(event.target as Node)) showMenu(false);
  };
  const onKey = (event: KeyboardEvent): void => {
    // The confirmation closes itself on Escape: the picked copy stays.
    if (event.key !== 'Escape' || ui.confirm.open || ui.other.open) return;
    if (!ui.loadoutMenu.hidden) {
      showMenu(false);
      ui.loadoutButton.focus();
    } else if (picked) unpick();
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    status('Loading…');
    const res = await loadMe();
    if (!res.ok) return failed(res, 'Could not load your servers.');
    if (!currentServer()) return status('None of your servers have Koma in them yet.');
    renderServers();
    await loadGear();
  }

  return {
    drawn: start(),
    unmount() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      serverPicker.destroy();
      if (ui.confirm.open) ui.confirm.close();
      if (ui.other.open) ui.other.close();
    },
  };
}
