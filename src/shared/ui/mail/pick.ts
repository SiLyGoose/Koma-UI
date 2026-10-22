import type { MailHero, MailPickItem, MailTicketItem, MailTickets } from '../../../protocol/mail';

/*
 * The popup a unique weapon or unique treasure is picked in, as King's Raid's ticket has it: every item it can be on the
 * left (an icon and a name each, its hero's name under it, a search over them), the one picked on the right (its picture
 * and name, its hero, a new copy's main stat, its unique effect), and Confirm. The mailbox's tickets pick in it
 * (./mail.ts: a weapon or a treasure), and the Hero Item banner's guarantee (../../../banner/page.ts: either, each hero's
 * weapon then its treasures, a hero after another). Its look is mail.css's (on every page, with the mailbox).
 */

type Api = <T>(path: string, init?: RequestInit) => Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }>;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** The shared hero helpers (their faces, King's Raid's skill words): fetched with the popup's items, not with every page. */
type HeroHelpers = typeof import('../../heroes');

/** Every hero the popup can give an item of, and the hero helpers it draws them with. */
export interface UniqueSheet {
  heroes: MailHero[];
  helpers: HeroHelpers;
}

/** One of the popup's items: its hero, which of its unique treasures (UT1 to UT4; none for its weapon), and the item. */
export interface UniqueEntry {
  hero: MailHero;
  skill?: number;
  item: MailTicketItem;
}

/** The popup's items (the bot's GET /api/mail/tickets) and the hero helpers, for a server: asked for once each. */
const sheets = new Map<string, Promise<UniqueSheet | null>>();
export function loadUniqueSheet(api: Api, server: string): Promise<UniqueSheet | null> {
  let sheet = sheets.get(server);
  if (!sheet) {
    sheet = (async () => {
      const [res, helpers] = await Promise.all([api<MailTickets>(`/api/mail/tickets?guild=${encodeURIComponent(server)}`), import('../../heroes')]);
      if (!res.ok) {
        sheets.delete(server);
        return null;
      }
      return { heroes: res.data.heroes, helpers };
    })();
    sheets.set(server, sheet);
  }
  return sheet;
}

/** A sheet's items of a kind: unique weapons, unique treasures, or both, each hero's weapon then its four treasures. */
export function uniqueEntries(sheet: UniqueSheet, of: 'uw' | 'ut' | 'both'): UniqueEntry[] {
  return sheet.heroes.flatMap((hero) => [
    ...(of !== 'ut' && hero.weapon ? [{ hero, item: hero.weapon }] : []),
    ...(of !== 'uw' ? hero.treasures.map((item, i) => ({ hero, skill: i + 1, item })) : []),
  ]);
}

/** Where the item pictures are (../../built.ts): fetched when the popup first opens, not with every page. */
let pictures: Promise<typeof import('../../built')> | null = null;

/** An item's picture (a unique weapon's or treasure's), in a box of `className`; empty until the pictures' list is in. */
export function uniquePicture(item: MailPickItem, className: string, lazy = false): HTMLElement {
  const box = el('span', className);
  void (pictures ??= import('../../built')).then(({ built, hasItemArt }) => {
    const folder = hasItemArt('weapons', item.itemId) ? 'weapons' : hasItemArt('treasures', item.itemId) ? 'treasures' : null;
    if (!folder) return;
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    img.src = built(`/gear/items/${folder}/${item.itemId}.png`);
    box.append(img);
  });
  return box;
}

/** What the popup is for. */
export interface UniquePickOptions {
  title: string;
  /** Which popup of how many ("1 of 2"). */
  step?: string;
  /** Under the title, what picking does (the banner's guarantee). */
  note?: string;
  /** The one picked at first (none: the first; with `none`, a null `chosen` is it). */
  chosen?: UniqueEntry | null;
  /** A first row picking nothing ("None"), and what its side says: picking it resolves 'none'. */
  none?: { label: string; text: string };
}

