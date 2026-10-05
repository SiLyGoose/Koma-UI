import { setConn } from '../shared/frame';
import { watching } from '../shared/game/link';
import { hideMessage, showMessage } from '../shared/game/message';
import { gameSocket, type GameSocket } from '../shared/game/socket';
import { showWatchers, showWatching, watchAway } from '../shared/live';
import { apply } from './apply';
import { MIN_DIG_MS } from './constants';
import { renderMap } from './map';
import type { ClientMessage, ErrorCode, ServerMessage } from './protocol';
import { state } from './state';
import { ui } from './ui';
import { watchBreaking, watchState } from './watch';

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open Pinecraft again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Pinecraft is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  failed: ['Something went wrong', 'Your mine could not be loaded or saved. Try again in a moment.'],
  not_playing: ['Nobody to watch', "They aren't playing Pinecraft right now. Pick someone else from the online list."],
  full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
};

let socket: GameSocket<ClientMessage> | null = null;

export function send(message: ClientMessage): void {
  socket?.send(message);
}

/** Connected to the bot right now. */
export const connected = (): boolean => socket?.open() ?? false;

/** Connects to the bot at `server`, as `token` (to play, or to watch). */
export function connect(server: string, token: string): void {
  socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => (watching ? { t: 'watch', token } : { t: 'hello', token }),
    receive,
    onDrop: () => {
      state.pendingDig = null;
      state.breaking = null;
      if (state.scene) state.scene.digging = null;
    },
  });
}

function receive(message: ServerMessage): void {
  if (message.t === 'error') {
    socket?.finish();
    const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
    showMessage(title, text);
    setConn('Disconnected', 'bad');
    return;
  }
  if (message.t === 'map') {
    state.worldMap = message.map;
    if (state.mapOpen) renderMap();
    return;
  }
  if (message.t === 'watchers') return showWatchers(message.count);
  if (message.t === 'watching') {
    state.watched = message.player;
    showWatching(state.watched);
    ui.log.textContent = `Watching ${state.watched} dig`;
    return;
  }
  if (message.t === 'away') {
    showWatching(state.watched, true);
    // A moment later (not for a reload), tell them, with the way home.
    return watchAway(
      () => showMessage(`${state.watched} left the game`, `${state.watched} isn't playing Pinecraft any more. Head back home to see who's online and watch someone else.`),
      hideMessage,
    );
  }
  if (message.t === 'breaking') return watchBreaking(message.dir);
  if (watching) return watchState(message.state, message.event);
  const answersDig = state.pendingDig !== null && message.seq === state.pendingDig.seq;
  // Answers to walks the page already made are behind it; only the latest (or a fresh start) moves the character.
  const moveCharacter = message.seq === 0 || message.seq === state.seq;
  if (message.seq === 0) {
    state.pendingDig = null;
    state.breaking = null;
    if (state.scene) state.scene.digging = null;
  }
  if (!answersDig) {
    apply(message.state, message.event, moveCharacter, null);
    return;
  }
  // A dig: let the pickaxe swing a little before the block breaks.
  const dig = state.pendingDig as NonNullable<typeof state.pendingDig>;
  const wait = Math.max(0, dig.since + MIN_DIG_MS - performance.now());
  setTimeout(() => {
    if (state.pendingDig !== dig) return;
    state.pendingDig = null;
    if (state.scene) state.scene.digging = null;
    apply(message.state, message.event, moveCharacter, { x: dig.x, y: dig.y });
  }, wait);
}
