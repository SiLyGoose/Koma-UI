import './potato.css';
import { $, amount, clockText, coins, fillList, startEventPage, toaster } from '../vault-event/common';
import type { ClientMessage, PotatoAnswer, PotatoLive, PotatoState, ServerMessage } from '../protocol/potato';

/*
 * Hot Potato (the bot's events/games/hot-potato.ts): players join, then potatoes with a hidden fuse go round. The
 * holder presses Pass to toss it to someone else at random; pressing Pass when it isn't yours grabs it (so mashing
 * only ever hands you the potato). Whoever holds a potato when it goes off is out and pays a fine; those left split
 * the prize. Played in Discord and here alike, the one game: the bot holds it, and tells every page the same.
 * A page that didn't join in time, or a watch link, watches it (../vault-event/common.ts).
 */

const ui = {
  prize: $('prize'),
  middle: $('middle'),
  middleLabel: $('middle-label'),
  fine: $('fine'),
  banner: $('banner'),
  stage: $('stage'),
  art: $('stage-art'),
  title: $('stage-title'),
  text: $('stage-text'),
  toast: $('toast'),
  actions: $('actions'),
  join: $<HTMLButtonElement>('join'),
  pass: $<HTMLButtonElement>('pass'),
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

let game: PotatoState | null = null;
const toast = toaster(ui.toast);

const page = startEventPage<ServerMessage, ClientMessage>({
  name: 'Hot Potato',
  watchTag: $('watch-tag'),
  mutedKey: 'potato-muted',
  receive(message) {
    if (message.t === 'state') {
      const was = game?.live ?? null;
      game = message.state;
      newsOf(was, game.live);
      render();
    } else if (message.t === 'answer') answered(message);
  },
});

/** A player's name (`you` for this page's own). */
function nameOf(live: PotatoLive, id: string | null): string {
  if (id === null) return 'Nobody';
  if (id === game?.you && !page.watching) return 'You';
  return live.players.find((p) => p.id === id)?.name ?? 'Someone';
}

/** What changed that's worth a moment's news: the potato landing on this page's player. */
function newsOf(was: PotatoLive | null, now: PotatoLive | null): void {
  if (!now || !game || page.watching) return;
  if (now.phase === 'potato' && now.holder === game.you && was?.holder !== game.you) toast('🥔 It\'s yours! Pass it!', 'bad');
}

function renderLive(state: PotatoState, live: PotatoLive): void {
  const me = live.players.find((p) => p.id === state.you);
  const mine = live.phase === 'potato' && live.holder === state.you;
  amount(ui.prize, live.prize);
  amount(ui.fine, live.fine);

  // Who's watching, and why: not in this one, or out of it.
  const watchingOnly = !page.watching && !state.playing && live.phase !== 'joining';
  ui.banner.hidden = !(watchingOnly || (me?.out && !page.watching));
  ui.banner.textContent = me?.out ? "You're out: a potato went off in your hands. Watch who's left." : "You're watching: joining closed before you got here.";

  ui.stage.hidden = false;
  ui.stage.classList.toggle('mine', mine && !page.watching);
  ui.stage.classList.toggle('blast', live.phase === 'blast');
  ui.join.hidden = !(live.phase === 'joining' && !state.playing && !page.watching);
  ui.pass.hidden = live.phase === 'joining' || !state.playing || page.watching || me?.out === true;
  ui.pass.disabled = live.phase !== 'potato';
  ui.pass.classList.toggle('mine', mine);

  if (live.phase === 'joining') {
    ui.middleLabel.textContent = 'Joining closes in';
    ui.art.textContent = '🥔';
    ui.title.textContent = state.playing ? "You're in!" : 'A Hot Potato is starting';
    const count = live.players.length;
    ui.text.textContent = `${count} ${count === 1 ? 'player has' : 'players have'} joined${count < state.minPlayers ? ` (it takes ${state.minPlayers})` : ''}. Up to ${live.blasts} ${live.blasts === 1 ? 'potato goes' : 'potatoes go'} off, then everyone left splits the prize.`;
  } else {
    ui.middleLabel.textContent = 'Potato';
    ui.middle.textContent = `${live.blast} of ${live.blasts}`;
    if (live.phase === 'potato') {
      ui.art.textContent = '🥔';
      ui.title.textContent = mine && !page.watching ? 'You have the potato! Pass it!' : `${nameOf(live, live.holder)} ${live.holder === state.you && !page.watching ? 'have' : 'has'} the potato`;
      ui.text.textContent = "Press Pass only when it's yours: otherwise you grab it. The fuse is hidden.";
    } else {
      ui.art.textContent = '💥';
      ui.title.textContent = `Potato ${live.blast} of ${live.blasts} went off!`;
      const blown = live.blown;
      ui.text.textContent = blown === null ? "It went off in nobody's hands." : `${nameOf(live, blown)} ${blown === state.you && !page.watching ? 'were' : 'was'} holding it, and ${blown === state.you && !page.watching ? 'are' : 'is'} out.${live.blast < live.blasts ? ' The next potato is coming…' : ''}`;
    }
  }

  ui.players.hidden = false;
  const left = live.players.filter((p) => !p.out);
  fillList(
    ui.in,
    left.map((p) => ({
      text: `${p.id === live.holder ? '🥔 ' : ''}${p.name}${p.passes > 0 ? ` · ${p.passes} ${p.passes === 1 ? 'pass' : 'passes'}` : ''}`,
      you: p.id === state.you,
      className: p.id === live.holder ? 'holder' : '',
    })),
    'Nobody',
  );
  const out = live.players.filter((p) => p.out).sort((a, b) => a.blastedBy - b.blastedBy);
  fillList(ui.out, out.map((p) => ({ text: `💥 ${p.name} · potato ${p.blastedBy}`, you: p.id === state.you })), 'Nobody yet');
}

function renderResult(state: PotatoState): void {
  const last = state.last;
  ui.result.hidden = last === null;
  if (!last) return;
  const won = last.winners.find((w) => w.id === state.you);
  if (last.kind === 'notEnough') {
    ui.resultTitle.textContent = 'Not enough players';
    ui.resultText.textContent = 'The last Hot Potato needed at least 2 players. The money stayed in the vault.';
  } else if (last.kind === 'failed') {
    ui.resultTitle.textContent = 'The game fell apart';
    ui.resultText.textContent = 'Something went wrong while paying out the last one, so nobody was paid or fined.';
  } else {
    ui.resultTitle.textContent = won && !page.watching ? 'You made it!' : 'The last potato went off';
    ui.resultText.textContent = `${last.winners.length} ${last.winners.length === 1 ? 'player was' : 'players were'} still standing and split ${coins(last.prize)}.${won && !page.watching ? ` You won ${coins(won.won)}.` : ''}`;
  }
  fillList(ui.resultWinners, last.winners.map((w) => ({ text: `${w.name} +${w.won.toLocaleString('en-US')}`, you: w.id === state.you })), 'Nobody');
  fillList(ui.resultOut, last.out.map((o) => ({ text: `${o.name} paid ${o.fine.toLocaleString('en-US')} · potato ${o.blast}`, you: o.id === state.you })), 'Nobody');
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
    ui.stage.hidden = true;
    ui.players.hidden = true;
    ui.banner.hidden = true;
    ui.join.hidden = true;
    ui.pass.hidden = true;
    ui.prize.textContent = '–';
    ui.fine.textContent = '–';
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middle.textContent = '–';
    renderResult(state);
  }
  renderClock();
}

