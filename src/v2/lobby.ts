import type { Lobbies } from '../protocol/technomagic';
import type { Game } from '../protocol/site';
import { DRAGON_LIST, TM_LIST } from '../shared/raids';
import { navigate } from '../shared/transition';
import { makeRaidList, type RaidList } from '../hub/raid-list';
import { makeRaidRooms } from '../hub/raid-rooms';
import { playGame } from '../site/play';
import { api, currentMe, currentServer, hasSession, logOut } from '../site/session';

/*
 * King's Raid's lobby menus over the town's bottom corners. At the bottom left, its RightMenu row (MenuAnchor's Buttons:
 * 140-unit WorldMap_Button_* at 0.9, 148 apart, a 32-unit gold label under each): Heroes, Inventory and Index (the
 * Archive), each opening its page at once, as the game's menu does. At the bottom right, the lobby's big round raid
 * buttons: Raid (Raid_Button_MainLobby), choosing the TechnoMagic Raid's or the Dragon Raid's Raid List (the front page's:
 * ../hub/raid-list.ts) or the Weekly Boss, and Divine Punishment (Punishment_Button: its own game, games/punishment/).
 * Its art: public/kr/ui/lobby/ (KR-extracted/scripts/kr-lobby-ui.py). Laid out in King's Raid's units, scaled by --kr.
 */

const UI = `${import.meta.env.BASE_URL}kr/ui/lobby/`;

/** The bottom-left row: its button's art, its label, the page it opens (an old-site path). */
const MENU: readonly { art: string; label: string; path: string }[] = [
  { art: 'heroes', label: 'Heroes', path: '/heroes' },
  { art: 'inventory', label: 'Inventory', path: '/inventory' },
  { art: 'index', label: 'Index', path: '/databank' },
];

/** What the Raid button chooses between. */
const RAIDS: readonly { game: Game; name: string; text: string }[] = [
  { game: 'technomagic', name: 'TechnoMagic Raid', text: 'Galgoria, Siegfried and Ascalon. Alone or together; wins give TechnoMagic gear.' },
  { game: 'dragon', name: 'Dragon Raid', text: "King's Raid's four dragons. Break their CC Gauge before their breath." },
  { game: 'raid', name: 'Weekly Boss', text: "This week's boss, turn by turn, with the raiders in Discord." },
];

export interface Lobby {
  /** Shows what can be pressed now (logged in, a server picked, the games the bot plays there). */
  render(): void;
}

export function makeLobby(into: HTMLElement, opens: (path: string) => void, note: (text: string | null, login?: boolean) => void): Lobby {
  const menu = document.createElement('nav');
  menu.className = 'v2-menu';
  menu.setAttribute('aria-label', 'Menu');
  for (const item of MENU) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v2-menu-button';
    button.innerHTML = `<img alt="" src="${UI}${item.art}.webp" /><span class="v2-kr-label"></span>`;
    (button.querySelector('span') as HTMLElement).textContent = item.label;
    button.addEventListener('click', () => opens(item.path));
    menu.append(button);
  }

  const raidMenu = document.createElement('nav');
  raidMenu.className = 'v2-raids';
  raidMenu.setAttribute('aria-label', 'Raids');
  raidMenu.innerHTML = `<button type="button" class="v2-raid-button" data-raid="raid"><img alt="" src="${UI}raid.webp" /><span class="v2-kr-label">Raid</span></button>
    <button type="button" class="v2-raid-button" data-raid="divine"><img alt="" src="${UI}punishment.webp" /><span class="v2-kr-label">Divine Punishment</span></button>`;
  into.append(menu, raidMenu);

  /** Whether they can play now, saying why not. */
  const ready = (): boolean => {
    if (!hasSession() || !currentMe()) return note('Log in to raid.', true), false;
    if (!currentServer()) return note('Pick a server in your profile first.'), false;
    return true;
  };

  // The front page's Raid Lists (a boss, then Single Player or Multiplayer), over the town.
  async function openGame(game: string, single: boolean, boss: string | null, button: HTMLButtonElement, room?: string): Promise<void> {
    if (!ready()) return;
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
  const lists = new Map<string, RaidList>(
    [TM_LIST, DRAGON_LIST].map((raid) => {
      const rooms = makeRaidRooms(into, {
        find: (boss) => findRaids(raid.game, boss),
        join: (boss, room, button) => void openGame(raid.game, false, boss, button, room),
      });
      return [raid.game, makeRaidList(into, raid, (boss, button) => void openGame(raid.game, true, boss, button), rooms)];
    }),
  );

  // The Raid button's choice, drawn as the profile's popup is (King's Raid's PayShop frame).
  const shade = document.createElement('div');
  shade.className = 'v2-pop';
  shade.hidden = true;
  shade.innerHTML = `<section class="v2-pop-frame v2-pop-raids" role="dialog" aria-modal="true" aria-labelledby="v2-raids-title">
      <header class="v2-pop-title"><h2 id="v2-raids-title">Raid</h2><button type="button" class="v2-pop-close" aria-label="Close"></button></header>
      <div class="v2-pop-body"></div>
    </section>`;
  into.append(shade);
  const body = shade.querySelector('.v2-pop-body') as HTMLElement;
  const frame = shade.querySelector('.v2-pop-frame') as HTMLElement;
  const rows = RAIDS.map((raid) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'v2-pop-raid';
    row.innerHTML = '<b></b><span></span>';
    (row.querySelector('b') as HTMLElement).textContent = raid.name;
    (row.querySelector('span') as HTMLElement).textContent = raid.text;
    row.addEventListener('click', () => {
      close();
      const list = lists.get(raid.game);
      if (list) return list.open();
      void openGame(raid.game, false, null, row);
    });
    body.append(row);
    return { raid, row };
  });
  const close = (): void => void (shade.hidden = true);
  (shade.querySelector('.v2-pop-close') as HTMLElement).addEventListener('click', close);
  shade.addEventListener('pointerdown', (e) => {
    if (!frame.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !shade.hidden) close();
  });

  raidMenu.addEventListener('click', (e) => {
    const which = (e.target as Element).closest<HTMLElement>('[data-raid]')?.dataset.raid;
    if (!which || !ready()) return;
    note(null);
    if (which === 'divine') {
      if (!currentMe()?.games.includes('divine')) return note("Koma doesn't play the Divine Punishment Raid in this server.");
      return navigate('/games/punishment/');
    }
    render();
    shade.hidden = false;
    (shade.querySelector('.v2-pop-close') as HTMLElement).focus();
  });

  function render(): void {
    const games = currentMe()?.games ?? [];
    for (const { raid, row } of rows) row.disabled = !games.includes(raid.game);
  }

  render();
  return { render };
}
