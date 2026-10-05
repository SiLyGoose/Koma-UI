import { setConn } from '../shared/frame';
import { gameSocket, type GameSocket } from '../shared/game/socket';
import { firstPaint, showMessage } from './message';
import type { ClientMessage, ErrorCode, ServerMessage } from './protocol';
import { render } from './render';
import { state } from './state';
import { toast } from './toast';
import { ui } from './ui';
import { answerText } from './words';

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the raid again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The raid is open in another tab or window.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
};

let socket: GameSocket<ClientMessage> | null = null;

/** Tells the bot what was pressed (or says it can't: not connected right now). */
export function send(message: ClientMessage): void {
  if (!socket?.send(message)) toast('Not connected to the bot right now.');
}

/** Connects to the bot as `token`, at `server`. */
export function connect(server: string, token: string): void {
  socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => ({ t: 'hello', token }),
    receive,
    // Lost: let the page be seen (the pill says it's reconnecting).
    onDrop: firstPaint,
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
  if (message.t === 'answer') {
    if (message.to === 'start') ui.start.disabled = false;
    if (message.to === 'act') {
      if (message.code === 'ok' && state.pendingPick) state.lastPick = state.pendingPick;
      state.pendingPick = null;
    }
    const text = answerText(message.code);
    if (text) toast(text);
    else if (message.to === 'start') toast("The raid's lobby is up! Join in.");
    return;
  }
  // Anything else (like the online list's watcher count) isn't the raid.
  if (message.t === 'raid') render(message.view);
}