/** The popup over the page: the item picked, 'none' (its None row), or null if it was closed. */
export function pickUnique(sheet: UniqueSheet, entries: readonly UniqueEntry[], options: UniquePickOptions): Promise<UniqueEntry | 'none' | null> {
  const { helpers } = sheet;
  const popup = el('dialog', 'mail-popup');
  popup.setAttribute('aria-label', options.title);
  const head = el('div', 'mail-popup-head');
  head.append(el('h3', 'mail-popup-title', options.title));
  if (options.step) head.append(el('span', 'mail-popup-step', options.step));
  const close = el('button', 'mail-popup-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  head.append(close);

  // The left: every item, a row each (a line between one hero's and the next's).
  const side = el('div', 'mail-popup-side');
  // (The armory's search field.)
  const search = el('input', 'armory-search mail-popup-search');
  search.type = 'search';
  search.autocomplete = 'off';
  search.placeholder = 'Search heroes or items';
  search.setAttribute('aria-label', 'Search heroes or items');
  const list = el('ul', 'mail-popup-list');
  side.append(search, list);
  // The right: the one picked.
  const detail = el('div', 'mail-popup-detail');
  const confirm = el('button', 'mail-popup-confirm action main', 'Confirm');
  confirm.type = 'button';

  type Row = UniqueEntry | 'none';
  let chosen: Row | undefined = options.chosen ?? (options.none && options.chosen === null ? 'none' : entries[0]);
  const rows = new Map<Row, HTMLButtonElement>();
  const show = (): void => {
    for (const [entry, row] of rows) {
      row.classList.toggle('on', entry === chosen);
      row.setAttribute('aria-pressed', String(entry === chosen));
    }
    confirm.disabled = !chosen;
    if (!chosen) return void detail.replaceChildren();
    if (chosen === 'none') {
      const top = el('div', 'mail-detail-top');
      top.append(el('span', 'mail-detail-pic mail-option-none', '?'), el('strong', 'mail-detail-name', options.none?.label ?? ''));
      detail.replaceChildren(top, el('p', 'mail-detail-effect', options.none?.text ?? ''), confirm);
      return;
    }
    const { item, hero: owner } = chosen;
    const top = el('div', 'mail-detail-top');
    top.append(uniquePicture(item, 'mail-detail-pic'), el('strong', 'mail-detail-name', item.name));
    const limit = el('div', 'mail-detail-limit');
    const face = el('span', 'mail-detail-face');
    void helpers.heroCut(owner.id, helpers.TAB_FACE, 96).then((src) => {
      if (!src) return;
      const img = el('img');
      img.alt = '';
      img.src = src;
      face.append(img);
    });
    limit.append(el('span', 'mail-detail-label', 'Class Limit'), face, el('span', 'mail-detail-hero', chosen.skill ? `${owner.name} · UT${chosen.skill}` : `${owner.name} · UW`));
    const body = el('div', 'mail-detail-body');
    if (item.main) {
      const main = el('div', 'mail-detail-main');
      main.append(el('span', '', item.main.name), el('span', '', `+${item.main.value.toLocaleString()}`));
      body.append(main);
    }
    if (item.effect) {
      const effect = el('p', 'mail-detail-effect');
      effect.append(...helpers.skillText(item.effect));
      body.append(el('h4', 'mail-detail-heading', 'Unique Option'), effect);
    }
    detail.replaceChildren(top, limit, body, confirm);
  };
  const add = (entry: Row, row: HTMLButtonElement, className = ''): void => {
    row.addEventListener('click', () => {
      chosen = entry;
      show();
    });
    rows.set(entry, row);
    const li = el('li', className);
    li.append(row);
    list.append(li);
  };
  if (options.none) {
    const row = el('button', 'mail-option');
    row.type = 'button';
    row.append(el('span', 'mail-option-pic mail-option-none', '?'), el('span', 'mail-option-words', options.none.label));
    add('none', row);
  }
  let lastHero: string | null = null;
  for (const entry of entries) {
    const row = el('button', 'mail-option');
    row.type = 'button';
    const words = el('span', 'mail-option-words');
    words.append(el('span', 'mail-option-name', entry.item.name), el('span', 'mail-option-hero', entry.skill ? `${entry.hero.name} · UT${entry.skill}` : `${entry.hero.name} · UW`));
    row.append(uniquePicture(entry.item, 'mail-option-pic', true), words);
    // (A hero's first item, after another hero's: a line over it.)
    add(entry, row, lastHero !== null && lastHero !== entry.hero.id ? 'mail-option-next-hero' : '');
    lastHero = entry.hero.id;
  }
  search.addEventListener('input', () => {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const [entry, row] of rows) {
      const li = row.parentElement;
      if (!li) continue;
      const text = entry === 'none' ? (options.none?.label ?? '') : `${entry.item.name} ${entry.hero.name} ${entry.skill ? `ut${entry.skill}` : 'uw'}`;
      li.hidden = words.length > 0 && !words.every((word) => text.toLowerCase().includes(word));
    }
  });
  show();

  const body = el('div', 'mail-popup-body');
  body.append(side, detail);
  popup.append(head);
  if (options.note) popup.append(el('p', 'mail-popup-note', options.note));
  popup.append(body);
  document.body.append(popup);
  popup.showModal();
  // (The one picked at first in sight, not the search: on a phone, focusing it would pull its keyboard up.)
  if (chosen) rows.get(chosen)?.scrollIntoView({ block: 'center' });
  // (Without scrolling the one picked's side down to it.)
  confirm.focus({ preventScroll: true });
  return new Promise((resolve) => {
    let picked: UniqueEntry | 'none' | null = null;
    close.addEventListener('click', () => popup.close());
    confirm.addEventListener('click', () => {
      if (!chosen) return;
      picked = chosen;
      popup.close();
    });
    popup.addEventListener('click', (event) => {
      if (event.target === popup) popup.close();
    });
    // (Closed any way, Escape too: cancelled, unless confirmed.)
    popup.addEventListener('close', () => {
      popup.remove();
      resolve(picked);
    });
  });
}
