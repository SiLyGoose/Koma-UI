import { setConn } from '../shared/ui/frame/frame';
import { points } from '../shared/util';
import { gameSocket, hideMessage, showMessage } from '../shared/game';
import { showWatchers, showWatching, watchAway, watchBack } from '../shared/ui';
import { mySeat, showError, type TableContext } from './context';
import type { BetRefusal, ClientMessage, ErrorCode, ServerMessage, TableState } from './protocol';
import { buildRack } from './chips/rack';
import { render } from './render';
import { playOut, showRound } from './round';

/** Says `message` to the bot; false when not connected right now. */
export function send<S extends string, R, X>(ctx: TableContext<S, R, X>, message: ClientMessage<S>): boolean {
  return ctx.socket?.send(message) ?? false;
}

/** Connects to the bot at `server`, as `token` (to play, or to watch). */
export function connect<S extends string, R, X>(ctx: TableContext<S, R, X>, server: string, token: string): void {
  ctx.socket = gameSocket<ServerMessage<S, R, X>, ClientMessage<S>>({
    server,
    hello: () => (ctx.watching ? { t: 'watch', token } : { t: 'hello', token }),
    receive: (message) => receive(ctx, message),
    onOpen: () => {
      ctx.seq = 0;
      ctx.adoptBets = true;
    },
  });
}

function errors<S extends string, R, X>(ctx: TableContext<S, R, X>): Record<ErrorCode, [string, string]> {
  const { game } = ctx;
  return {
    bad_token: ['This link has run out', `Open ${game.name} again from the games page or from Discord for a new one.`],
    replaced: ['Opened somewhere else', `${game.title} is open in another tab or window. Only one can play at a time.`],
    bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
    not_playing: ['Nobody to watch', `They aren't playing ${game.name} right now. Pick someone else from the online list.`],
    full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
  };
}

function refusalText(r: BetRefusal): string {
  switch (r.reason) {
    case 'too_big':
      return `The most on the table is ${points(r.limit)} a round.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'closed':
      return 'Too late: the betting for this round is over.';
  }
}

/** The table as the bot says it is now. */
function showState<S extends string, R, X>(ctx: TableContext<S, R, X>, next: TableState<S, R, X>): void {
  const before = ctx.state;
  ctx.state = next;
  ctx.deadline = performance.now() + next.msLeft;
  if (next.phase === 'betting' && (before?.phase !== 'betting' || next.msLeft > ctx.bettingWhole)) ctx.bettingWhole = Math.max(next.msLeft, 1);
  if (!ctx.rackBuilt) {
    buildRack(ctx);
    ctx.rackBuilt = true;
  }

  // While betting, this page's chips are what the player put down (the bot is sent each change); the
  // bot's word on them is taken when a change was refused, when watching, and outside the betting.
  const me = mySeat(ctx);
  if (me && (ctx.watching || next.phase !== 'betting' || before?.phase !== 'betting' || ctx.adoptBets)) ctx.bets = { ...me.bets };
  ctx.adoptBets = false;
  if (next.phase === 'betting' && before?.phase !== 'betting') {
    ctx.history = [];
    showError(ctx, null);
  }

  // A new round dealt: play it out. Joining (or back) mid-round: it at once. Betting after one: it, faded.
  if (next.phase === 'dealing' && next.round && next.round.no !== ctx.shownRound) {
    if (before === null || before.phase === 'dealing') showRound(ctx, next.round, false);
    else void playOut(ctx, next.round);
  } else if (next.phase === 'betting' && next.round && (ctx.shownRound !== next.round.no || before?.phase === 'dealing')) {
    showRound(ctx, next.round, true);
  }
  render(ctx);
}

function receive<S extends string, R, X>(ctx: TableContext<S, R, X>, message: ServerMessage<S, R, X>): void {
  switch (message.t) {
    case 'error': {
      ctx.socket?.finish();
      const all = errors(ctx);
      const [title, text] = all[message.code] ?? all.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'table':
      showState(ctx, message.state);
      break;
    case 'refused':
      showError(ctx, refusalText(message));
      ctx.adoptBets = true;
      ctx.history = [];
      return;
    case 'watching':
      ctx.watched = message.player;
      showWatching(ctx.watched);
      render(ctx);
      return;
    case 'watchers':
      showWatchers(message.count);
      return;
    case 'away':
      showWatching(ctx.watched, true);
      watchAway(
        () => showMessage(`${ctx.watched} left the table`, `${ctx.watched} isn't playing ${ctx.game.name} any more. Head back home to see who's online and watch someone else.`),
        hideMessage,
      );
      return;
  }
  if (ctx.watching && ctx.watched) {
    showWatching(ctx.watched);
    watchBack();
  }
}
