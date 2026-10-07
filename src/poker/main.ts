import '../shared/style.css';
import './poker.css';
import { barSlot, setConn, soundButton, titleExtra } from '../shared/ui/frame/frame';
import { gameSocket, server, showMessage, token, watching } from '../shared/game';
import { apiFromSocket, startLive } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { points } from '../shared/util';
import { renderCenter, renderStatus } from './center';
import { mySeat, newContext, showError, type PokerContext } from './context';
import { renderControls, wireControls } from './controls';
import type { ClientMessage, ErrorCode, PokerState, Refusal, ServerMessage } from './protocol';
import { renderSeats, renderSeatTimer } from './seats';
import { play } from './sfx';

/*
 * Texas hold'em in the browser. The link from Discord (or the front page) carries, after the #, the
 * player's token (t) and the bot's WebSocket address (s); the bot puts them at a table, which this
 * page shows: the eight seats round the felt (seats.ts), the board and the pot (center.ts), and what
 * they can do (controls.ts). The bot runs the game; this page only draws what it's told and sends
 * the player's moves. It is only ever told this player's cards (and anyone's that are face up), so
 * nothing here gives anyone else's away. That's also why poker can't be watched.
 */

const ctx: PokerContext = newContext();
const tableNo = titleExtra('pk-table-no');

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
    case 'not_now':
      return "That can't be done right now.";
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

function showState(state: PokerState): void {
  const before = ctx.state;
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
    case 'poker':
      showState(message.state);
      return;
    case 'refused':
      showError(refusalText(message));
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
  const link = token;
  ctx.socket = gameSocket<ServerMessage, ClientMessage>({
    server,
    hello: () => ({ t: 'hello', token: link }),
    receive,
  });
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: true });
}
