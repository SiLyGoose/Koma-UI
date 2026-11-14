import type { Lobbies } from '../protocol/technomagic';
import type { Game } from '../protocol/site';
import { DIVINE_CARDS, DRAGON_LIST, raidBanner, TM_LIST, type RaidCard, type UpcomingCard } from '../shared/raids';
import { navigate } from '../shared/transition';
import { makeRaidRooms, type RaidRooms } from '../hub/raid-rooms';
import { playGame } from '../site/play';
import { api, currentMe, currentServer, hasSession, logOut } from '../site/session';

/*
 * Adventure (the lobby's bottom-right Battle emblem): King's Raid's Portal (its PortalRenewal window, from the playtest's
 * prefab: Resources/Prefab2/Window/Portal/PortalRenewal), laid out where the prefab has its parts on the game's 1080-high
 * screen and scaled to this one. On its left the Contents menu (PayShop's menu frame and dividers, four diamond buttons a
 * row: ContentsMenuComponent, Portal_Content_Btn_Bg_01 with the content's gold icon and its name under it, the picked one
 * lit by Portal_Select_Fous_01): the kinds of battle (the TechnoMagic Raid, the Dragon Raid, the Divine Punishment Raid,
 * the Weekly Boss). On its right the picked one's name over its divider, and its bosses on the Portal's cards
 * (PortalHalfComponent, PortalThirdComponent, PortalQuaterComponent: one, three or four a column, as the game picks them),
 * each with its banner, name, what it does, and what the front page's Raid List gives it (../hub/raid-list.ts): Raid
 * Info, Single Player and Multiplayer (Find Raid and Create Raid: ../hub/raid-rooms.ts, over it). The Divine Punishment
 * Raid's Apocalypsion opens its own game (games/punishment/), the Weekly Boss its fight. Art: public/kr/ui/portal/.
 */

const PORTAL = `${import.meta.env.BASE_URL}kr/ui/portal/`;

/** The part of King's Raid's 2340x1080 screen the window takes (its menu and contents, and the back button over them). */
const STAGE = { width: 2100, height: 1080 };

/** The Portal's cards, by how many a column holds: their height (980 wide), their row, their picture (at the bottom left). */
const CARDS = {
  half: { height: 448, cell: 448, art: [720, 336] },
  third: { height: 296, cell: 300, art: [720, 216] },
  quater: { height: 224, cell: 220, art: [684, 148] },
} as const;
type CardSize = keyof typeof CARDS;
const cardFor = (count: number): CardSize => (count <= 2 ? 'half' : count === 3 ? 'third' : 'quater');

/** A boss on the right: a raid's card (with its buttons), one to come, or a battle opened as a whole. */
type Boss =
  | { kind: 'raid'; card: RaidCard }
  | { kind: 'soon'; card: UpcomingCard }
  | { kind: 'enter'; id: string; name: string; title: string; art: string; text: string; go: () => void; label: string };

interface Kind {
  game: Game;
  /** Its name over its bosses, and (`short`) under its diamond. */
  name: string;
  short: string;
  /** Its gold icon in its diamond (public/kr/ui/portal/icon-<icon>.webp). */
  icon: string;
  bosses: readonly Boss[];
}

