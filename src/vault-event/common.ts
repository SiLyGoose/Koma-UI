import '../shared/style.css';
import './vault-event.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { gameSocket, hideMessage, linkToken, server, showMessage, token, watching, type GameSocket } from '../shared/game';
import { apiFromSocket, showWatchers, startLive, watchAway, watchBack } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { coin } from '../shared/util/coin';

/*
 * What the vault events' pages (Hot Potato: ../potato/, Laser Grid: ../laser/) share. Each is a random event in Discord
 * that this page plays too, the one game: the link carries the player's token (t), or a watch link's (w), and the bot's
 * WebSocket address (s) after the #. Everything about these games is public, so the bot tells every page in the server
 * the same game; a page that didn't join in time watches it, and so does a watch link (the Friends list's Watch), which
 * sees the game as the player it follows does. There's no chat beside it.
 *
 * This connects, says hello (or watch), keeps the watch tag and the watcher count, and says why the page
 * can't go on; the game's own messages go to the page's `receive`.
 */

/** What every page is told besides its game's own: about watching, and why it's hung up on. */
type Common = { t: 'watching'; player: string; you?: string } | { t: 'watchers'; count: number } | { t: 'away' } | { t: 'error'; code: string };

const COMMON = new Set(['watching', 'watchers', 'away', 'error']);

export interface EventPageOptions<In> {
  /** The game's name, as the page says it ("Hot Potato"). */
  name: string;
  /** The tag over the game saying whose it is, watching. */
  watchTag: HTMLElement;
  /** The game's own messages (state, answer). */
  receive: (message: In) => void;
  /** The key the page's sound setting is kept under. */
  mutedKey: string;
}

export interface EventPage<Out> {
  /** Says `message` to the bot (watching, nothing goes); false when it didn't go. */
  send(message: Out): boolean;
  /** Whether this page only watches someone (a watch link). */
  readonly watching: boolean;
}

/** Connects the page (or says why it can't), and returns how to talk to the bot. */
export function startEventPage<In extends { t: string }, Out extends { t: string }>(options: EventPageOptions<In>): EventPage<Out> {
  const { name } = options;
  const ERRORS: Record<string, [string, string]> = {
    bad_token: ['This link has run out', `Open ${name} again from the games page or from the event in Discord for a new one.`],
    replaced: ['Opened somewhere else', `${name} is open in another tab or window. Only one can play at a time.`],
    bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
    not_playing: ['Nobody to watch', `They aren't on ${name} any more. Head back to see who's online and watch someone else.`],
    full: ['Too many watching', 'As many people as can are watching them already. Try again in a while.'],
  };

  let socket: GameSocket<Out | { t: 'hello' | 'watch'; token: string }> | null = null;
  let watched = '';

  const send = (message: Out): boolean => !watching && (socket?.send(message) ?? false);

  if (watching) document.getElementById('app')?.classList.add('ve-watching');
  function showWatched(away = false): void {
    options.watchTag.hidden = !watched;
    options.watchTag.textContent = away ? `👁 ${watched} left ${name}` : `👁 Watching ${watched}`;
    options.watchTag.classList.toggle('away', away);
  }

  function receive(message: In | Common): void {
    if (!COMMON.has(message.t)) {
      if (watching && watched && options.watchTag.classList.contains('away')) {
        showWatched();
        watchBack();
      }
      options.receive(message as In);
      return;
    }
    const common = message as Common;
    switch (common.t) {
      case 'watching':
        watched = common.player;
        showWatched();
        return;
      case 'watchers':
        showWatchers(common.count);
        return;
      case 'away':
        showWatched(true);
        watchAway(() => showMessage(`${watched} left ${name}`, `${watched} isn't on ${name} any more. Head back to see who's online and watch someone else.`), hideMessage);
        return;
      case 'error': {
        socket?.finish();
        const [title, text] = ERRORS[common.code] ?? (ERRORS.bad_message as [string, string]);
        showMessage(title, text);
        setConn('Disconnected', 'bad');
        return;
      }
    }
  }

  soundButton(options.mutedKey, setMuted);
  if (!token || !server) {
    setConn('No link', 'bad');
    showMessage('Open this from the games page', `Log in on the games page and pick ${name}, or press Play on the site on a ${name} in Discord.`);
  } else {
    socket = gameSocket<In | Common, Out | { t: 'hello' | 'watch'; token: string }>({
      server,
      hello: () => ({ t: watching ? 'watch' : 'hello', token: linkToken() }),
      receive,
    });
    startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${linkToken()}`, newTab: true });
  }

  return { send, watching };
}

// ---- What both pages draw ----

export const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export const coins = (n: number): string => `${n.toLocaleString('en-US')} zeiucoins`;

/** An amount in a stat: the number, then :zeiucoin:. */
export function amount(into: HTMLElement, n: number): void {
  into.replaceChildren(n.toLocaleString('en-US'), coin('ve-coin'));
}

/** Seconds as a clock shows them (m:ss). */
export const clockText = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** A reaction time ("0.42s"). */
export const reactionText = (ms: number): string => `${(ms / 1000).toFixed(2)}s`;

/** A list's items: each line, or `nobody` when there are none. */
export function fillList(list: HTMLElement, lines: readonly { text: string; you?: boolean; className?: string }[], nobody: string): void {
  list.replaceChildren(
    ...(lines.length === 0
      ? [el('li', 've-nobody', nobody)]
      : lines.map((line) => el('li', `${line.className ?? ''}${line.you ? ' you' : ''}`.trim(), line.text))),
  );
}

/** Says `text` over the game for a moment (`kind`: good news, bad news, or just news). */
export function toaster(box: HTMLElement): (text: string, kind?: 'good' | 'bad' | '') => void {
  let timer = 0;
  return (text, kind = '') => {
    box.textContent = text;
    box.classList.toggle('good', kind === 'good');
    box.classList.toggle('bad', kind === 'bad');
    box.hidden = false;
    clearTimeout(timer);
    timer = window.setTimeout(() => (box.hidden = true), kind === 'good' ? 2600 : 1800);
  };
}
