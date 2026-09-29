import markup from './forge.html?raw';
import { API } from '../shared/account';
import { dropdown } from '../shared/dropdown';
import { DORMANT, forgePlan, type GearCopy, type GearView, type Plan } from '../shared/items/gear';
import { art, el, rich, SLOT_NAME, stars, type Slot } from '../shared/items/items';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';

/*
 * The forge: the member's armory on the right, the anvil on the left. Picking a copy puts it on the
 * anvil as the target, with the spare copy of it a refine uses up as the material, the odds, what it
 * does now against what it will do (each number that changes as old » new), and the price in the
 * corner beside the button. Refining raises the copy the bot picks (the one worn, else one saved in a
 * loadout, else their best), so picking a spare puts that one on the anvil instead. A fully refined
 * copy with a masterwork bonus waiting is forged instead, for komaGems, when the bot takes that on the
 * site (else it points to `forge` in Discord). The gear page's Upgrade comes here with ?copy=<id>, which
 * starts with that copy on the anvil. Logged-in members only, in the server picked.
 */

/** Every refine and forge works for now: no chance of failing, so nothing to make up for it. */
const SUCCESS_RATE = 100;
const FAILURE_BONUS = 0;

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** komaGems, as the bot writes them (its constants/core.ts GEM_EMOJI). */
const GEM_EMOJI = '<:komagem:1551635240210927736>';

const points = (n: number): string => n.toLocaleString('en-US');

// ---------------------------------------------------------------------------
// Now against after

