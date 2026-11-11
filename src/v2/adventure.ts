import type { Lobbies } from '../protocol/technomagic';
import type { Game } from '../protocol/site';
import { DIVINE_CARDS, DRAGON_LIST, raidBanner, TM_LIST, type RaidCard, type UpcomingCard } from '../shared/raids';
import { navigate } from '../shared/transition';
import { makeRaidRooms, type RaidRooms } from '../hub/raid-rooms';
import { playGame } from '../site/play';
import { api, currentMe, currentServer, hasSession, logOut } from '../site/session';

/*
 * Adventure (the lobby's bottom-right Battle emblem): a window over the town, as King's Raid's full-screen windows are (its
 * Portal's backdrop, the top bar's back button with the window's name). On its left the kinds of battle (the TechnoMagic
 * Raid, the Dragon Raid, the Divine Punishment Raid, the Weekly Boss); on its right the bosses of the one picked, each on
 * its banner with what the front page's Raid List gives it (../hub/raid-list.ts): Raid Info, Single Player and
 * Multiplayer (Find Raid and Create Raid: ../hub/raid-rooms.ts, over it). The Divine Punishment Raid's Apocalypsion opens
 * its own game (games/punishment/), the Weekly Boss its fight. Laid out in King's Raid's units where it is its art
 * (--kr), and the screen's otherwise.
 */

const UI = `${import.meta.env.BASE_URL}kr/ui/lobby/`;

/** A boss on the right: a raid's card (with its buttons), one to come, or a battle opened as a whole. */
type Boss =
  | { kind: 'raid'; card: RaidCard }
  | { kind: 'soon'; card: UpcomingCard }
  | { kind: 'enter'; id: string; name: string; title: string; art: string; text: string; go: () => void; label: string };

interface Kind {
  game: Game;
  name: string;
  /** Its picture on its tab. */
  icon: string;
  /** Its line on its tab, and over its bosses. */
  line: string;
  tip: string;
  bosses: readonly Boss[];
}

export interface Adventure {
  open(): void;
  close(): void;
  /** Shows what can be played now (logged in, a server picked, the games the bot plays there). */
  render(): void;
}

