import markup from './hub.html?raw';
import { API, store } from '../shared/ui';
import { navigate } from '../shared/transition';
import { DRAGON_LIST, TM_LIST } from '../shared/raids';
import { makeRaidList, type RaidList } from './raid-list';
import { makeRaidRooms } from './raid-rooms';
import type { Lobbies } from '../protocol/technomagic';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, hasSession, loadMe, loggedIn, logIn, logOut, setServer, takeLoginState, type Game, type Me } from '../site/session';

/*
 * The front page: log in with Discord, pick a server, pick a game. The bot does the logging in
 * (its /api, at VITE_API_URL): this page sends the browser to the bot, which sends it to Discord,
 * which sends it back here with a code; the bot trades the code for a session, kept in this
 * browser (../site/session.ts). Picking a game asks the bot for a link to it, like the ones handed out
 * in Discord; the game is its own page. The TechnoMagic Raid's and the Dragon Raid's Play open their Raid Lists
 * (./raid-list.ts): a boss, then Single Player (a room of their own, not said in Discord) or Multiplayer (./raid-rooms.ts:
 * Find Raid, the server's raids against it, or Create Raid, a new one, which the bot says in Discord was created).
 */

/**
 * A game to open once logged in: from a link like /?play=mines&guild=123 (the bot's buttons in Discord). A raid's has
 * &mode=multi, the Dragon Raid's &boss= too (a dragon): with &room= (a raid's own link), straight into that raid; without,
 * the boss's Find Raid.
 */
const PLAY_KEY = 'koma.playNext';
const GAMES: readonly Game[] = ['mines', 'pinecraft', 'baccarat', 'roulette', 'poker', 'raid', 'minesweeper', 'technomagic', 'dragon'];

const points = (n: number): string => n.toLocaleString('en-US');

/** A game's link with what the page is to read from its address (before the #): the boss it is against (?boss=) and the raid (?room=), those there are. */
function withQuery(url: string, query: { boss?: string | null; room?: string | null }): string {
  const more = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')).toString();
  if (!more) return url;
  const at = url.indexOf('#');
  const [path, hash] = at < 0 ? [url, ''] : [url.slice(0, at), url.slice(at)];
  return `${path}${path.includes('?') ? '&' : '?'}${more}${hash}`;
}

