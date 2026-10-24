import { HERO_PART_NAME, type HeroesView, type HeroRuneStack } from '../../protocol/heroes';
import { RUNE_BOXES, RUNE_FRAGMENTS, RUNE_SELL_POINTS, RUNES_AT_ONCE, type RuneBox, type RunesCrafted, type RunesSold } from '../../protocol/runes';
import { el, type Reward, rewardChips } from '../../shared/items';
import { fragmentIcon } from '../../shared/items/fragments';
import { type Busy, busyWith, dropdown, working } from '../../shared/ui';
import { coin, points } from '../../shared/util';
import type { InventoryHost, InventoryTab } from '../tab';
import { afterTyping, statName, type Tile, tileGrid, tileImage } from './tiles';

/*
 * The inventory's Runes: every rune they have that isn't socketed (the bot's /api/heroes), best first (the dual-stat ones, King's
 * Raid's Velkazar runes, before any other: the top runes there are), a slot each (./tiles.ts): its picture filling it, framed in
 * its grade's colour, how many in its corner; picked, what it gives and the parts it goes in, and how many of it to sell for
 * zeiucoins or disassemble into Rune Fragments (the bot's /api/runes/sell: half King's Raid's, protocol/runes.ts). Its Stats
 * (the site's dropdown, in the bar) shows only those with any of the stats picked. By grade sells or disassembles every rune
 * shown of the grades picked; Craft makes Mysterious Runes (a rune of their grade) from the fragments. Socketing one is the
 * Heroes page's (a piece's Runes).
 */

/** A rune's grades' names (the bot's data/kr-gear.ts RUNE_GRADE; its Ancient and Velkazar runes are both 5). */
const GRADE_NAME: Readonly<Record<number, string>> = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Heroic', 5: 'Ancient and Velkazar', 6: 'Legendary' };

/** Whether a rune gives two stats (a Velkazar rune's), not one. */
const dual = (rune: HeroRuneStack): boolean => rune.lines.length > 1;

/** The runes best first: the dual-stat ones, then the rest, each as the bot has them (by grade). */
const bestFirst = (runes: readonly HeroRuneStack[]): HeroRuneStack[] => [...runes.filter(dual), ...runes.filter((rune) => !dual(rune))];

/** What `count` of a rune of `grade` sell for, or disassemble into. */
const sellsFor = (grade: number, count: number): number => (RUNE_SELL_POINTS[grade] ?? 0) * count;
const breaksInto = (grade: number, count: number): number => (RUNE_FRAGMENTS[grade] ?? 0) * count;

/** An amount and its money: "1,950 (coin)" or "150 (fragment)". */
const worth = (amount: number, disassemble: boolean): (Node | string)[] => [`${points(amount)} `, disassemble ? fragmentIcon() : coin('coin', 'zeiucoins')];

