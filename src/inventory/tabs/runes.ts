import { HERO_PART_NAME, type HeroesView, type HeroRuneStack } from '../../protocol/heroes';
import { RUNE_FRAGMENTS, RUNE_SELL_POINTS, type RunesSold } from '../../protocol/runes';
import { el, type Reward, rewardChips } from '../../shared/items';
import { fragmentIcon } from '../../shared/items/fragments';
import { type Busy, busyWith, dropdown, working } from '../../shared/ui';
import { points } from '../../shared/util';
import type { InventoryTab } from '../tab';
import { afterTyping, statName, type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Runes: every rune they have that isn't socketed (the bot's /api/heroes), best first (the dual-stat ones, King's
 * Raid's Velkazar runes, before any other: the top runes there are), a slot each (./tiles.ts): its picture filling it, framed in
 * its grade's colour, how many in its corner; picked, what it gives and the parts it goes in. Its Stats (the site's dropdown,
 * in the bar) shows only those with any of the stats picked. Sold as the gear tabs' items are (./gear.ts): Sell starts
 * picking, a rune pressed picks all of it (ticked; on wide screens its details, the last one picked's, say how many of it), Select shown and
 * By grade pick many, then Sell or Disassemble (for zeiucoins, or Rune Fragments: the bot's /api/runes/sell, half King's
 * Raid's, protocol/runes.ts) asks first, what it gives in pictures. The fragments are in Others, and the Craft tab makes
 * Mysterious Runes (a rune of their grade) from them. Socketing one is the Heroes page's (a piece's Runes).
 */

/** A rune's grades' names (the bot's data/kr-gear.ts RUNE_GRADE; its Ancient and Velkazar runes are both 5). */
const GRADE_NAME: Readonly<Record<number, string>> = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Heroic', 5: 'Ancient and Velkazar', 6: 'Legendary' };

/** Whether a rune gives two stats (a Velkazar rune's), not one. */
const dual = (rune: HeroRuneStack): boolean => rune.lines.length > 1;

/** The runes best first: the dual-stat ones, then the rest, each as the bot has them (by grade). */
const bestFirst = (runes: readonly HeroRuneStack[]): HeroRuneStack[] => [...runes.filter(dual), ...runes.filter((rune) => !dual(rune))];

/** What a sale gives, as pictures (a tile: its picture and how many; `small`, a chip): zeiucoins, or (disassembling) Rune Fragments. */
const gives = (amount: number, disassemble: boolean, small = false): HTMLElement =>
  rewardChips(disassemble ? { more: [{ picture: fragmentIcon('reward-icon'), count: amount, name: 'Rune Fragments' } satisfies Reward] } : { points: amount }, small);

/** Wide screens, where a rune picked to sell shows its details beside the slots (on narrow ones they'd be a sheet over the bar's Sell). */
const WIDE = '(min-width: 900px)';

/** −, how many, + and Max, for `count` of at most `max` (`set` takes the new one). */
function amountRow(count: number, max: number, off: boolean, set: (n: number) => void, label: string): HTMLElement {
  const row = el('div', 'inv-amount');
  const step = (text: string, about: string, to: number, disabled: boolean): HTMLButtonElement => {
    const button = el('button', 'action secondary inv-step', text);
    button.type = 'button';
    button.setAttribute('aria-label', about);
    button.disabled = off || disabled;
    button.addEventListener('click', () => set(to));
    return button;
  };
  const input = el('input', 'inv-amount-input');
  input.type = 'number';
  input.min = '1';
  input.max = String(Math.max(1, max));
  input.value = String(count);
  input.disabled = off;
  input.setAttribute('aria-label', label);
  input.addEventListener('change', () => {
    const n = Math.floor(Number(input.value));
    set(Number.isFinite(n) ? n : 1);
  });
  row.append(step('−', 'One fewer', count - 1, count <= 1), input, step('+', 'One more', count + 1, count >= max), step('Max', `All of them (${points(max)})`, max, count >= max));
  return row;
}

export const runesTab: InventoryTab = {
  id: 'runes',
  label: 'Runes',
  uses: ['heroes'],
  mount(root, host) {
    root.innerHTML = `
      <div class="inv-gear inv-tiles">
        <div class="inv-sheet">
          <div class="sheet-scroll"><div class="armory-grid"></div></div>
        </div>
        <div class="inv-bar">
          <input class="armory-search inv-search" type="search" placeholder="Search runes" aria-label="Search runes" autocomplete="off" />
          <select class="inv-stat-filter" multiple aria-label="Stats" data-none="All stats"></select>
          <p class="inv-count" aria-live="polite"></p>
          <div class="inv-sell">
            <button type="button" class="armory-action action secondary sell" data-sale="sell">Sell</button>
            <button type="button" class="armory-action action secondary sell on" data-sale="disassemble" hidden>Disassemble</button>
            <button type="button" class="armory-action action secondary" data-sale="cancel" hidden>Cancel</button>
          </div>
          <div class="sell-tools inv-sell-tools" hidden>
            <button type="button" class="armory-action action secondary" data-sale="shown">Select shown</button>
            <button type="button" class="armory-action action secondary" data-sale="grade">By grade</button>
          </div>
        </div>
        <div class="detail" role="dialog" aria-label="Rune" hidden></div>
        <dialog class="sell-confirm inv-rune-confirm" aria-label="Sell runes">
          <h3></h3>
          <p class="sell-confirm-total"></p>
          <p class="sell-confirm-note"></p>
          <div class="sell-confirm-foot">
            <button type="button" class="action secondary" data-sell="cancel">Cancel</button>
            <button type="button" class="action main" data-sell="confirm"></button>
          </div>
        </dialog>
        <dialog class="sell-confirm inv-rune-dialog inv-rune-batch" aria-label="Pick by grade">
          <h3>Pick by grade</h3>
          <div class="inv-rune-grades armory-filter-options"></div>
          <p class="inv-rune-sum"></p>
          <p class="sell-confirm-note">Picks every rune of the grades ticked that the search and Stats show, with those picked already.</p>
          <div class="sell-confirm-foot">
            <button type="button" class="action secondary" data-batch="cancel">Cancel</button>
            <button type="button" class="action main" data-batch="pick"></button>
          </div>
        </dialog>
      </div>`;
    const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
    const search = $<HTMLInputElement>('.armory-search');
    const count = $('.inv-count');
    const detail = $('.detail');
    const saleButton = (name: string): HTMLButtonElement => $<HTMLButtonElement>(`[data-sale="${name}"]`);
    const sellButton = saleButton('sell');
    const breakButton = saleButton('disassemble');
    const cancelButton = saleButton('cancel');
    const shownButton = saleButton('shown');
    const gradeButton = saleButton('grade');
    const tools = $('.inv-sell-tools');
    const confirm = $<HTMLDialogElement>('.inv-rune-confirm');
    const batch = $<HTMLDialogElement>('.inv-rune-batch');
    let runes: HeroRuneStack[] = [];
    /** Picking runes to sell: how many of each (null when not); and the one picked last, whose details show. */
    let selling: Map<string, number> | null = null;
    let last: string | null = null;
    let busy: Busy | null = null;
    /** Whether the confirm dialog's sale disassembles. */
    let disassembling = false;

    const grid = tileGrid(
      $('.inv-gear'),
      $('.sheet-scroll'),
      $('.armory-grid'),
      detail,
      'No runes yet. The TechnoMagic Raid and the Dragon Raid drop them, and the Craft tab makes them from Rune Fragments.',
      (tile) => {
        // Picking what to sell: all of a rune picked (its details shown, on wide screens) or let go (the one picked before it shown).
        if (!selling) return false;
        if (selling.delete(tile.id)) {
          if (last === tile.id) last = [...selling.keys()].at(-1) ?? null;
        } else {
          selling.set(tile.id, tile.count ?? 1);
          last = tile.id;
        }
        draw();
        grid.pick(matchMedia(WIDE).matches ? last : null);
        return true;
      },
    );
    const stats = $<HTMLSelectElement>('.inv-stat-filter');
    stats.id = 'inv-rune-stats';
    const statPicker = dropdown(stats);

    /** The runes the Stats leaves (any of those picked; none picked: all), as the search finds them too. */
    function shownRunes(): HeroRuneStack[] {
      const picked = [...stats.selectedOptions].map((one) => one.value);
      const kept = picked.length === 0 ? runes : runes.filter((rune) => rune.lines.some((line) => picked.includes(statName(line))));
      const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return kept.filter((rune) => words.every((word) => `${rune.name} ${rune.lines.join(' ')} ${rune.parts.map((part) => HERO_PART_NAME[part]).join(' ')}`.toLowerCase().includes(word)));
    }

    /** What's picked to sell: how many of each rune, how many all told, and what they sell for or disassemble into. */
    function sale(): { picked: Record<string, number>; n: number; points: number; fragments: number } {
      const picked: Record<string, number> = {};
      let n = 0;
      let paid = 0;
      let broken = 0;
      for (const [id, k] of selling ?? []) {
        const rune = runes.find((one) => one.id === id);
        if (!rune || k < 1) continue;
        picked[id] = k;
        n += k;
        paid += (RUNE_SELL_POINTS[rune.grade] ?? 0) * k;
        broken += (RUNE_FRAGMENTS[rune.grade] ?? 0) * k;
      }
      return { picked, n, points: paid, fragments: broken };
    }

    /** A rune picked to sell, in its details: how many of it go (all of it, as picked). */
    function sellingControls(rune: HeroRuneStack): HTMLElement {
      const box = el('div', 'inv-rune-sale');
      const n = selling?.get(rune.id) ?? rune.count;
      const set = (to: number): void => {
        selling?.set(rune.id, Math.max(1, Math.min(to, rune.count)));
        draw();
      };
      box.append(el('p', 'detail-label', `Selling ${points(n)} of ${points(rune.count)}`), amountRow(n, rune.count, busy !== null, set, `How many ${rune.name} to sell`));
      return box;
    }

    /** A rune's slot (picked to sell: ticked, with how many of it in its corner). */
    function tile(rune: HeroRuneStack): Tile {
      const parts = rune.parts.map((part) => HERO_PART_NAME[part]).join(', ');
      const picked = selling?.get(rune.id);
      return {
        id: rune.id,
        name: rune.name,
        picture: () => tileImage(`/kr/items/${rune.icon}.webp`),
        full: true,
        grade: rune.grade,
        count: rune.count,
        kind: 'Rune',
        about: `Goes in ${parts}. Socket it on the Heroes page. Sells for ${points(RUNE_SELL_POINTS[rune.grade] ?? 0)} zeiucoins, disassembles into ${points(RUNE_FRAGMENTS[rune.grade] ?? 0)} Rune Fragments.`,
        lines: rune.lines,
        words: `${rune.lines.join(' ')} ${parts}`,
        ...(picked !== undefined && { selling: picked, controls: () => sellingControls(rune) }),
      };
    }

    /**
     * How many runes; Sell (to start picking, then with some picked "Sell 5"), Disassemble and Cancel while picking (as the
     * gear tabs' Sell, Salvage and Cancel), and Select shown and By grade under them.
     */
    function drawBar(): void {
      const shown = shownRunes();
      const total = runes.reduce((sum, rune) => sum + rune.count, 0);
      const of = shown.reduce((sum, rune) => sum + rune.count, 0);
      count.textContent = total === 0 ? '' : `${of !== total ? `${of.toLocaleString()} of ` : ''}${total.toLocaleString()} rune${total === 1 ? '' : 's'} not socketed`;
      const { n } = sale();
      sellButton.textContent = !selling ? 'Sell' : n > 0 ? `Sell ${points(n)}` : 'Select runes';
      sellButton.disabled = selling ? n === 0 : total === 0;
      sellButton.classList.toggle('on', selling !== null);
      working(sellButton, busy, 'sell');
      breakButton.hidden = cancelButton.hidden = tools.hidden = selling === null;
      breakButton.textContent = n > 0 ? `Disassemble ${points(n)}` : 'Disassemble';
      breakButton.disabled = n === 0;
      working(breakButton, busy, 'disassemble');
      const all = shown.length > 0 && shown.every((rune) => selling?.get(rune.id) === rune.count);
      shownButton.textContent = all ? 'Unselect shown' : 'Select shown';
      shownButton.disabled = shown.length === 0 || busy !== null;
      gradeButton.disabled = shown.length === 0 || busy !== null;
    }

    /** The runes the Stats leaves, drawn by the search. */
    function draw(): void {
      const picked = [...stats.selectedOptions].map((one) => one.value);
      const shown = picked.length === 0 ? runes : runes.filter((rune) => rune.lines.some((line) => picked.includes(statName(line))));
      grid.draw(shown.map(tile), search.value.trim().toLowerCase());
      drawBar();
      if (batch.open) drawBatch();
    }
    const searched = afterTyping(draw);
    search.addEventListener('input', () => searched());
    stats.addEventListener('change', draw);

    /** Takes the heroes' answer (theirs after a change): their runes (those picked to sell, as many as are left). */
    function take(view: HeroesView): void {
      runes = bestFirst(view.runes);
      for (const [id, n] of selling ?? []) {
        const left = runes.find((rune) => rune.id === id)?.count ?? 0;
        if (left === 0) selling?.delete(id);
        else selling?.set(id, Math.min(n, left));
      }
      if (last && !selling?.has(last)) last = null;
    }

    /** Starts or stops picking runes to sell (the details closed). */
    function pickToSell(on: boolean): void {
      selling = on ? new Map() : null;
      last = null;
      grid.pick(null);
      draw();
    }

    /** Asks (in the confirm dialog) to sell or disassemble what's picked: how many, and what it gives in pictures. */
    function ask(disassemble: boolean): void {
      const { n, points: paid, fragments: broken } = sale();
      if (busy || n === 0) return;
      disassembling = disassemble;
      const verb = disassemble ? 'Disassemble' : 'Sell';
      (confirm.querySelector('h3') as HTMLElement).textContent = `${verb} ${points(n)} rune${n === 1 ? '' : 's'}?`;
      (confirm.querySelector('.sell-confirm-total') as HTMLElement).replaceChildren(gives(disassemble ? broken : paid, disassemble));
      (confirm.querySelector('.sell-confirm-note') as HTMLElement).textContent = `${disassemble ? 'Disassembled' : 'Sold'} runes are gone for good.`;
      (confirm.querySelector('[data-sell="confirm"]') as HTMLElement).textContent = verb;
      confirm.showModal();
    }
    confirm.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sell]');
      if (!button && event.target !== confirm) return;
      confirm.close();
      if (button?.dataset.sell === 'confirm') void sell(disassembling);
    });

    /** Sells (or disassembles) what's picked, and says what it came to. */
    async function sell(disassemble: boolean): Promise<void> {
      const { picked, n } = sale();
      if (busy || n === 0) return;
      busy = busyWith(disassemble ? 'disassemble' : 'sell');
      host.status(null);
      draw();
      const res = await host.post<RunesSold>('/api/runes/sell', { runes: picked, ...(disassemble && { disassemble }) });
      busy = null;
      if (!disassemble) host.refreshBalance();
      if (!res.ok) {
        if (res.error === 'nothing_to_sell' || res.error === 'busy') await load(true);
        else draw();
        return res.error === 'nothing_to_sell' ? void host.status('You don’t have those runes any more.', true) : host.failed(res, `Could not ${disassemble ? 'disassemble' : 'sell'} those runes. Try again.`);
      }
      const { runeSale, ...view } = res.data;
      host.keep('heroes', view);
      take(view);
      pickToSell(false);
      const said = host.status('');
      said.append(`${disassemble ? 'Disassembled' : 'Sold'} ${points(runeSale.runes)} rune${runeSale.runes === 1 ? '' : 's'} ${disassemble ? 'into' : 'for'} `, gives(disassemble ? runeSale.fragments : runeSale.points, disassemble, true));
    }

    // Sell: to start picking runes, then (with some picked) to confirm the sale; Disassemble, what's picked for fragments; Cancel stops picking.
    sellButton.addEventListener('click', () => (selling ? ask(false) : pickToSell(true)));
    breakButton.addEventListener('click', () => ask(true));
    cancelButton.addEventListener('click', () => pickToSell(false));
    // Select shown: all of every rune the search and Stats show (all of them picked already: let go).
    shownButton.addEventListener('click', () => {
      if (!selling) return;
      const shown = shownRunes();
      if (shown.every((rune) => selling?.get(rune.id) === rune.count)) for (const rune of shown) selling.delete(rune.id);
      else for (const rune of shown) selling.set(rune.id, rune.count);
      if (last && !selling.has(last)) last = null;
      draw();
      grid.pick(matchMedia(WIDE).matches ? last : null);
    });
    // Escape stops picking runes to sell (a rune's details, or a dialog, close first by themselves).
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && selling && detail.hidden && !(e.target instanceof HTMLInputElement) && !confirm.open && !batch.open) pickToSell(false);
    };
    document.addEventListener('keydown', onKey, true);

    // By grade: a box for each grade of the runes shown, how many; Pick adds all of them to those picked.
    const grades = batch.querySelector('.inv-rune-grades') as HTMLElement;
    const batchSum = batch.querySelector('.inv-rune-sum') as HTMLElement;
    const batchPick = batch.querySelector('[data-batch="pick"]') as HTMLButtonElement;
    const pickedGrades = new Set<number>();
    /** The runes By grade picks: those shown of the grades ticked. */
    const gradePicks = (): HeroRuneStack[] => shownRunes().filter((rune) => pickedGrades.has(rune.grade));
    function drawBatch(): void {
      const shown = shownRunes();
      const have = [1, 2, 3, 4, 5, 6].map((grade) => [grade, shown.filter((rune) => rune.grade === grade).reduce((sum, rune) => sum + rune.count, 0)] as const);
      for (const [grade, n] of have) if (n === 0) pickedGrades.delete(grade);
      grades.replaceChildren(
        ...have.flatMap(([grade, n]) => {
          if (n === 0) return [];
          const row = el('label', 'armory-filter-option');
          row.dataset.grade = String(grade);
          const input = el('input');
          input.type = 'checkbox';
          input.checked = pickedGrades.has(grade);
          input.addEventListener('change', () => {
            if (input.checked) pickedGrades.add(grade);
            else pickedGrades.delete(grade);
            drawBatch();
          });
          row.append(input, el('span', 'armory-filter-mark'), `${GRADE_NAME[grade]} (${points(n)})`);
          return [row];
        }),
      );
      const n = gradePicks().reduce((sum, rune) => sum + rune.count, 0);
      batchSum.textContent = n === 0 ? 'Tick a grade.' : `${points(n)} rune${n === 1 ? '' : 's'} match`;
      batchPick.textContent = n > 0 ? `Pick ${points(n)}` : 'Pick';
      batchPick.disabled = n === 0;
    }
    gradeButton.addEventListener('click', () => {
      pickedGrades.clear();
      drawBatch();
      batch.showModal();
    });
    batch.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-batch]');
      if (!button && event.target !== batch) return;
      if (button?.disabled) return;
      batch.close();
      if (button?.dataset.batch !== 'pick' || !selling) return;
      for (const rune of gradePicks()) selling.set(rune.id, rune.count);
      draw();
    });

    async function load(fresh = false): Promise<void> {
      const res = await host.load('heroes', fresh);
      if (!res.ok) return host.failed(res, 'Could not load your runes.');
      take(res.data);
      // Every stat their runes give, A to Z (those picked kept).
      const before = new Set([...stats.selectedOptions].map((one) => one.value));
      const names = [...new Set(runes.flatMap((rune) => rune.lines.map(statName)))].sort((a, b) => a.localeCompare(b));
      stats.replaceChildren(
        ...names.map((name) => {
          const one = document.createElement('option');
          one.value = name;
          one.textContent = name;
          one.selected = before.has(name);
          return one;
        }),
      );
      stats.hidden = names.length === 0;
      statPicker.refresh();
      draw();
    }
    grid.draw([]);
    drawBar();
    return {
      drawn: load(),
      unmount: () => {
        document.removeEventListener('keydown', onKey, true);
        searched.cancel();
        statPicker.destroy();
        grid.destroy();
      },
    };
  },
};
