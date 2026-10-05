import { coin } from '../../shared/coin';
import { points } from '../../shared/format';
import { avatarImg } from '../avatar';
import { showingResults, type TableContext } from '../context';
import { signedPoints, sumBets } from '../format';

/** The list beside the table: who is at it, their balance, and what they have down (or how they did). */
export function renderPlayers<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { ui, state, game, watching } = ctx;
  ui.players.textContent = '';
  if (!state) return;
  ui.tableNo.textContent = `· Table ${state.table}`;
  ui.seatCount.textContent = `${state.seats.length}/${state.maxSeats}`;
  const results = showingResults(ctx);
  for (const seat of state.seats) {
    const li = document.createElement('li');
    li.className = 'tb-seat';
    if (seat.userId === state.you) li.classList.add('you');
    // The name is cut short if it's long, but the "you" tag after it always shows.
    const name = document.createElement('div');
    name.className = 'tb-seat-name';
    const nameText = document.createElement('span');
    nameText.textContent = seat.name;
    name.append(nameText);
    if (state.phase === 'betting' && seat.ready && state.seats.length > 1) {
      const ready = document.createElement('span');
      ready.className = 'tb-ready';
      ready.textContent = '✓';
      ready.title = `Voted to ${game.words.verb} now`;
      name.append(ready);
    }
    if (seat.userId === state.you) {
      const tag = document.createElement('span');
      tag.className = 'tb-you';
      tag.textContent = watching ? 'watching' : 'you';
      name.append(tag);
    }
    const money = document.createElement('div');
    money.className = 'tb-seat-balance';
    money.append(points(seat.balance), coin());
    const status = document.createElement('div');
    status.className = 'tb-seat-status';
    const down = sumBets(seat.userId === state.you ? ctx.bets : seat.bets);
    if (results && seat.result) {
      status.textContent = signedPoints(seat.result.net);
      status.classList.add(seat.result.net > 0 ? 'won' : seat.result.net < 0 ? 'lost' : 'even');
    } else if (results && seat.refused) {
      status.textContent = 'Couldn’t cover the bet';
      status.classList.add('lost');
    } else if (down > 0) {
      status.textContent = `${points(down)} down`;
      status.classList.add('down');
    } else {
      status.textContent = state.phase === 'betting' ? 'Placing chips…' : 'Sat out';
    }
    const text = document.createElement('div');
    text.className = 'tb-seat-text';
    text.append(name, money);
    li.append(avatarImg(seat, 'tb-seat-avatar'), text, status);
    ui.players.append(li);
  }
  for (let i = state.seats.length; i < state.maxSeats; i++) {
    const li = document.createElement('li');
    li.className = 'tb-seat empty';
    li.textContent = 'Empty seat';
    ui.players.append(li);
  }
}