export function makeAdventure(
  into: HTMLElement,
  note: (text: string | null, login?: boolean) => void,
  shown: (open: boolean) => void,
): Adventure {
  // Opening a raid (alone, or into a room of the server's), the button pressed saying so meanwhile.
  async function openGame(game: string, single: boolean, boss: string | null, button: HTMLButtonElement, room?: string): Promise<void> {
    if (!ready(game as Game)) return;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening…';
    const refused = await playGame(game, { single, boss, ...(room && { room }) });
    if (!refused) return;
    button.disabled = false;
    button.textContent = label;
    note(refused === 'not_member' ? "You don't seem to be in that server any more." : 'Could not open the game. Try again.');
  }
  async function findRaids(game: string, boss: string): Promise<Lobbies['rooms'] | null> {
    const server = currentServer();
    if (!server) return note('Pick a server in your profile first.'), null;
    const res = await api<Lobbies>(`/api/raid-rooms?${new URLSearchParams({ guild: server, game, boss })}`);
    if (res.ok) return res.data.rooms;
    if (res.status === 401) logOut();
    return null;
  }
  /** Whether they can play `game` now, saying why not. */
  function ready(game: Game): boolean {
    const me = currentMe();
    if (!hasSession() || !me) return note('Log in to play.', true), false;
    if (!currentServer()) return note('Pick a server in your profile first.'), false;
    if (!me.games.includes(game)) return note("Koma doesn't play that in this server."), false;
    note(null);
    return true;
  }

  const rooms = new Map<string, RaidRooms>(
    (['technomagic', 'dragon'] as const).map((game) => [
      game,
      makeRaidRooms(into, {
        find: (boss) => findRaids(game, boss),
        join: (boss, room, button) => void openGame(game, false, boss, button, room),
      }),
    ]),
  );

  const apocalypsion = DIVINE_CARDS.find((card) => card.kind === 'final');
  const KINDS: readonly Kind[] = [
    {
      game: 'technomagic',
      name: 'TechnoMagic Raid',
      icon: 'raid',
      line: 'Galgoria, Siegfried and Ascalon',
      tip: TM_LIST.tip,
      bosses: [...TM_LIST.cards.map((card): Boss => ({ kind: 'raid', card })), ...(TM_LIST.upcoming ?? []).map((card): Boss => ({ kind: 'soon', card }))],
    },
    {
      game: 'dragon',
      name: 'Dragon Raid',
      icon: 'dragon',
      line: "King's Raid's four dragons",
      tip: DRAGON_LIST.tip,
      bosses: [...DRAGON_LIST.cards.map((card): Boss => ({ kind: 'raid', card })), ...(DRAGON_LIST.upcoming ?? []).map((card): Boss => ({ kind: 'soon', card }))],
    },
    {
      game: 'divine',
      name: 'Divine Punishment Raid',
      icon: 'punishment',
      line: 'Apocalypsion, at Infinite levels',
      tip: "King's Raid's last raid: unlock her dungeons for a week, beat up to two of her guardian dragons to weaken her, then face her alone with your heroes.",
      bosses: apocalypsion
        ? [
            {
              kind: 'enter',
              id: apocalypsion.id,
              name: apocalypsion.name,
              title: apocalypsion.title,
              art: raidBanner(apocalypsion.id),
              text: apocalypsion.about,
              label: 'Enter',
              go: () => navigate('/games/punishment/#apocalypsion'),
            },
          ]
        : [],
    },
    {
      game: 'raid',
      name: 'Weekly Boss',
      icon: 'weekly',
      line: "This week's boss, turn by turn",
      tip: "Team up against this week's boss, turn by turn: attack, guard, heal or support, with the raiders in Discord. Your first win of the week pays five times over.",
      bosses: [
        {
          kind: 'enter',
          id: 'weekly',
          name: 'Weekly Boss',
          title: 'This week',
          art: `${UI}weekly.webp`,
          text: 'The same fight as in Discord, so raiders here and there fight together.',
          label: 'Play',
          go: () => undefined,
        },
      ],
    },
  ];

  const window_ = document.createElement('section');
  window_.className = 'v2-adv';
  window_.hidden = true;
  window_.setAttribute('role', 'dialog');
  window_.setAttribute('aria-modal', 'true');
  window_.setAttribute('aria-label', 'Adventure');
  window_.innerHTML = `<header class="v2-adv-bar"><button type="button" class="v2-adv-back" aria-label="Back to town"><span class="v2-kr-label">Adventure</span></button></header>
    <div class="v2-adv-body">
      <nav class="v2-adv-kinds" role="tablist" aria-label="Kind of battle"></nav>
      <div class="v2-adv-panel" role="tabpanel">
        <div class="v2-adv-head"><h2 class="v2-kr-label"></h2><p></p></div>
        <ol class="v2-adv-bosses"></ol>
      </div>
    </div>`;
  into.append(window_);
  const tabs = window_.querySelector('.v2-adv-kinds') as HTMLElement;
  const panel = window_.querySelector('.v2-adv-panel') as HTMLElement;
  const heading = window_.querySelector('.v2-adv-head h2') as HTMLElement;
  const tip = window_.querySelector('.v2-adv-head p') as HTMLElement;
  const list = window_.querySelector('.v2-adv-bosses') as HTMLElement;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /** A boss's banner: its picture, its raid's name and its own. */
  function banner(art: string, title: string, name: string): HTMLElement {
    const box = el('div', 'v2-adv-banner');
    const picture = el('img');
    picture.src = art;
    picture.alt = '';
    picture.loading = 'lazy';
    const names = el('div', 'v2-adv-names');
    names.append(el('span', 'v2-adv-title', title), el('span', 'v2-adv-name', name));
    box.append(picture, names);
    return box;
  }

  function bossItem(kind: Kind, boss: Boss): HTMLLIElement {
    const item = el('li', `v2-adv-boss ${boss.kind}`);
    const actions = el('div', 'v2-adv-actions');
    if (boss.kind === 'soon') {
      item.append(banner(raidBanner(boss.card.banner ?? boss.card.id), boss.card.title, boss.card.name), el('span', 'v2-adv-soon', 'Upcoming'));
      return item;
    }
    if (boss.kind === 'enter') {
      const go = el('button', 'raid-action single', boss.label);
      go.type = 'button';
      go.addEventListener('click', () => {
        if (!ready(kind.game)) return;
        if (kind.game === 'raid') return void openGame('raid', false, null, go);
        boss.go();
      });
      actions.append(go);
      item.append(banner(boss.art, boss.title, boss.name), el('p', 'v2-adv-about', boss.text), actions);
      return item;
    }
    const { card } = boss;
    const info = el('button', 'raid-action info', 'Raid Info');
    info.type = 'button';
    info.setAttribute('aria-haspopup', 'dialog');
    info.addEventListener('click', () => {
      info.disabled = true;
      void import('../technomagic/prep/raid-info')
        .then(({ openRaidInfo }) => openRaidInfo(card.id))
        .finally(() => (info.disabled = false));
    });
    const alone = el('button', 'raid-action single', 'Single Player');
    alone.type = 'button';
    alone.addEventListener('click', () => void openGame(kind.game, true, card.id, alone));
    const together = el('button', 'raid-action multi', 'Multiplayer');
    together.type = 'button';
    together.addEventListener('click', () => {
      if (ready(kind.game)) rooms.get(kind.game)?.open(card);
    });
    actions.append(info, alone, together);
    item.append(banner(raidBanner(card.id), card.title, card.name), el('p', 'v2-adv-about', card.about), actions);
    return item;
  }

  let picked = KINDS[0] as Kind;
  const tabButtons = KINDS.map((kind) => {
    const tab = el('button', 'v2-adv-kind');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    const icon = el('img');
    icon.src = kind.icon === 'dragon' ? raidBanner('temeraire') : `${UI}${kind.icon}.webp`;
    icon.alt = '';
    icon.classList.toggle('banner', kind.icon === 'dragon');
    const words = el('span', 'v2-adv-kind-words');
    words.append(el('b', '', kind.name), el('span', '', kind.line));
    tab.append(icon, words);
    tab.addEventListener('click', () => pick(kind));
    tabs.append(tab);
    return { kind, tab };
  });

  function pick(kind: Kind): void {
    picked = kind;
    for (const { kind: k, tab } of tabButtons) {
      tab.classList.toggle('picked', k === kind);
      tab.setAttribute('aria-selected', String(k === kind));
    }
    heading.textContent = kind.name;
    tip.textContent = kind.tip;
    list.replaceChildren(...kind.bosses.map((boss) => bossItem(kind, boss)));
    panel.scrollTop = 0;
  }

  function render(): void {
    const games = currentMe()?.games;
    // (Logged out, every kind shows; pressing one says to log in.)
    for (const { kind, tab } of tabButtons) tab.classList.toggle('off', !!games && !games.includes(kind.game));
  }

  // Escape: Find Raid and Create Raid first, when they're open over it, then the window (Raid Info hears it before this).
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    const open = [...rooms.values()].find((r) => r.shown);
    if (open) open.close();
    else close();
  };
  function open(): void {
    render();
    pick(picked);
    window_.hidden = false;
    document.addEventListener('keydown', onKey);
    shown(true);
    (tabButtons.find(({ kind }) => kind === picked)?.tab ?? window_).focus();
  }
  function close(): void {
    if (window_.hidden) return;
    window_.hidden = true;
    for (const r of rooms.values()) r.close();
    document.removeEventListener('keydown', onKey);
    shown(false);
  }
  (window_.querySelector('.v2-adv-back') as HTMLElement).addEventListener('click', close);

  return { open, close, render };
}
