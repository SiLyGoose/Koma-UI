import { el, itemFace, itemIcons, showDetail } from '../../shared/items';
import { points } from '../../shared/util';
import type { HeroesOpened, HeroesView, LootBoxStack, LootOpened } from '../../protocol/heroes';
import type { InventoryHost } from '../tab';
import { heroCopyDetail } from './gear';
import type { Revealed } from './reveal';
import { runeTile } from './runes';
import { type Tile, tileDetail, tileImage, tileSlot } from './tiles';

/*
 * King's Raid's Dispatch Battle Loot in the inventory's Others (./others.ts): what a won background raid gives (the bot's
 * data/loot-boxes.ts), claimed from its mail, a slot for each box they hold. Picked, Open 10 (fewer when they hold fewer) or Open
 * All opens them (the bot's POST /api/heroes/open-box, at most its lootOpenMost at once: Open All asks again for the rest), each
 * giving what a win at its stage gives; what they gave all told shows over the page as a craft's does (./reveal.ts).
 */

/** How many Open opens (Open All: all of them). */
export const OPEN_SOME = 10;

/** King's Raid's words for its loot (ITEM_DESC2). */
const KR_ABOUT = 'A reward obtained from Dispatch Battle.';

/** Where its win was: "Galgoria, stage 5", a dragon's "Temeraire, Hard 7". */
const whereOf = (box: LootBoxStack): string => (box.raid === 'dragon' ? `${box.bossName}, ${box.mode === 'normal' ? 'Normal' : 'Hard'} ${box.stage}` : `${box.bossName}, stage ${box.stage}`);

/** What it opens into: a win's rewards there, as the raid gives them. */
const givesOf = (box: LootBoxStack): string =>
  box.raid === 'dragon'
    ? 'pieces of its dragon’s set, runes, zeiucoins and its hero essences'
    : 'TechnoMagic gear of its boss’s set (now and then Reclaimed), runes, now and then an artifact, Boss Crystals, Upgrade Stones (from stage 7, of any class) and zeiucoins';

/** A box's slot: picked, its Open buttons (`controls`: made as its details show). */
export function lootTile(box: LootBoxStack, controls: () => Node): Tile {
  return {
    id: `loot-${box.id}`,
    name: box.name,
    picture: () => tileImage(`/kr/items/${box.icon}.webp`),
    full: true,
    grade: 4,
    count: box.count,
    kind: 'Dispatch Battle Loot',
    about: `${KR_ABOUT} From a background raid won against ${whereOf(box)} (its mail). Each opens into what a win there gives: ${givesOf(box)}. Hero gear your salvage rule takes is salvaged as it comes out.`,
    words: `loot box dispatch ${box.bossName} ${box.mode}`,
    controls,
  };
}

/** Open 10 and Open All for `box`, off while `busy`; `open` opens that many. */
export function lootButtons(box: LootBoxStack, busy: boolean, open: (count: number, button: HTMLButtonElement) => void): HTMLElement {
  const row = el('div', 'inv-loot-open');
  const some = Math.min(OPEN_SOME, box.count);
  for (const [label, count, kind] of [
    [`Open ${points(some)}`, some, 'secondary'],
    ['Open All', box.count, 'main'],
  ] as const) {
    const button = el('button', `action ${kind} inv-tile-action`, label);
    button.type = 'button';
    button.disabled = busy || count < 1;
    button.addEventListener('click', () => open(count, button));
    row.append(button);
  }
  return row;
}

/** Nothing opened yet, of `box`. */
const nothing = (box: string): LootOpened => ({ box, count: 0, points: 0, essences: {}, stones: {}, crystals: {}, runes: {}, copies: [], dust: 0 });