/** What a sale gives, as pictures (a chip: its picture and how many): zeiucoins, or (disassembling) Rune Fragments. */
const gives = (amount: number, disassemble: boolean, small = false): HTMLElement =>
  rewardChips(disassemble ? { more: [{ picture: fragmentIcon('reward-icon'), count: amount, name: 'Rune Fragments' } satisfies Reward] } : { points: amount }, small);

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
          <p class="inv-frags" title="Rune Fragments: disassembling runes gives them, Craft makes runes from them"></p>
          <div class="inv-sell">
            <button type="button" class="action secondary armory-action" data-runes="batch">By grade</button>
            <button type="button" class="action main armory-action" data-runes="craft">Craft</button>
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
        <dialog class="sell-confirm inv-rune-dialog inv-rune-batch" aria-label="Sell or disassemble by grade">
          <h3>Sell or disassemble by grade</h3>
          <div class="inv-rune-grades armory-filter-options"></div>
          <p class="inv-rune-sum"></p>
          <p class="sell-confirm-note">Of the runes the search and Stats show. Sold and disassembled runes are gone for good.</p>
          <div class="sell-confirm-foot">
            <button type="button" class="action secondary" data-batch="cancel">Cancel</button>
            <button type="button" class="action secondary" data-batch="sell"></button>
            <button type="button" class="action main" data-batch="disassemble"></button>
          </div>
        </dialog>
        <dialog class="sell-confirm inv-rune-dialog inv-rune-craft" aria-label="Craft runes">
          <h3>Craft runes</h3>
          <p class="inv-rune-have"></p>
          <div class="inv-rune-boxes" role="radiogroup" aria-label="What to craft"></div>
          <div class="inv-rune-amount"></div>
          <p class="inv-rune-sum"></p>
          <div class="sell-confirm-foot">
            <button type="button" class="action secondary" data-craft="close">Close</button>
            <button type="button" class="action main" data-craft="go"></button>
          </div>
        </dialog>
      </div>`;
    const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
    const search = $<HTMLInputElement>('.armory-search');
    const count = $('.inv-count');
    const frags = $('.inv-frags');
    const batchButton = $<HTMLButtonElement>('[data-runes="batch"]');
    const craftButton = $<HTMLButtonElement>('[data-runes="craft"]');
    const confirm = $<HTMLDialogElement>('.inv-rune-confirm');
    const batch = $<HTMLDialogElement>('.inv-rune-batch');
    const craft = $<HTMLDialogElement>('.inv-rune-craft');
    const grid = tileGrid(
      $('.inv-gear'),
      $('.sheet-scroll'),
      $('.armory-grid'),
      $('.detail'),
      'No runes yet. The TechnoMagic Raid and the Dragon Raid drop them, and Craft makes them from Rune Fragments.',
    );
    const stats = $<HTMLSelectElement>('.inv-stat-filter');
    stats.id = 'inv-rune-stats';
    const statPicker = dropdown(stats);
    let runes: HeroRuneStack[] = [];
    /** Their Rune Fragments (null: not known yet). */
    let fragments: number | null = null;
    /** How many of each rune its details would sell or disassemble. */
    const amounts = new Map<string, number>();
    let busy: Busy | null = null;
    /** What the confirm dialog's button does. */
    let confirmed: (() => void) | null = null;

    /** The runes the Stats leaves (any of those picked; none picked: all), as the search finds them too. */
    function shownRunes(): HeroRuneStack[] {
      const picked = [...stats.selectedOptions].map((one) => one.value);
      const kept = picked.length === 0 ? runes : runes.filter((rune) => rune.lines.some((line) => picked.includes(statName(line))));
      const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return kept.filter((rune) => words.every((word) => `${rune.name} ${rune.lines.join(' ')} ${rune.parts.map((part) => HERO_PART_NAME[part]).join(' ')}`.toLowerCase().includes(word)));
    }

    /** A rune's details' sale: how many, then Sell and Disassemble (each asked first). */
    function saleControls(rune: HeroRuneStack): HTMLElement {
      const box = el('div', 'inv-rune-sale');
      const n = Math.max(1, Math.min(amounts.get(rune.id) ?? 1, rune.count));
      const set = (to: number): void => {
        amounts.set(rune.id, Math.max(1, Math.min(to, rune.count)));
        draw();
      };
      const sell = el('button', 'action secondary inv-rune-go');
      sell.type = 'button';
      sell.append(`Sell ${points(n)}`);
      working(sell, busy, `sell:${rune.id}`);
      sell.addEventListener('click', () => ask({ [rune.id]: n }, n, sellsFor(rune.grade, n), false, `sell:${rune.id}`));
      const breakUp = el('button', 'action main inv-rune-go');
      breakUp.type = 'button';
      breakUp.append(`Disassemble ${points(n)}`);
      working(breakUp, busy, `disassemble:${rune.id}`);
      breakUp.addEventListener('click', () => ask({ [rune.id]: n }, n, breaksInto(rune.grade, n), true, `disassemble:${rune.id}`));
      const buttons = el('div', 'inv-rune-buttons');
      buttons.append(sell, breakUp);
      box.append(el('p', 'detail-label', 'Sell or disassemble'), amountRow(n, rune.count, busy !== null, set, `How many ${rune.name}`), buttons);
      return box;
    }

    /** A rune's slot. */
    function tile(rune: HeroRuneStack): Tile {
      const parts = rune.parts.map((part) => HERO_PART_NAME[part]).join(', ');
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
        controls: () => saleControls(rune),
      };
    }

    function drawBar(): void {
      const shown = shownRunes();
      const total = runes.reduce((sum, rune) => sum + rune.count, 0);
      const of = shown.reduce((sum, rune) => sum + rune.count, 0);
      count.textContent = total === 0 ? '' : `${of !== total ? `${of.toLocaleString()} of ` : ''}${total.toLocaleString()} rune${total === 1 ? '' : 's'} not socketed`;
      frags.textContent = '';
      frags.append(fragmentIcon(), fragments === null ? '…' : points(fragments));
      batchButton.disabled = of === 0;
      working(craftButton, busy, 'craft');
    }

    /** The runes the Stats leaves, drawn by the search. */
    function draw(): void {
      const picked = [...stats.selectedOptions].map((one) => one.value);
      const shown = picked.length === 0 ? runes : runes.filter((rune) => rune.lines.some((line) => picked.includes(statName(line))));
      grid.draw(shown.map(tile), search.value.trim().toLowerCase());
      drawBar();
      if (batch.open) drawBatch();
      if (craft.open) drawCraft();
    }
    const searched = afterTyping(draw);
    search.addEventListener('input', () => searched());
    stats.addEventListener('change', draw);

    /** Takes the heroes' answer (theirs after a change): their runes and fragments. */
    function take(view: HeroesView): void {
      runes = bestFirst(view.runes);
      fragments = view.runeFragments ?? 0;
      for (const [id, n] of amounts) {
        const left = runes.find((rune) => rune.id === id)?.count ?? 0;
        if (left === 0) amounts.delete(id);
        else amounts.set(id, Math.min(n, left));
      }
    }

    /** Asks to sell (or disassemble) `picked` (how many of each), `n` runes for `amount`, then does. */
    function ask(picked: Record<string, number>, n: number, amount: number, disassemble: boolean, key: string): void {
      if (busy) return;
      const verb = disassemble ? 'Disassemble' : 'Sell';
      (confirm.querySelector('h3') as HTMLElement).textContent = `${verb} ${points(n)} rune${n === 1 ? '' : 's'}?`;
      const total = confirm.querySelector('.sell-confirm-total') as HTMLElement;
      total.replaceChildren(gives(amount, disassemble));
      (confirm.querySelector('.sell-confirm-note') as HTMLElement).textContent = `${disassemble ? 'Disassembled' : 'Sold'} runes are gone for good.`;
      (confirm.querySelector('[data-sell="confirm"]') as HTMLElement).textContent = verb;
      confirmed = () => void sell(picked, disassemble, key);
      confirm.showModal();
    }
    confirm.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sell]');
      if (!button && event.target !== confirm) return;
      confirm.close();
      const then = confirmed;
      confirmed = null;
      if (button?.dataset.sell === 'confirm') then?.();
    });

    async function sell(picked: Record<string, number>, disassemble: boolean, key: string): Promise<void> {
      if (busy) return;
      busy = busyWith(key);
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
      draw();
      const said = host.status(null);
      said.hidden = false;
      said.append(`${disassemble ? 'Disassembled' : 'Sold'} ${points(runeSale.runes)} rune${runeSale.runes === 1 ? '' : 's'} ${disassemble ? 'into' : 'for'} `, gives(disassemble ? runeSale.fragments : runeSale.points, disassemble, true));
    }

    // By grade: a box for each grade they have runes of (shown), how many, what they'd come to.
    const grades = batch.querySelector('.inv-rune-grades') as HTMLElement;
    const batchSum = batch.querySelector('.inv-rune-sum') as HTMLElement;
    const batchSell = batch.querySelector('[data-batch="sell"]') as HTMLButtonElement;
    const batchBreak = batch.querySelector('[data-batch="disassemble"]') as HTMLButtonElement;
    const pickedGrades = new Set<number>();
    /** The runes By grade takes: those shown of the grades picked, how many of each, and what they come to. */
    function batchPicks(): { picked: Record<string, number>; n: number; points: number; fragments: number } {
      const picked: Record<string, number> = {};
      let n = 0;
      let paid = 0;
      let broken = 0;
      for (const rune of shownRunes()) {
        if (!pickedGrades.has(rune.grade)) continue;
        picked[rune.id] = rune.count;
        n += rune.count;
        paid += sellsFor(rune.grade, rune.count);
        broken += breaksInto(rune.grade, rune.count);
      }
      return { picked, n, points: paid, fragments: broken };
    }
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
      const picks = batchPicks();
      batchSum.replaceChildren(picks.n === 0 ? 'Pick a grade.' : `${points(picks.n)} rune${picks.n === 1 ? '' : 's'}`);
      batchSell.textContent = picks.n > 0 ? `Sell ${points(picks.n)}` : 'Sell';
      batchBreak.textContent = picks.n > 0 ? `Disassemble ${points(picks.n)}` : 'Disassemble';
      batchSell.disabled = batchBreak.disabled = picks.n === 0 || busy !== null;
    }
    batchButton.addEventListener('click', () => {
      pickedGrades.clear();
      drawBatch();
      batch.showModal();
    });
    batch.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-batch]');
      if (!button && event.target !== batch) return;
      if (button?.disabled) return;
      batch.close();
      const picks = batchPicks();
      if (!button || button.dataset.batch === 'cancel' || picks.n === 0) return;
      const disassemble = button.dataset.batch === 'disassemble';
      // (Asked first, as any sale: what it gives, in pictures.)
      ask(picks.picked, picks.n, disassemble ? picks.fragments : picks.points, disassemble, disassemble ? 'disassemble:batch' : 'sell:batch');
    });

    // Craft: a Mysterious Rune picked, how many, and what they take.
    const boxes = craft.querySelector('.inv-rune-boxes') as HTMLElement;
    const craftHave = craft.querySelector('.inv-rune-have') as HTMLElement;
    const craftAmount = craft.querySelector('.inv-rune-amount') as HTMLElement;
    const craftSum = craft.querySelector('.inv-rune-sum') as HTMLElement;
    const craftGo = craft.querySelector('[data-craft="go"]') as HTMLButtonElement;
    let box: RuneBox = RUNE_BOXES[0] as RuneBox;
    let making = 1;
    /** The most of `of` their fragments make (at most what the bot makes at once). */
    const most = (of: RuneBox): number => Math.min(RUNES_AT_ONCE, Math.floor((fragments ?? 0) / of.fragments));
    function drawCraft(): void {
      craftHave.replaceChildren('You have ', fragmentIcon(), ` ${fragments === null ? '…' : points(fragments)} Rune Fragments`);
      boxes.replaceChildren(
        ...RUNE_BOXES.map((one) => {
          const row = el('button', 'inv-rune-box');
          row.type = 'button';
          row.setAttribute('role', 'radio');
          row.setAttribute('aria-checked', String(one === box));
          row.dataset.grade = String(one.grade);
          const pic = el('span', 'inv-rune-box-pic');
          pic.append(tileImage(`/kr/items/${one.icon}.webp`));
          const words = el('span', 'inv-rune-box-words');
          const cost = el('span', 'inv-rune-box-cost');
          cost.append(...worth(one.fragments, true), ' each');
          words.append(el('span', 'inv-rune-box-name', one.name), el('span', 'inv-rune-box-about', `${/^[AEIOU]/.test(GRADE_NAME[one.grade] ?? '') || one.id === 'ancient' ? 'An' : 'A'} ${one.id === 'ancient' ? 'Ancient' : GRADE_NAME[one.grade]} rune, any as likely`), cost);
          row.append(pic, words);
          row.addEventListener('click', () => {
            box = one;
            making = 1;
            drawCraft();
          });
          return row;
        }),
      );
      const max = most(box);
      making = Math.max(1, Math.min(making, Math.max(1, max)));
      craftAmount.replaceChildren(
        amountRow(making, max, max === 0 || busy !== null, (n) => {
          making = Math.max(1, Math.min(n, Math.max(1, max)));
          drawCraft();
        }, 'How many to craft'),
      );
      craftSum.replaceChildren(...(max === 0 ? [`Not enough Rune Fragments: one takes ${points(box.fragments)}. Disassemble runes for them.`] : ['Uses ', ...worth(making * box.fragments, true), ` for ${points(making)}`]));
      craftGo.textContent = max === 0 ? 'Craft' : `Craft ${points(making)}`;
      craftGo.disabled = max === 0;
      working(craftGo, busy, 'craft');
    }
    craftButton.addEventListener('click', () => {
      making = 1;
      drawCraft();
      craft.showModal();
    });
    craft.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-craft]');
      if (!button && event.target !== craft) return;
      if (!button || button.dataset.craft === 'close') return craft.close();
      if (button.dataset.craft === 'go' && !button.disabled) void make(box, making);
    });

    async function make(of: RuneBox, n: number): Promise<void> {
      if (busy || n < 1 || n > most(of)) return;
      busy = busyWith('craft');
      host.status(null);
      drawCraft();
      drawBar();
      const res = await host.post<RunesCrafted>('/api/runes/craft', { box: of.id, count: n });
      busy = null;
      if (!res.ok) {
        if (res.error === 'no_fragments' || res.error === 'busy') await load(true);
        else draw();
        return res.error === 'no_fragments' ? void host.status('You don’t have that many Rune Fragments any more.', true) : host.failed(res, 'Could not craft those runes. Try again.');
      }
      const { crafted, ...view } = res.data;
      host.keep('heroes', view);
      take(view);
      making = 1;
      draw();
      craft.close();
      // What each gave, by name (the same one more than once: how many).
      const got = new Map<string, number>();
      for (const id of crafted) {
        const name = runes.find((rune) => rune.id === id)?.name ?? id;
        got.set(name, (got.get(name) ?? 0) + 1);
      }
      host.status(`Crafted ${points(n)} ${of.name}: ${[...got].map(([name, k]) => (k > 1 ? `${name} ×${k}` : name)).join(', ')}.`);
    }

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
        searched.cancel();
        statPicker.destroy();
        grid.destroy();
      },
    };
  },
};
