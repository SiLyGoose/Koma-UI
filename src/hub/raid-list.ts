import { closeButton } from '../shared/ui/close/close';
import { raidBanner, type RaidCard, type RaidList as RaidSetup, type UpcomingCard } from '../shared/raids';
import type { RaidRooms } from './raid-rooms';

/*
 * A raid's Raid List, as King's Raid has it: the TechnoMagic Raid's and the Dragon Raid's Play on the front page open
 * theirs over the page (../shared/raids.ts says what is in each). A banner for each boss (its head, its name and its
 * raid's), and beside it Raid Info (King's Raid's window, over the list: ../technomagic/prep/raid-info.ts, read only once
 * one is asked for, so the front page reads none of the raid's own code before), Single Player (straight into a room of the player's own) and Multiplayer (Find Raid and Create Raid
 * over the list: ./raid-rooms.ts). A boss still to come is under the others, its banner greyed and "Upcoming" in place of
 * its buttons. A press outside it, its ✕ or Escape closes it (Multiplayer first, when it is open).
 */

export interface RaidList {
  /** Opens it (on `boss`, if it has it: its row in sight, its Single Player focused). */
  open(boss?: string | null): void;
  /** Opens it, and over it Multiplayer for `boss` (null, or one it hasn't: its first). */
  openRooms(boss: string | null): void;
  close(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** The raid list of `raid` in `root`; `single` opens the raid alone against a boss (`button`: the one pressed, to say it is opening), and `rooms` is its Multiplayer. */
export function makeRaidList(root: HTMLElement, raid: RaidSetup, single: (boss: string, button: HTMLButtonElement) => void, rooms: RaidRooms): RaidList {
  const shade = el('div', 'raid-list');
  shade.hidden = true;
  shade.dataset.raid = raid.game;
  const panel = el('section', 'raid-list-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const close = closeButton('Close the Raid List');
  close.classList.add('raid-list-close');
  const head = el('header', 'raid-list-head');
  const title = el('h2', 'raid-list-title', 'Raid List');
  title.id = `raid-list-title-${raid.game}`;
  panel.setAttribute('aria-labelledby', title.id);
  head.append(title, close);
  const tip = el('p', 'raid-list-tip', raid.tip);
  const rows = el('ol', 'raid-list-rows');
  rows.append(...raid.cards.map(row), ...(raid.upcoming ?? []).map(soon));
  panel.append(head, tip, rows);
  shade.append(panel);
  root.append(shade);

  /** A boss's banner: its head, its raid's name and its own. */
  function bannerOf(card: UpcomingCard): HTMLDivElement {
    const banner = el('div', 'raid-row-banner');
    const picture = el('img', 'raid-row-art');
    picture.src = raidBanner(card.id);
    picture.alt = '';
    picture.loading = 'lazy';
    const names = el('div', 'raid-row-names');
    names.append(el('span', 'raid-row-title', card.title), el('span', 'raid-row-name', card.name));
    banner.append(picture, names);
    return banner;
  }

  /** A boss to come: its banner, and "Upcoming" where its buttons will be. */
  function soon(card: UpcomingCard): HTMLLIElement {
    const item = el('li', 'raid-row upcoming');
    item.dataset.boss = card.id;
    item.append(bannerOf(card), el('span', 'raid-row-soon', 'Upcoming'));
    return item;
  }

  /** A boss's banner and its buttons. */
  function row(card: RaidCard): HTMLLIElement {
    const item = el('li', 'raid-row');
    item.dataset.boss = card.id;
    const banner = bannerOf(card);

    const buttons = el('div', 'raid-row-actions');
    const infoButton = el('button', 'raid-action info', 'Raid Info');
    infoButton.type = 'button';
    infoButton.setAttribute('aria-haspopup', 'dialog');
    infoButton.addEventListener('click', () => {
      infoButton.disabled = true;
      void import('../technomagic/prep/raid-info')
        .then(({ openRaidInfo }) => openRaidInfo(card.id))
        .finally(() => (infoButton.disabled = false));
    });
    const alone = el('button', 'raid-action single', 'Single Player');
    alone.type = 'button';
    alone.addEventListener('click', () => single(card.id, alone));
    const together = el('button', 'raid-action multi', 'Multiplayer');
    together.type = 'button';
    together.addEventListener('click', () => rooms.open(card));
    buttons.append(infoButton, alone, together);
    item.append(banner, buttons);
    return item;
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (rooms.shown) {
      rooms.close();
      (rows.querySelector('.raid-action.multi') as HTMLButtonElement | null)?.focus();
    } else list.close();
  };
  close.addEventListener('click', () => list.close());
  // A press on the dark around it.
  shade.addEventListener('click', (event) => {
    if (event.target === shade) list.close();
  });

  const list: RaidList = {
    open(boss) {
      shade.hidden = false;
      document.addEventListener('keydown', onKey);
      const picked = raid.cards.some((card) => card.id === boss) ? rows.querySelector<HTMLElement>(`.raid-row[data-boss="${boss}"]`) : null;
      if (picked) {
        picked.scrollIntoView({ block: 'nearest' });
        (picked.querySelector('.raid-action.single') as HTMLButtonElement | null)?.focus();
      } else (rows.querySelector('.raid-action.multi') as HTMLButtonElement | null)?.focus();
    },
    openRooms(boss) {
      list.open();
      const card = raid.cards.find((one) => one.id === boss) ?? raid.cards[0];
      if (card) rooms.open(card);
    },
    close() {
      shade.hidden = true;
      rooms.close();
      document.removeEventListener('keydown', onKey);
    },
  };
  return list;
}