export const hubPage: Page = { title: 'Komaverse', icon: '🎮', markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const ui = {
    login: $('login'),
    loginButton: $<HTMLButtonElement>('login-button'),
    status: $('status'),
    play: $('play'),
    servers: $('servers'),
    noServers: $('no-servers'),
    playButtons: [...root.querySelectorAll<HTMLButtonElement>('[data-play]')],
  };
  // The raids' Raid Lists (by the game they open): a boss's Single Player opens the raid against it alone, its Multiplayer
  // finds a raid of the server's against it or creates one.
  const raidLists = new Map<string, RaidList>(
    [TM_LIST, DRAGON_LIST].map((raid) => {
      const rooms = makeRaidRooms(root, {
        find: (boss) => findRaids(raid.game, boss),
        join: (boss, room, button) => void openGame(raid.game, 'multi', boss, button, room),
      });
      return [raid.game, makeRaidList(root, raid, (boss, button) => void openGame(raid.game, 'single', boss, button), rooms)];
    }),
  );

  /** The server's raids of `game` against `boss`, for Find Raid (null: it couldn't ask, said why). */
  async function findRaids(game: string, boss: string): Promise<Lobbies['rooms'] | null> {
    const server = currentServer();
    if (!server) {
      status('Pick a server first.', true);
      return null;
    }
    const res = await api<Lobbies>(`/api/raid-rooms?${new URLSearchParams({ guild: server, game, boss })}`);
    if (res.ok) return res.data.rooms;
    if (res.status === 401) logOut();
    return null;
  }

  function status(text: string | null, bad = false): void {
    ui.status.hidden = text === null;
    ui.status.textContent = text ?? '';
    ui.status.classList.toggle('bad', bad);
  }

  function showLogin(): void {
    ui.login.hidden = false;
    ui.play.hidden = true;
  }

  function render(): void {
    const me = currentMe();
    if (!me) return showLogin();
    ui.login.hidden = true;
    ui.play.hidden = false;
    const server = currentServer();
    ui.servers.textContent = '';
    ui.noServers.hidden = me.servers.length > 0;
    for (const s of me.servers) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `server${s.id === server ? ' picked' : ''}`;
      const icon = document.createElement(s.icon ? 'img' : 'span');
      icon.className = 'server-icon';
      if (s.icon) (icon as HTMLImageElement).src = s.icon;
      else icon.textContent = s.name.slice(0, 1).toUpperCase();
      const name = document.createElement('span');
      name.className = 'server-name';
      name.textContent = s.name;
      const balance = document.createElement('span');
      balance.className = 'server-balance';
      balance.textContent = `${points(s.balance)} zeiucoins`;
      button.append(icon, name, balance);
      button.addEventListener('click', () => {
        setServer(s.id);
        render();
      });
      ui.servers.append(button);
    }
    for (const button of ui.playButtons) {
      button.disabled = server === null || !me.games.includes(button.dataset.play as Game);
    }
  }

  /** Back from Discord with a code: trade it for a session. */
  async function finishLogin(code: string, state: string): Promise<void> {
    history.replaceState(history.state, '', location.pathname);
    const wanted = takeLoginState();
    if (!wanted || wanted !== state) {
      status('That login did not come from this page. Try again.', true);
      return showLogin();
    }
    status('Logging in…');
    const res = await api<{ session: string; me: Me }>('/api/login', { method: 'POST', body: JSON.stringify({ code }) });
    if (!res.ok) {
      status(res.error === 'discord_failed' ? 'Discord did not let that login through. Try again.' : 'Could not log in. Try again in a moment.', true);
      return showLogin();
    }
    loggedIn(res.data.session, res.data.me);
    status(null);
    render();
    playPending();
  }

  async function showMember(): Promise<void> {
    status('Loading…');
    // Fresh each time: the points shown here change as they play.
    const res = await loadMe(true);
    if (!res.ok) {
      status(res.status === 401 ? null : 'Could not load your servers.', res.status !== 401);
      return showLogin();
    }
    status(null);
    render();
    playPending();
  }

  /** Opens the game a link asked for (kept through the login), in the server it came from if the member is in it. */
  function playPending(): void {
    const wanted = store.get(sessionStorage, PLAY_KEY);
    store.set(sessionStorage, PLAY_KEY, null);
    const me = currentMe();
    if (!wanted || !me) return;
    const { game, guild, mode, boss, room } = JSON.parse(wanted) as { game: string; guild: string | null; mode?: string | null; boss?: string | null; room?: string | null };
    if (guild && me.servers.some((s) => s.id === guild)) {
      setServer(guild);
      render();
    }
    const ofGame = ui.playButtons.filter((button) => button.dataset.play === game);
    // A raid: a raid's own link straight into it (or alone, into a room of their own); else the boss's Find Raid.
    const list = raidLists.get(game);
    if (list && ofGame[0] && (mode === 'single' || room)) return void openGame(game, mode ?? 'multi', boss ?? null, ofGame[0], room ?? undefined);
    if (list && mode === 'multi') return list.openRooms(boss ?? null);
    (ofGame.find((button) => mode && button.dataset.mode === mode) ?? ofGame[0])?.click();
  }

  /**
   * Asks the bot for a link to `game` in the server picked and goes there (alone: `mode` single; against `boss`, a dragon;
   * into raid `room`, or a new one: `new`), `button` saying it is opening meanwhile.
   */
  async function openGame(game: string, mode: string | undefined, boss: string | null, button: HTMLButtonElement, room?: string): Promise<void> {
    const server = currentServer();
    if (!server) return status('Pick a server first.', true);
    const label = button.textContent;
    button.dataset.label = label;
    button.disabled = true;
    button.textContent = 'Opening…';
    const res = await api<{ url: string }>('/api/play', { method: 'POST', body: JSON.stringify({ guild: server, game }) });
    if (res.ok) {
      // Single player: the game's page asks the bot for a room of the player's own (see ../shared/game/link.ts).
      const url = withQuery(res.data.url, { boss, room: mode === 'single' ? null : room });
      navigate(mode === 'single' ? `${url}&m=single` : url);
      return;
    }
    button.disabled = false;
    button.textContent = label;
    if (res.status === 401) return logOut();
    status(res.error === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : 'Could not open the game. Try again.', true);
  }

  ui.loginButton.addEventListener('click', logIn);

  for (const button of ui.playButtons) {
    button.addEventListener('click', async () => {
      // A raid with a Raid List: it, to pick a boss first.
      const list = raidLists.get(button.dataset.list ?? '');
      if (list) return list.open();
      if (!currentServer()) return;
      await openGame(button.dataset.play ?? '', button.dataset.mode, null, button);
    });
  }

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    const query = new URLSearchParams(location.search);
    // A link to a game (from Discord): remember it through the login, and tidy the address.
    const play = query.get('play');
    if (GAMES.includes(play as Game)) {
      store.set(sessionStorage, PLAY_KEY, JSON.stringify({ game: play, guild: query.get('guild'), mode: query.get('mode'), boss: query.get('boss'), room: query.get('room') }));
      history.replaceState(history.state, '', location.pathname + location.hash);
    }
    const code = query.get('code');
    const state = query.get('state');
    if (query.get('error')) {
      history.replaceState(history.state, '', location.pathname);
      status('The login was cancelled.');
      showLogin();
    } else if (code && state) await finishLogin(code, state);
    else if (hasSession()) await showMember();
    else showLogin();
  }

  /**
   * Back from a game to this page as the browser kept it (its back-forward cache): as it was left, the
   * game's button still "Opening…". The buttons go back to how they were, with the points (which the
   * game changed) asked for again.
   */
  const onPageShow = (e: PageTransitionEvent): void => {
    if (!e.persisted) return;
    for (const button of ui.playButtons) {
      if (button.dataset.label !== undefined) button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
    render();
    if (hasSession()) void loadMe(true).then(render);
  };
  window.addEventListener('pageshow', onPageShow);

  return {
    drawn: start(),
    unmount: () => {
      window.removeEventListener('pageshow', onPageShow);
      for (const list of raidLists.values()) list.close();
    },
  };
}
