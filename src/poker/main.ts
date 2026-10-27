import '../shared/style.css';
import './poker.css';
import { barSlot, setConn, soundButton, titleExtra } from '../shared/ui/frame/frame';
import { gameSocket, linkToken, server, showMessage, token, watching } from '../shared/game';
import { apiFromSocket, chatBox, startLive } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { points } from '../shared/util';
import { renderCenter, renderStatus } from './center';
import { mySeat, newContext, send, showError, type PokerContext } from './context';
import { renderControls, wireControls } from './controls';
import { makeLobby } from './lobby';
import type { ClientMessage, ErrorCode, PokerState, Refusal, ServerMessage, TableListing } from '../protocol/poker';
import { renderSeats, renderSeatTimer } from './seats';
import { play } from './sfx';

/*
 * Texas hold'em in the browser. The link from Discord (or the front page) carries, after the #, the
 * player's token (t) and the bot's WebSocket address (s); the bot sends the server's tables, which the
 * player joins one of or creates (lobby.ts), or puts them straight back at the one they're at. The
 * table, this page shows: the eight seats round the felt (seats.ts), the board and the pot (center.ts), and what
 * they can do (controls.ts), with the table's chat under it. The bot runs the game; this page only draws what it's told and sends
 * the player's moves. It is only ever told this player's cards (and anyone's that are face up), so
 * nothing here gives anyone else's away. That's also why poker can't be watched.
 */

const ctx: PokerContext = newContext();
// The table's chat, in a box of its own under the panel.
const chat = chatBox({ mount: document.getElementById('chat') as HTMLElement, send: (message) => send(ctx, message), you: () => ctx.state?.you ?? null });
const tableNo = titleExtra('pk-table-no');
const layout = document.getElementById('layout') as HTMLElement;
const hint = document.getElementById('hint') as HTMLElement;
const lobby = makeLobby({
  refresh: () => send(ctx, { t: 'tables' }),
  join: (table) => {
    lobby.error(null);
    send(ctx, { t: 'join', table });
  },
});

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open poker again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Poker is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
};

function refusalText(r: Refusal): string {
  switch (r.reason) {
    case 'buy_in':
      return `Sit down with ${points(r.min)} to ${points(r.max)} chips.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'seat_taken':
      return 'That seat was just taken.';
    case 'table_full':
      return 'That table is full of players now. Pick another, or create one.';
    case 'no_table':
      return 'That table has closed. Pick another, or create one.';
    case 'not_now':
      return "That can't be done right now.";
    case 'bot_limit':
      return `You've won ${points(r.limit)} off the bots today, the most you can. Bots are back tomorrow.`;
    case 'failed':
      return 'Something went wrong. Try again.';
  }
}

/** A key for the turn being played, to know a new turn (or wait) from the same one told again. */
const turnKey = (s: PokerState): string => `${s.phase}:${s.hand?.no ?? 0}:${s.hand?.street ?? ''}:${s.hand?.toAct ?? ''}:${s.hand?.currentBet ?? 0}`;

function render(): void {
  renderSeats(ctx);
  renderCenter(ctx);
  renderControls(ctx);
  renderSeatTimer(ctx);
}

/**
 * The server's tables: the table this page showed (if any) is forgotten. Not asked for (← Tables), it's
 * the connection coming back after dropping, which a player watching a table (not seated) isn't put
 * back at by the bot: the page joins it again.
 */
function showTables(tables: TableListing[]): void {
  const back = ctx.state && !ctx.leaving ? ctx.state.table : null;
  if (ctx.state) Object.assign(ctx, newContext(), { socket: ctx.socket });
  layout.hidden = true;
  hint.hidden = true;
  document.body.classList.add('pk-picking');
  tableNo.textContent = '';
  lobby.show(tables);
  if (back !== null) send(ctx, { t: 'join', table: back });
}

function showState(state: PokerState): void {
  const before = ctx.state;
  if (lobby.shown) lobby.hide();
  layout.hidden = false;
  hint.hidden = false;
  document.body.classList.remove('pk-picking');
  ctx.state = state;
  const key = turnKey(state);
  if (key !== ctx.turnKey) {
    ctx.turnKey = key;
    ctx.whole = Math.max(state.msLeft, 1);
    ctx.raiseTouched = false;
    if (state.move) play('turn');
  }
  ctx.deadline = state.msLeft > 0 ? performance.now() + state.msLeft : 0;
  tableNo.textContent = `Table ${state.table}`;
  // This player won something in a hand just over.
  const me = mySeat(ctx);
  const result = state.hand?.result;
  if (me && result?.won[me.seat] && ctx.wonHand !== state.hand?.no) {
    ctx.wonHand = state.hand?.no ?? 0;
    play('win');
  }
  if (before === null) showError(null);
  render();
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      ctx.socket?.finish();
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'tables':
      showTables(message.tables);
      return;
    case 'poker':
      showState(message.state);
      return;
    case 'refused':
      if (lobby.shown) lobby.error(refusalText(message));
      else showError(refusalText(message));
      return;
    case 'chat':
    case 'chats':
      chat.receive(message);
      return;
  }
}

soundButton('poker-muted', setMuted);
wireControls(ctx);
setInterval(() => {
  renderSeatTimer(ctx);
  renderStatus(ctx);
}, 200);
render();

if (watching) {
  setConn('Not watchable', 'bad');
  showMessage("Poker can't be watched", "Everyone's cards are their own. Head back home to watch someone play another game.");
} else if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Poker, or use the poker command in Discord.');
} else {
  ctx.socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => ({ t: 'hello', token: linkToken() }),
    receive,
  });
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${linkToken()}`, newTab: true });
}