/** Adds what `more` gave to `into`. */
function merge(into: LootOpened, more: LootOpened): void {
  const add = (to: Record<string, number>, from: Record<string, number | undefined>): void => {
    for (const [key, n] of Object.entries(from)) to[key] = (to[key] ?? 0) + (n ?? 0);
  };
  into.count += more.count;
  into.points += more.points;
  into.dust += more.dust;
  add(into.essences, more.essences);
  add(into.stones, more.stones);
  add(into.crystals, more.crystals);
  add(into.runes, more.runes);
  into.copies.push(...more.copies);
}

/**
 * Opens `count` of `box` (`button` saying so meanwhile), at most the bot's lootOpenMost at a time: their heroes after and what the
 * boxes gave, all told; null when none was opened (said in the status line). One asking that fails part way keeps what was opened.
 */
export async function openLoot(host: InventoryHost, box: LootBoxStack, count: number, most: number, button: HTMLButtonElement): Promise<{ view: HeroesView; opened: LootOpened } | null> {
  const opened = nothing(box.id);
  let view: HeroesView | null = null;
  host.status(null);
  while (opened.count < count) {
    button.textContent = count > most ? `Opening… ${points(opened.count)}/${points(count)}` : 'Opening…';
    const ask = Math.min(most, count - opened.count);
    const res = await host.post<HeroesOpened>('/api/heroes/open-box', { box: box.id, count: ask });
    if (!res.ok) {
      if (opened.count === 0) {
        if (res.error === 'not_enough') host.status('You don’t have that many of them any more.', true);
        else host.failed(res, 'Could not open them. Try again.');
        return null;
      }
      host.status(`Opened ${points(opened.count)} of ${points(count)}: the rest couldn’t be. Try again.`, true);
      break;
    }
    const { opened: got, ...after } = res.data;
    view = after;
    merge(opened, got);
    // (Fewer than asked: one couldn't be opened, and the rest were given back.)
    if (got.count < ask) break;
  }
  return view ? { view, opened } : null;
}

/**
 * What the boxes gave, a tile each for the reveal: zeiucoins, komaDust, essences, Boss Crystals and Upgrade Stones as Others draws
 * them (`tileOf`: its tile by id, null when it has none), runes as the Runes tab does, and each piece of hero gear as the Hero Gear
 * tab's card.
 */
export function lootRevealed(view: HeroesView, opened: LootOpened, tileOf: (id: string) => Tile | null): Revealed[] {
  const slot = (id: string, count: number): Revealed[] => {
    const tile = count > 0 ? tileOf(id) : null;
    return tile ? [{ id, name: tile.name, face: () => tileSlot({ ...tile, count }), detail: (into, close) => tileDetail(into, tile, close) }] : [];
  };
  const copies = opened.copies.flatMap((id): Revealed[] => {
    const copy = view.copies.find((one) => one.id === id);
    if (!copy) return [];
    if (copy.icon) itemIcons.set(copy.itemId, copy.icon);
    return [
      {
        id: copy.id,
        name: copy.name,
        face: () => {
          const card = el('span', 'item');
          card.dataset.stars = String(copy.stars);
          card.append(...itemFace(copy));
          return card;
        },
        detail: (into, close) => {
          const { shown, parts } = heroCopyDetail(view, copy, close);
          showDetail(into, shown, parts);
        },
      },
    ];
  });
  const runes = Object.entries(opened.runes).flatMap(([id, count]): Revealed[] => {
    const rune = view.runes.find((one) => one.id === id);
    if (!rune) return [];
    const tile = runeTile(rune);
    return [{ id: `rune-${id}`, name: rune.name, face: () => tileSlot({ ...tile, count }), detail: (into, close) => tileDetail(into, tile, close) }];
  });
  return [
    ...slot('zeiucoins', opened.points),
    ...Object.entries(opened.essences).flatMap(([id, n]) => slot(id, n ?? 0)),
    ...Object.entries(opened.crystals).flatMap(([set, n]) => slot(`crystal-${set}`, n ?? 0)),
    ...Object.entries(opened.stones).flatMap(([cls, n]) => slot(`stone-${cls}`, n ?? 0)),
    ...slot('dust', opened.dust),
    ...runes,
    ...copies,
  ];
}
