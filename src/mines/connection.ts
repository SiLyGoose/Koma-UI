import { setConn } from '../shared/frame';
import { watching } from '../shared/game/link';
import { hideMessage, showMessage } from '../shared/game/message';
import { gameSocket, type GameSocket } from '../shared/game/socket';
import { showWatchers, showWatching, watchAway, watchBack } from '../shared/live';
import { refusalText, showLobby } from './lobby';
import { setBalance, showError } from './panel';
import type { ClientMessage, ErrorCode, ServerMessage } from './protocol';
import { render } from './render';
import { applyEvent } from './round';
import { state } from './state';

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the mine again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The mine is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  not_playing: ['Nobody to watch', "They aren't playing Mines right now. Pick someone else from the online list."],
  full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
};

let socket: GameSocket<ClientMessage> | null = null;

/** Says `message` to the bot; false when not connected right now. */
export function send(message: ClientMessage): boolean {
  return socket?.send(message) ?? false;
}

/** Connects to the bot at `server`, as `token` (to play, or to watch). */
export function connect(server: string, token: string): void {
  socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => (watching ? { t: 'watch', token } : { t: 'hello', token }),
    receive,
    onDrop: () => {
      state.pending = null;
      render();
    },
  });
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      socket?.finish();
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'lobby':
      showLobby(message.lobby);
      return;
    case 'refused':
      if (state.pending?.seq === message.seq) state.pending = null;
      showError(refusalText(message));
      render();
      return;
    case 'watching':
      state.watched = message.player;
      showWatching(state.watched);
      render();
      return;
    case 'watchers':
      showWatchers(message.count);
      return;
    case 'away':
      showWatching(state.watched, true);
      // A moment later (not for a reload), tell them, with the way home.
      watchAway(
        () => showMessage(`${state.watched} left the game`, `${state.watched} isn't playing Mines any more. Head back home to see who's online and watch someone else.`),
        hideMessage,
      );
      return;
    case 'state': {
      // Watching, every pick is theirs: its sound plays too. And they're back if they were away.
      const picked = watching ? message.event !== undefined : message.seq !== 0 && state.pending?.seq === message.seq;
      if (watching && state.watched) {
        showWatching(state.watched);
        watchBack();
      }
      if (message.seq === 0 || state.pending?.seq === message.seq) state.pending = null;
      state.run = message.state;
      setBalance(message.state.balance);
      state.lastActivity = performance.now();
      applyEvent(message.event, picked);
      render();
    }
  }
}