export interface Adventure {
  /** Opens it, on `game`'s tab when given (back from a raid: ../shared/ui/frame/v2-game.ts), else the one picked last. */
  open(game?: string): void;
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
    // (The TechnoMagic and Dragon Raids as v2's, without the frame, their back arrow back here: ../shared/ui/frame/v2-game.ts.)
    const v2 = game === 'technomagic' || game === 'dragon' ? game : undefined;
    const refused = await playGame(game, { single, boss, ...(room && { room }), ...(v2 && { v2 }) });
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
      short: 'TechnoMagic Raid',
      icon: 'technomagic',
      bosses: [...TM_LIST.cards.map((card): Boss => ({ kind: 'raid', card })), ...(TM_LIST.upcoming ?? []).map((card): Boss => ({ kind: 'soon', card }))],
    },
    {
      game: 'dragon',
      name: 'Dragon Raid',
      short: 'Dragon Raid',
      icon: 'dragon',
      bosses: [...DRAGON_LIST.cards.map((card): Boss => ({ kind: 'raid', card })), ...(DRAGON_LIST.upcoming ?? []).map((card): Boss => ({ kind: 'soon', card }))],
    },
    {
      game: 'divine',
      name: 'Divine Punishment Raid',
      short: 'Divine Punishment',
      icon: 'punishment',
      bosses: apocalypsion
        ? [
            {
              kind: 'enter',
              id: apocalypsion.id,
              name: apocalypsion.name,
              title: apocalypsion.title,
              art: raidBanner(apocalypsion.id),
              text: `${apocalypsion.about} Unlock her dungeons for a week, and beat up to two of her guardian dragons to weaken her first.`,
              label: 'Enter',
              go: () => navigate('/games/punishment/#apocalypsion'),
            },
          ]
        : [],
    },
    {
      game: 'raid',
      name: 'Weekly Boss',
      short: 'Weekly Boss',
      icon: 'weekly',
      bosses: [
        {
          kind: 'enter',
          id: 'weekly',
          name: 'Weekly Boss',
          title: 'This week',
          art: `${PORTAL}weekly-art.webp`,
          text: "Team up against this week's boss, turn by turn: attack, guard, heal or support, with the raiders in Discord. Your first win of the week pays five times over.",
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
  window_.innerHTML = `<div class="v2-adv-stage">
      <button type="button" class="v2-adv-back" aria-label="Back to town"><img alt="" src="${PORTAL}back.webp" /></button>
      <section class="v2-adv-menu" aria-label="Contents">
        <h2 class="v2-adv-menu-title">Contents</h2>
        <nav class="v2-adv-kinds" role="tablist" aria-label="Kind of battle"></nav>
      </section>
      <section class="v2-adv-contents" role="tabpanel">
        <h2 class="v2-adv-contents-title"></h2>
        <ol class="v2-adv-cards"></ol>
      </section>
    </div>`;
  into.append(window_);
  const stage = window_.querySelector('.v2-adv-stage') as HTMLElement;
  const tabs = window_.querySelector('.v2-adv-kinds') as HTMLElement;
  const heading = window_.querySelector('.v2-adv-contents-title') as HTMLElement;
  const list = window_.querySelector('.v2-adv-cards') as HTMLElement;
  // King's Raid's screen scaled to this one: the stage whole, as large as fits.
  new ResizeObserver(() => {
    const scale = Math.min(window_.clientWidth / STAGE.width, window_.clientHeight / STAGE.height);
    stage.style.setProperty('--s', String(scale || 1));
  }).observe(window_);

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /** A boss's card: the Portal's (its parchment, its frames, its deco), its picture at its bottom left, its name, what it does, its buttons. */
  function card(kind: Kind, boss: Boss, size: CardSize): HTMLLIElement {
    const item = el('li', `v2-adv-card ${size} ${boss.kind}`);
    for (const part of ['bg', 'frame02', 'frame01', 'deco']) item.append(el('span', `v2-adv-card-${part}`));
    const art = el('img', 'v2-adv-card-art');
    art.alt = '';
    art.loading = 'lazy';
    const title = el('h3', 'v2-adv-card-title');
    const about = el('p', 'v2-adv-card-about');
    const actions = el('div', 'v2-adv-card-actions');
    item.append(art, title, about, actions);
    if (boss.kind === 'soon') {
      art.src = raidBanner(boss.card.banner ?? boss.card.id);
      title.textContent = boss.card.name;
      about.textContent = boss.card.title;
      actions.append(el('span', 'v2-adv-soon', 'Upcoming'));
      return item;
    }
    if (boss.kind === 'enter') {
      art.src = boss.art;
      title.textContent = boss.name;
      about.textContent = boss.text;
      const go = el('button', 'raid-action single', boss.label);
      go.type = 'button';
      go.addEventListener('click', () => {
        if (!ready(kind.game)) return;
        if (kind.game === 'raid') return void openGame('raid', false, null, go);
        boss.go();
      });
      actions.append(go);
      return item;
    }
    const { card: raid } = boss;
    art.src = raidBanner(raid.id);
    title.textContent = raid.name;
    about.textContent = raid.about;
    const info = el('button', 'raid-action info', 'Raid Info');
    info.type = 'button';
    info.setAttribute('aria-haspopup', 'dialog');
    info.addEventListener('click', () => {
      info.disabled = true;
      void import('../technomagic/prep/raid-info')
        .then(({ openRaidInfo }) => openRaidInfo(raid.id))
        .finally(() => (info.disabled = false));
    });
    const alone = el('button', 'raid-action single', 'Single Player');
    alone.type = 'button';
    alone.addEventListener('click', () => void openGame(kind.game, true, raid.id, alone));
    const together = el('button', 'raid-action multi', 'Multiplayer');
    together.type = 'button';
    together.addEventListener('click', () => {
      if (ready(kind.game)) rooms.get(kind.game)?.open(raid);
    });
    actions.append(info, alone, together);
    return item;
  }

  let picked = KINDS[0] as Kind;
  // The Contents menu's diamonds (four a row, 212 apart).
  const tabButtons = KINDS.map((kind) => {
    const tab = el('button', 'v2-adv-kind');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-label', kind.name);
    tab.innerHTML = `<span class="v2-adv-kind-diamond" aria-hidden="true"></span><img alt="" src="${PORTAL}icon-${kind.icon}.webp" /><span class="v2-adv-kind-focus" aria-hidden="true"></span><span class="v2-adv-kind-name"></span>`;
    (tab.querySelector('.v2-adv-kind-name') as HTMLElement).textContent = kind.short;
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
    const size = cardFor(kind.bosses.length);
    list.dataset.size = size;
    list.style.setProperty('--cell', `${CARDS[size].cell}px`);
    list.replaceChildren(...kind.bosses.map((boss) => card(kind, boss, size)));
    list.scrollTop = 0;
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
  function open(game?: string): void {
    render();
    pick(KINDS.find((kind) => kind.game === game) ?? picked);
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
