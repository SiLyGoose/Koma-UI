import markup from './hub.html?raw';
import { API, store } from '../shared/account';
import { navigate } from '../shared/transition';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, hasSession, loadMe, loggedIn, logIn, logOut, setServer, takeLoginState, type Game, type Me } from '../site/session';

/*
 * The front page: log in with Discord, pick a server, pick a game. The bot does the logging in
 * (its /api, at VITE_API_URL): this page sends the browser to the bot, which sends it to Discord,
 * which sends it back here with a code; the bot trades the code for a session, kept in this
 * browser (../site/session.ts). Picking a game asks the bot for a link to it, like the ones handed out
 * in Discord; the game is its own page.
 */

/** A game to open once logged in: from a link like /?play=mines&guild=123 (the bot's buttons in Discord). */
const PLAY_KEY = 'koma.playNext';
const GAMES: readonly Game[] = ['mines', 'pinecraft', 'baccarat', 'roulette'];

const points = (n: number): string => n.toLocaleString('en-US');

export const hubPage: Page = { path: '', title: 'Komaverse', icon: '🎮', markup, mount };

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
      balance.textContent = `${points(s.balance)} pts`;
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
      status(res.status === 401 ? null : res.status === 0 ? 'Koma is not answering right now. Try again in a moment.' : 'Could not load your servers.', res.status !== 401);
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
    const { game, guild } = JSON.parse(wanted) as { game: string; guild: string | null };
    if (guild && me.servers.some((s) => s.id === guild)) {
      setServer(guild);
      render();
    }
    ui.playButtons.find((button) => button.dataset.play === game)?.click();
  }

  ui.loginButton.addEventListener('click', logIn);

  for (const button of ui.playButtons) {
    button.addEventListener('click', async () => {
      const server = currentServer();
      if (!server) return;
      const label = button.textContent;
      button.dataset.label = label;
      button.disabled = true;
      button.textContent = 'Opening…';
      const res = await api<{ url: string }>('/api/play', { method: 'POST', body: JSON.stringify({ guild: server, game: button.dataset.play }) });
      if (res.ok) {
        navigate(res.data.url);
        return;
      }
      button.disabled = false;
      button.textContent = label;
      if (res.status === 401) return logOut();
      status(res.error === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : 'Could not open the game. Try again.', true);
    });
  }

  async function start(): Promise<void> {
    if (!API) return status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    const query = new URLSearchParams(location.search);
    // A link to a game (from Discord): remember it through the login, and tidy the address.
    const play = query.get('play');
    if (GAMES.includes(play as Game)) {
      store.set(sessionStorage, PLAY_KEY, JSON.stringify({ game: play, guild: query.get('guild') }));
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

  return { drawn: start(), unmount: () => window.removeEventListener('pageshow', onPageShow) };
}
