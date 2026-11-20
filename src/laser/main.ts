import './laser.css';
import { $, amount, clockText, coins, el, fillList, reactionText, startEventPage, toaster } from '../vault-event/common';
import type { ClientMessage, LaserAnswer, LaserCaught, LaserLive, LaserState, ServerMessage } from '../protocol/laser';

/*
 * Laser Grid (the bot's events/games/laser-grid.ts): players join, then play rounds. Each round shows a row of buttons,
 * all alike; after a random wait the laser fires, and one of them turns into Duck!. Everyone still in has to press it
 * before the round's time runs out (less every round). Too early, the wrong one or too slow, and you're caught. Only a
 * player's first press in a round counts. Played in Discord and here alike, the one game: the bot holds it, times every
 * press itself, and only says where Duck! is once the laser fires. A press says the round and the screen it was made
 * on, so it is judged by what the player saw. A page that didn't join in time, or a watch link, watches it.
 */

const WHY: Record<LaserCaught, string> = { early: 'too early', wrong: 'wrong button', late: 'too slow' };

const ui = {
  prize: $('prize'),
  prizeSub: $('prize-sub'),
  middle: $('middle'),
  middleLabel: $('middle-label'),
  middleSub: $('middle-sub'),
  fine: $('fine'),
  banner: $('banner'),
  stage: $('stage'),
  title: $('stage-title'),
  text: $('stage-text'),
  row: $('row'),
  bar: $('bar'),
  barFill: $('bar-fill'),
  toast: $('toast'),
  join: $<HTMLButtonElement>('join'),
  players: $('players'),
  in: $('in'),
  out: $('out'),
  idle: $('idle'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  resultWinners: $('result-winners'),
  resultOut: $('result-out'),
};

let game: LaserState | null = null;
/** The round this page has pressed in already (its first press is the one that counts), and which slot. */
let pressed: { round: number; slot: number } | null = null;
/** Which round and phase the bar was last started for. */
let barFor = '';
const toast = toaster(ui.toast);

const page = startEventPage<ServerMessage, ClientMessage>({
  name: 'Laser Grid',
  watchTag: $('watch-tag'),
  mutedKey: 'laser-muted',
  receive(message) {
    if (message.t === 'state') {
      game = message.state;
      render();
    } else if (message.t === 'answer') answered(message);
  },
});

const seconds = (ms: number): string => `${Number((ms / 1000).toFixed(2))}s`;
const nameOf = (live: LaserLive, id: string): string => (id === game?.you && !page.watching ? 'You' : (live.players.find((p) => p.id === id)?.name ?? 'Someone'));

/** Whether this page can press the grid now: playing, still in, not watching, not pressed this round yet. */
function canPress(state: LaserState, live: LaserLive): boolean {
  const me = live.players.find((p) => p.id === state.you);
  return !page.watching && state.playing && me !== undefined && me.caughtFor === null && (live.phase === 'ready' || live.phase === 'fire') && pressed?.round !== live.round;
}

function renderRow(state: LaserState, live: LaserLive): void {
  const fired = live.phase === 'fire' || live.phase === 'roundOver';
  const enabled = canPress(state, live);
  ui.row.style.setProperty('--slots', String(live.slots));
  // The fake ducks: as green as Duck! (the same look, so only the word gives them away), saying something else.
  const decoys = new Map((fired ? live.decoys : []).map((decoy) => [decoy.slot, decoy.label]));
  const buttons: HTMLButtonElement[] = [];
  for (let slot = 0; slot < live.slots; slot++) {
    const duck = fired && slot === live.duckSlot;
    const decoy = decoys.get(slot);
    const green = duck || decoy !== undefined;
    const label = duck ? 'Duck!' : (decoy ?? '⚡');
    const button = el('button', `lg-slot${fired ? (green ? ' duck' : ' laser') : ''}${pressed?.round === live.round && pressed.slot === slot ? ' pressed' : ''}`, fired ? label : '·');
    button.type = 'button';
    button.disabled = !enabled;
    button.setAttribute('aria-label', fired ? (green ? `${label} (key ${slot + 1})` : `Laser (key ${slot + 1})`) : `Button ${slot + 1}`);
    button.addEventListener('click', () => press(slot));
    buttons.push(button);
  }
  ui.row.replaceChildren(...buttons);
}

/** The bar of time left: started from full when the laser fires (the page's own clock: the bot's times the press). */
function renderBar(live: LaserLive): void {
  const key = `${live.round}:${live.phase}`;
  ui.bar.hidden = live.phase !== 'fire';
  if (live.phase !== 'fire' || barFor === key) return;
  barFor = key;
  ui.barFill.style.transition = 'none';
  ui.barFill.style.transform = 'scaleX(1)';
  void ui.barFill.offsetWidth;
  ui.barFill.style.transition = `transform ${live.windowMs}ms linear`;
  ui.barFill.style.transform = 'scaleX(0)';
}

function renderLive(state: LaserState, live: LaserLive): void {
  const me = live.players.find((p) => p.id === state.you);
  amount(ui.prize, live.prize);
  ui.prizeSub.textContent = live.phase === 'joining' && live.bonusPerPlayer > 0 ? `+${live.bonusPerPlayer.toLocaleString('en-US')} a player` : '';
  amount(ui.fine, live.fine);

  const watchingOnly = !page.watching && !state.playing && live.phase !== 'joining';
  const caught = !page.watching && me?.caughtFor != null;
  ui.banner.hidden = !(watchingOnly || caught);
  ui.banner.textContent = caught ? `You're caught (${WHY[me?.caughtFor as LaserCaught]}, round ${me?.caughtRound}). Watch who's left.` : "You're watching: joining closed before you got here.";

  ui.stage.hidden = false;
  ui.stage.classList.toggle('fire', live.phase === 'fire');
  ui.join.hidden = !(live.phase === 'joining' && !state.playing && !page.watching);
  ui.row.hidden = live.phase === 'joining';

  if (live.phase === 'joining') {
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middleSub.textContent = '';
    ui.title.textContent = state.playing ? "You're in!" : 'The laser grid is on';
    const count = live.players.length;
    ui.text.textContent = `${count} ${count === 1 ? 'player has' : 'players have'} joined. ${live.rounds} rounds: wait for Duck!, then press it before time runs out. Everyone never caught splits the prize by speed: the fastest gets the most.`;
  } else {
    ui.middleLabel.textContent = 'Round';
    ui.middle.textContent = `${live.round} of ${live.rounds}`;
    ui.middleSub.textContent = `${seconds(live.windowMs)} to duck`;
    if (live.phase === 'ready') {
      ui.title.textContent = 'Wait for it…';
      ui.text.textContent = "Don't press anything yet: one button turns into Duck! when the laser fires. Watch out for fake ducks: green, but they don't say Duck!.";
    } else if (live.phase === 'fire') {
      ui.title.textContent = '⚡ DUCK!';
      ui.text.textContent = `Press Duck! within ${seconds(live.windowMs)}.`;
    } else {
      const caughtNow = live.players.filter((p) => p.caughtRound === live.round).length;
      ui.title.textContent = caughtNow === 0 ? 'Nobody was caught!' : `${caughtNow} caught`;
      ui.text.textContent = live.fastest ? `Fastest: ${nameOf(live, live.fastest.id)} in ${reactionText(live.fastest.ms)}. The next round is coming…` : 'The next round is coming…';
    }
    renderRow(state, live);
  }
  renderBar(live);

  ui.players.hidden = false;
  fillList(
    ui.in,
    live.players.filter((p) => p.caughtFor === null).map((p) => ({ text: `${p.name}${p.bestMs !== null ? ` · best ${reactionText(p.bestMs)}` : ''}`, you: p.id === state.you })),
    'Nobody',
  );
  fillList(
    ui.out,
    live.players
      .filter((p) => p.caughtFor !== null)
      .sort((a, b) => b.caughtRound - a.caughtRound)
      .map((p) => ({ text: `${p.name} · ${WHY[p.caughtFor as LaserCaught]} (round ${p.caughtRound})`, you: p.id === state.you })),
    'Nobody yet',
  );
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

function renderResult(state: LaserState): void {
  const last = state.last;
  ui.result.hidden = last === null;
  if (!last) return;
  const won = last.winners.find((w) => w.id === state.you);
  if (last.kind === 'nobody') {
    ui.resultTitle.textContent = 'Nobody showed up';
    ui.resultText.textContent = 'Nobody joined the last Laser Grid. The money stayed in the vault.';
  } else if (last.kind === 'failed') {
    ui.resultTitle.textContent = 'The grid fell apart';
    ui.resultText.textContent = 'Something went wrong while paying out the last one, so nobody was paid or fined.';
  } else if (last.winners.length === 0) {
    ui.resultTitle.textContent = 'Everyone got caught';
    ui.resultText.textContent = `The laser caught the last of them in round ${last.lastRound}. The money stayed in the vault.`;
  } else {
    ui.resultTitle.textContent = won && !page.watching ? 'You made it through!' : 'Through the grid!';
    // The winners come first place first: the least time ducking in all won the most, each place after a little less.
    const place = last.winners.findIndex((w) => w.id === state.you) + 1;
    ui.resultText.textContent =
      last.winners.length === 1
        ? `1 player made it through and took all ${coins(last.prize)}.${won && !page.watching ? ' You won it all.' : ''}`
        : `${last.winners.length} players made it through and split ${coins(last.prize)} by speed: the fastest in all got the most.${won && !page.watching ? ` You came ${ordinal(place)} and won ${coins(won.won)}.` : ''}`;
  }
  fillList(
    ui.resultWinners,
    last.winners.map((w, i) => ({ text: `${i + 1}. ${w.name} +${w.won.toLocaleString('en-US')} · ${reactionText(w.totalMs)} in all`, you: w.id === state.you })),
    'Nobody',
  );
  fillList(
    ui.resultOut,
    last.caught.map((c) => ({ text: `${c.name} paid ${c.fine.toLocaleString('en-US')} · ${WHY[c.caughtFor]} (round ${c.round})`, you: c.id === state.you })),
    'Nobody',
  );
}

function render(): void {
  const state = game;
  if (!state) return;
  const live = state.live;
  ui.idle.hidden = live !== null;
  if (live) {
    ui.result.hidden = true;
    renderLive(state, live);
  } else {
    pressed = null;
    for (const part of [ui.stage, ui.players, ui.banner, ui.join, ui.bar]) part.hidden = true;
    ui.prize.textContent = '–';
    ui.prizeSub.textContent = '';
    ui.fine.textContent = '–';
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middle.textContent = '–';
    ui.middleSub.textContent = '';
    renderResult(state);
  }
  renderClock();
}

function renderClock(): void {
  const live = game?.live;
  if (live?.phase === 'joining') ui.middle.textContent = clockText(live.joinEndsAt - Date.now());
}

function press(slot: number): void {
  const state = game;
  const live = state?.live;
  if (!state || !live || !canPress(state, live) || slot < 0 || slot >= live.slots) return;
  const message: ClientMessage = { t: 'press', round: live.round, phase: live.phase === 'fire' ? 'go' : 'wait', slot };
  if (!page.send(message)) return toast('Not connected right now. Try again in a moment.');
  pressed = { round: live.round, slot };
  renderRow(state, live);
}

function answered(answer: LaserAnswer): void {
  if (answer.to === 'join') {
    if (answer.ok) return toast("You're in! The first round starts when joining closes.", 'good');
    return toast(answer.reason === 'already' ? 'You already joined.' : 'Too late: joining has closed.', 'bad');
  }
  switch (answer.result) {
    case 'ducked':
      return toast(`Ducked in ${reactionText(answer.ms)}!`, 'good');
    case 'early':
      return toast("Too early! The laser hadn't fired yet. You're caught.", 'bad');
    case 'wrong':
      return toast("Wrong button! You're caught.", 'bad');
    case 'late':
      return toast("Too slow! You're caught.", 'bad');
    case 'stale':
      return toast('That was a button from an earlier round.');
    case 'closed':
      return toast('This round is over. Wait for the next one.');
    case 'already':
      return toast("You already pressed this round, and it can't be changed.");
    case 'out':
      return toast("You're out: the laser already caught you.");
    case 'notPlaying':
      return toast("You're not in this game.");
  }
}

ui.join.addEventListener('click', () => {
  if (!page.send({ t: 'join' })) toast('Not connected right now. Try again in a moment.');
});
// The number keys press the buttons (1 is the first).
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]')) return;
  const key = /^Numpad\d$/.test(event.code) ? event.code.slice(-1) : event.key;
  if (!/^[1-9]$/.test(key)) return;
  event.preventDefault();
  press(Number(key) - 1);
});
setInterval(renderClock, 250);