function renderClock(): void {
  const live = game?.live;
  if (live?.phase === 'joining') ui.middle.textContent = clockText(live.joinEndsAt - Date.now());
}

function answered(answer: PotatoAnswer): void {
  if (answer.to === 'join') {
    if (answer.ok) return toast("You're in! The first potato comes out when joining closes.", 'good');
    return toast(answer.reason === 'already' ? 'You already joined.' : 'Too late: joining has closed.', 'bad');
  }
  switch (answer.result) {
    case 'passed':
      return toast(`Tossed it to ${answer.name}!`, 'good');
    case 'grabbed':
      return toast(`It wasn't yours! You grabbed it from ${answer.name}. Pass it on!`, 'bad');
    case 'tooFast':
      return; // (A double press: the first counted.)
    case 'out':
      return toast("You're out: a potato already went off in your hands.");
    case 'notPlaying':
      return toast("You're not in this game.");
    case 'noPotato':
      return toast('No potato right now. The next one is coming.');
  }
}

ui.join.addEventListener('click', () => {
  if (!page.send({ t: 'join' })) toast('Not connected right now. Try again in a moment.');
});
const pass = (): void => {
  if (ui.pass.hidden || ui.pass.disabled) return;
  if (!page.send({ t: 'pass' })) toast('Not connected right now. Try again in a moment.');
};
ui.pass.addEventListener('click', pass);
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button, [contenteditable="true"]')) return;
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  pass();
});
setInterval(renderClock, 250);