/** A number in an effect line, with its sign and % if it has them: "+12%", "3", "1,500", "-0.5%". */
const NUMBER = /[+-]?\d[\d,]*(?:\.\d+)?%?/g;
/** An effect line's words without its emoji (whose ids are numbers too) or Discord's markup. */
const plain = (line: string): string => line.replace(/<a?:\w+:\d+>/g, '').replace(/[*`]/g, '');
/** A line with its numbers blanked: two lines with the same shape are the same effect at different strengths. */
const shape = (line: string): string => plain(line).replace(NUMBER, '#');
const numbers = (line: string): string[] => plain(line).match(NUMBER) ?? [];

/** One row under the anvil: an effect as it is now, and the numbers in it that change (or it's new, or it goes). */
interface EffectRow {
  line: string;
  changes: { from: string; to: string }[];
  state: 'same' | 'changed' | 'new' | 'gone';
}

/**
 * Pairs each line of `after` with the line of `before` for the same effect (same shape), to show each
 * number that changes; a line with no partner is new (or, from `before`, gone).
 */
function compare(before: readonly string[], after: readonly string[]): EffectRow[] {
  const unused = [...before];
  const rows: EffectRow[] = [];
  for (const line of after) {
    const at = unused.findIndex((old) => shape(old) === shape(line));
    if (at < 0) {
      rows.push({ line, changes: [], state: 'new' });
      continue;
    }
    const [old] = unused.splice(at, 1) as [string];
    const from = numbers(old);
    const to = numbers(line);
    const changes = from.flatMap((n, i) => (n === to[i] ? [] : [{ from: n, to: to[i] ?? '' }]));
    rows.push({ line: old, changes, state: changes.length ? 'changed' : 'same' });
  }
  for (const line of unused) rows.push({ line, changes: [], state: 'gone' });
  return rows;
}

export const forgePage: Page = { path: '/forge', title: 'Forge · Komaverse', icon: '🔨', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const ui = {
    status: $('status'),
    forge: $('forge'),
    anvil: root.querySelector('.anvil') as HTMLElement,
    server: $<HTMLSelectElement>('server'),
    hint: $('hint'),
    target: $('target'),
    material: $('material'),
    rate: $('rate'),
    bonus: $('bonus'),
    effects: $('effects'),
    cost: $('cost'),
    go: $<HTMLButtonElement>('go'),
    armoryTitle: $('armory-title'),
    grid: $('armory-grid'),
    tabs: [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')],
  };

  let gear: GearView | null = null;
  let filter: Slot | 'all' = 'all';
  /** The copy on the anvil, if any. */
  let picked: string | null = null;
  /** The spare that was clicked when the copy a refine raises went on the anvil in its place. */
  let swappedFrom: string | null = null;
  /** What the last refine or forge did, shown in the hint until the next pick. */
  let done: string | null = null;
  /** A refine or forge on its way: the page waits for it before taking another. */
  let busy = false;

  function status(text: string | null, bad = false): void {
    ui.status.hidden = text === null;
    ui.status.textContent = text ?? '';
    ui.status.classList.toggle('bad', bad);
  }

  const copyById = (id: string | null): GearCopy | undefined => (id ? gear?.copies.find((c) => c.id === id) : undefined);
  const isWorn = (copy: GearCopy): boolean => gear?.equipped[copy.slot] === copy.id;
  const balance = (): number | null => gear?.balance ?? currentMe()?.servers.find((s) => s.id === currentServer())?.balance ?? null;

  /** For a spare copy: the copy of its item a refine (or forge) raises instead. */
  function mainCopyOf(copy: GearCopy): GearCopy | undefined {
    if (copy.refine?.blocked !== 'other_copy') return undefined;
    return gear?.copies.find((c) => c.itemId === copy.itemId && c.refine?.blocked !== 'other_copy');
  }

  /**
   * The spare a refine of `copy` uses up, as the bot picks it: their lowest-level other copy of the
   * item that isn't worn, saved in a loadout, or a masterwork.
   */
  function materialFor(copy: GearCopy): GearCopy | undefined {
    if (!gear) return undefined;
    const kept = new Set<string>();
    for (const id of Object.values(gear.equipped)) if (id) kept.add(id);
    for (const loadout of gear.loadouts) for (const id of Object.values(loadout.equipped)) if (id) kept.add(id);
    return gear.copies
      .filter((c) => c.itemId === copy.itemId && c.id !== copy.id && !kept.has(c.id) && !c.masterwork)
      .sort((a, b) => a.level - b.level)[0];
  }

  // ---------------------------------------------------------------------------
  // Drawing

  /** A copy's card on the anvil (as in the armory, but not a button). */
  function card(copy: GearCopy): HTMLElement {
    const box = el('span', 'item');
    box.dataset.stars = String(copy.stars);
    box.classList.toggle('masterwork', copy.masterwork);
    box.title = `${copy.name} (R${copy.level})`;
    box.append(el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl'));
    return box;
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
    const target = copyById(picked);
    const material = target && forgePlan(target).kind === 'refine' ? materialFor(target) : undefined;
    const shown = gear.copies.filter((c) => filter === 'all' || c.slot === filter);
    for (const copy of shown) {
      const button = el('button', 'item');
      button.type = 'button';
      button.dataset.stars = String(copy.stars);
      button.classList.toggle('picked', copy.id === picked);
      button.classList.toggle('material', copy.id === material?.id);
      button.classList.toggle('masterwork', copy.masterwork);
      button.setAttribute('aria-label', `${copy.name}, ${copy.stars} star${copy.stars === 1 ? '' : 's'}, R${copy.level}${isWorn(copy) ? ', equipped' : ''}`);
      if (copy.id === material?.id) button.append(el('span', 'item-tag', 'Material'));
      else if (isWorn(copy)) button.append(el('span', 'item-tag', 'Equipped'));
      button.append(el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl'));
      button.addEventListener('click', () => pick(copy));
      ui.grid.append(button);
    }
    const row = (n: number): number => Math.ceil(n / gridColumns) * gridColumns;
    const cells = Math.max(row(GRID_CELLS), row(shown.length));
    for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
    if (shown.length === 0) {
      const note = el('p', 'armory-empty', filter === 'all' ? "You don't own any gear yet. Pull some with Koma's gacha in Discord." : `No ${SLOT_NAME[filter].toLowerCase()} yet.`);
      ui.grid.append(note);
    }
    sheet.scrollTop = scrolled;
  }

  /** The price in the corner: zeiucoins for a refine, komaGems for a forge. */
  function renderCost(plan: Plan | null): void {
    ui.cost.textContent = '';
    let short = false;
    if (plan?.kind === 'forge') {
      const cost = plan.forge?.cost ?? null;
      ui.cost.append(el('span', 'anvil-cost-icon'));
      (ui.cost.lastChild as HTMLElement).append(rich(GEM_EMOJI));
      ui.cost.append(el('span', 'anvil-cost-amount', cost === null ? '?' : points(cost)));
      short = plan.forge?.blocked === 'too_poor';
      ui.cost.title = cost === null ? '' : `${points(cost)} komaGems${gear?.gems != null ? ` (you have ${points(gear.gems)})` : ''}`;
    } else {
      const cost = plan?.kind === 'refine' ? (plan.refine.cost ?? 0) : 0;
      const coin = el('img', 'anvil-cost-icon');
      coin.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
      coin.alt = 'zeiucoins';
      ui.cost.append(coin, el('span', 'anvil-cost-amount', points(cost)));
      const have = balance();
      short = plan?.kind === 'refine' && (plan.refine.blocked === 'too_poor' || (have !== null && have < cost));
      ui.cost.title = cost && have !== null ? `${points(cost)} zeiucoins (you have ${points(have)})` : '';
    }
    ui.cost.classList.toggle('bad', short);
  }

  /** The line over the slots: how the anvil works, what's in the way, or what was just done. */
  function hintFor(copy: GearCopy | undefined, plan: Plan | null): { text: string; tone?: 'good' | 'bad' } {
    if (done) return { text: done, tone: 'good' };
    if (!copy || !plan) return { text: 'Pick a piece of gear from your armory to put on the anvil.' };
    const swapped = copyById(swappedFrom);
    if (swapped && plan.kind === 'refine') {
      return { text: `Refining raises your ${isWorn(copy) ? 'equipped' : 'main'} ${copy.name}, so it's on the anvil instead of the spare.` };
    }
    switch (plan.kind) {
      case 'unavailable':
        return { text: 'Refining on the site isn’t available yet: use `refine` in Discord.' };
      case 'done':
        return { text: plan.masterwork ? 'A fully refined masterwork: there’s nothing left to forge.' : `Fully refined (R${copy.maxLevel}).` };
      case 'forge': {
        if (!plan.forge) return { text: 'Forge it into a masterwork with `forge` in Discord to awaken its bonus.' };
        if (plan.forge.blocked === 'too_poor') return { text: 'You don’t have enough komaGems to forge it. Win raids to earn more.', tone: 'bad' };
        return { text: `Forging it into a masterwork awakens its bonus, for ${points(plan.forge.cost)} komaGems.` };
      }
      case 'refine': {
        const { refine } = plan;
        if (refine.blocked === 'no_duplicate') return { text: `You need a spare ${copy.name} to use up as material.`, tone: 'bad' };
        const have = balance();
        if (refine.blocked === 'too_poor' || (have !== null && refine.cost !== null && have < refine.cost)) {
          return { text: `You need ${points((refine.cost ?? 0) - (have ?? 0))} more zeiucoins to refine it.`, tone: 'bad' };
        }
        return { text: 'The same gear as the target is used up as material.' };
      }
    }
  }

  function renderEffects(copy: GearCopy | undefined, plan: Plan | null): void {
    ui.effects.textContent = '';
    if (!copy || !plan) return;
    let rows: EffectRow[];
    if (plan.kind === 'refine' && plan.refine.after) rows = compare(copy.effects, plan.refine.after);
    // The waiting bonus's line gives way to what it does once forged.
    else if (plan.kind === 'forge' && plan.forge?.after) rows = compare(copy.effects.filter((line) => !line.startsWith(DORMANT)), plan.forge.after);
    else rows = copy.effects.map((line) => ({ line, changes: [], state: 'same' }));
    for (const row of rows) {
      const li = el('li', `forge-row ${row.state}`);
      const text = el('span', 'forge-line');
      text.append(rich(row.line));
      li.append(text);
      if (row.state === 'changed') {
        const change = el('span', 'forge-change');
        for (const { from, to } of row.changes) {
          const pair = el('span', 'forge-pair');
          pair.append(el('span', 'forge-from', from), el('span', 'forge-arrow', '»'), el('span', 'forge-to', to));
          change.append(pair);
        }
        li.append(change);
      } else if (row.state === 'new') li.append(el('span', 'forge-change forge-to', 'New'));
      else if (row.state === 'gone') li.append(el('span', 'forge-change forge-from', 'Gone'));
      ui.effects.append(li);
    }
    if (rows.length === 0) ui.effects.append(el('li', 'forge-row muted', 'No effects.'));
  }

  function renderAnvil(): void {
    const copy = copyById(picked);
    const plan = copy ? forgePlan(copy) : null;
    ui.anvil.dataset.stars = copy ? String(copy.stars) : '';

    const hint = hintFor(copy, plan);
    ui.hint.textContent = '';
    ui.hint.append(rich(hint.text));
    ui.hint.classList.toggle('good', hint.tone === 'good');
    ui.hint.classList.toggle('bad', hint.tone === 'bad');

    ui.target.replaceChildren(copy ? card(copy) : el('span', 'anvil-empty'));
    ui.target.classList.toggle('filled', !!copy);
    // What it uses up: a spare copy for a refine, gems for a forge.
    const material = copy && plan?.kind === 'refine' ? materialFor(copy) : undefined;
    if (material) ui.material.replaceChildren(card(material));
    else if (plan?.kind === 'forge') {
      const gem = el('span', 'anvil-gem');
      gem.append(rich(GEM_EMOJI));
      ui.material.replaceChildren(gem);
    } else ui.material.replaceChildren(el('span', 'anvil-empty'));
    ui.material.classList.toggle('filled', !!material || plan?.kind === 'forge');

    ui.rate.textContent = `${SUCCESS_RATE}%`;
    ui.bonus.textContent = `+${FAILURE_BONUS}%`;
    renderEffects(copy, plan);
    renderCost(plan);

    ui.go.textContent = plan?.kind === 'forge' ? 'Forge Masterwork' : 'Refine Gear';
    const have = balance();
    ui.go.disabled =
      busy ||
      !plan ||
      (plan.kind === 'refine'
        ? plan.refine.blocked !== null || plan.refine.cost === null || (have !== null && have < plan.refine.cost)
        : plan.kind === 'forge'
          ? !plan.forge || plan.forge.blocked !== null
          : true);
  }

  function render(): void {
    const me = currentMe();
    if (!me || !gear) return;
    ui.forge.hidden = false;
    ui.armoryTitle.textContent = `${me.user.name}'s Armory`;
    for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === filter));
    renderGrid();
    renderAnvil();
  }

  /** Puts `copy` on the anvil (the copy a refine would raise, for a spare), or takes it off again. */
  function pick(copy: GearCopy): void {
    const main = mainCopyOf(copy);
    const target = main ?? copy;
    done = null;
    if (picked === target.id && !main) {
      picked = null;
      swappedFrom = null;
    } else {
      picked = target.id;
      swappedFrom = main ? copy.id : null;
    }
    render();
    // One over the other on narrow screens: back up to the anvil to see it.
    if (picked && matchMedia('(max-width: 899px)').matches) ui.anvil.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** The target's frame flares after a refine or forge goes through. */
  function strike(): void {
    ui.target.classList.remove('struck');
    void ui.target.offsetWidth;
    ui.target.classList.add('struck');
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
              ? "You can't afford that."
              : ['no_duplicate', 'other_copy', 'maxed', 'too_low', 'already', 'no_bonus'].includes(res.error)
                ? 'That changed in the meantime. Take another look and try again.'
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

  /** Refines or forges the copy on the anvil. */
  async function strikeAnvil(): Promise<void> {
    const server = currentServer();
    const copy = copyById(picked);
    const plan = copy ? forgePlan(copy) : null;
    if (busy || !server || !copy || !plan || (plan.kind !== 'refine' && plan.kind !== 'forge')) return;
    const forging = plan.kind === 'forge';
    busy = true;
    renderAnvil();
    const res = await api<GearView>(forging ? '/api/gear/forge' : '/api/gear/refine', {
      method: 'POST',
      body: JSON.stringify({ guild: server, copy: copy.id }),
    });
    busy = false;
    // It cost zeiucoins or gems (or whatever the refusal was, the balance may be old): the header's balances follow.
    void loadMe(true);
    if (!res.ok) {
      renderAnvil();
      return failed(res, forging ? 'Could not forge that. Try again.' : 'Could not refine that. Try again.');
    }
    gear = res.data;
    swappedFrom = null;
    const after = copyById(copy.id);
    done = forging ? `${copy.name} is now a masterwork. ✨` : `${copy.name} is now R${after?.level ?? copy.level + 1}.`;
    status(null);
    render();
    strike();
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
    swappedFrom = null;
    done = null;
    void loadGear();
  });

  for (const tab of ui.tabs) {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter as Slot | 'all';
      render();
    });
  }

  ui.go.addEventListener('click', () => void strikeAnvil());

  // Escape takes the copy off the anvil.
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !picked) return;
    picked = null;
    swappedFrom = null;
    done = null;
    render();
  };
  // A resize that changes how many cards fit across refills the blanks.
  const onResize = (): void => {
    if (gridColumns && columns() !== gridColumns) renderGrid();
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    status('Loading…');
    const res = await loadMe();
    if (!res.ok) return failed(res, 'Could not load your servers.');
    if (!currentServer()) return status('None of your servers have Koma in them yet.');
    renderServers();
    await loadGear();
    // From the gear page's Upgrade: that copy on the anvil, and the link back to plain /forge/.
    const url = new URL(location.href);
    const wanted = copyById(url.searchParams.get('copy'));
    if (wanted) pick(wanted);
    if (url.searchParams.has('copy')) {
      url.searchParams.delete('copy');
      history.replaceState(history.state, '', url);
    }
  }

  return {
    drawn: start(),
    unmount() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      serverPicker.destroy();
    },
  };
}
