import './laser.css';
import { $, amount, clockText, coins, el, fillList, fillTitles, knockout, reactionText, startEventPage, toaster, vaultLine, type Title } from '../vault-event/common';
import { ring, type Seat } from '../vault-event/ring';
import { roster } from '../vault-event/roster';
import { play } from '../vault-event/sfx';
import { trail, type TrailLine } from '../vault-event/trail';
import type { ClientMessage, LaserAnswer, LaserCaught, LaserEnded, LaserLive, LaserPlayer, LaserState, ServerMessage } from '../protocol/laser';

/*
 * Laser Grid (the bot's events/games/laser-grid.ts): players join, then play rounds. Each round shows a row of buttons,
 * all alike; after a random wait the laser fires, and one of them turns into Duck!. Everyone still in has to press it
 * before the round's time runs out (less every round). Too early, the wrong one or too slow, and you're caught. Only a
 * player's first press in a round counts. Played in Discord and here alike, the one game: the bot holds it, times every
 * press itself, and only says where Duck! is once the laser fires. A press says the round and the screen it was made
 * on, so it is judged by what the player saw. A page that didn't join in time, or a watch link, watches it.
 *
 * The page draws the players as a row of faces over the grid (../vault-event/ring.ts), each marked with how their press
 * this round went (LaserPlayer.now: never which button), logs every round and every press in it beside the game, one line
 * each (../vault-event/trail.ts), and lists those still in by their time in all, the place their share is paid by.
 */

const WHY: Record<LaserCaught, string> = { early: 'too early', wrong: 'wrong button', late: 'too slow' };

const ui = {
  prize: $('prize'),
  prizeSub: $('prize-sub'),
  middle: $('middle'),
  middleLabel: $('middle-label'),
  middleSub: $('middle-sub'),
  fine: $('fine'),
  vault: $('vault'),
  banner: $('banner'),
  stage: $('stage'),
  ring: $('ring'),
  title: $('stage-title'),
  text: $('stage-text'),
  row: $('row'),
  bar: $('bar'),
  barFill: $('bar-fill'),
  ko: $('ko'),
  toast: $('toast'),
  join: $<HTMLButtonElement>('join'),
  trail: $('trail'),
  side: $('side'),
  roster: $('roster'),
  sideCount: $('side-count'),
  idle: $('idle'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  resultTitles: $('result-titles'),
  resultTrail: $('result-trail'),
  resultWinners: $('result-winners'),
  resultOut: $('result-out'),
};

let game: LaserState | null = null;
/** The round this page has pressed in already (its first press is the one that counts), and which slot. */
let pressed: { round: number; slot: number } | null = null;
/** Which round and phase the bar was last started for, and the sounds last played for. */
let barFor = '';
let soundFor = '';
/** Whether the page's player has had their knocked-out moment this game. */
let knocked = false;
/** Each round's lines of the log, as the page saw it (a page that came late has only the rounds since). */
const rounds = new Map<number, TrailLine[]>();
const toast = toaster(ui.toast);
const seats = ring(ui.ring, 'row');
const story = trail(ui.trail, 'Nothing yet: the first round starts when joining closes.');
const players = roster(ui.roster, ui.sideCount);
const lastStory = trail(ui.resultTrail, 'This page saw none of it.');
/** The log so far: every round seen, oldest first. */
const logLines = (): TrailLine[] => [...rounds.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, lines]) => lines);

const page = startEventPage<ServerMessage, ClientMessage>({
  name: 'Laser Grid',
  watchTag: $('watch-tag'),
  mutedKey: 'laser-muted',
  reactions: { bar: $('reacts'), layer: $('floats') },
  receive(message) {
    if (message.t === 'state') {
      const was = game;
      game = message.state;
      newsOf(was, game);
      render();
    } else if (message.t === 'answer') answered(message);
  },
});

const seconds = (ms: number): string => `${Number((ms / 1000).toFixed(2))}s`;
const isYou = (id: string): boolean => id === game?.you && !page.watching;
const nameOf = (live: LaserLive, id: string): string => (isYou(id) ? 'You' : (live.players.find((p) => p.id === id)?.name ?? 'Someone'));

/** Whether this page can press the grid now: playing, still in, not watching, not pressed this round yet. */
function canPress(state: LaserState, live: LaserLive): boolean {
  const me = live.players.find((p) => p.id === state.you);
  return !page.watching && state.playing && me !== undefined && me.caughtFor === null && (live.phase === 'ready' || live.phase === 'fire') && pressed?.round !== live.round;
}

/** The sounds of a round starting and the laser firing, a fanfare for winning, and the knocked-out moment. */
function newsOf(was: LaserState | null, now: LaserState): void {
  const live = now.live;
  if (!live || live.phase === 'joining') {
    knocked = false;
    if (live) rounds.clear();
  }
  if (live) {
    const key = `${live.round}:${live.phase}`;
    if (key !== soundFor) {
      soundFor = key;
      if (live.phase === 'ready') play('charge');
      if (live.phase === 'fire') play('zap');
    }
    const me = live.players.find((p) => p.id === now.you);
    const caught = me ? caughtBy(me) : null;
    if (me && caught && !knocked) {
      knocked = true;
      play('buzz');
      seats.jolt(me.id);
      const small = page.watching ? `${me.name} was caught in round ${live.round}.` : `Round ${live.round}. You pay ${coins(live.fine)}.`;
      knockout(ui.ko, ui.stage, `⚡ Caught: ${WHY[caught]}`, small);
    }
  }
  if (was?.live && !live && now.last?.kind === 'done' && now.last.winners.some((w) => w.id === now.you) && !page.watching) play('fanfare');
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

/** What a player's face says this round: their duck's time, or why they were caught. */
function markOf(live: LaserLive, p: LaserPlayer): Seat['mark'] {
  if (p.now?.result === 'ducked') return { text: `✔ ${p.now.ms === null ? '' : reactionText(p.now.ms)}`.trim(), kind: 'good' };
  if (p.now) return { text: `✖ ${WHY[p.now.result]}`, kind: 'bad' };
  if (p.caughtFor) return { text: `✖ round ${p.caughtRound}`, kind: 'bad' };
  return live.phase === 'fire' ? { text: '…', kind: 'good' } : undefined;
}

/** How a player was caught: before (caughtFor), or by their press this round, which the bot settles at its end. */
const caughtBy = (p: LaserPlayer): LaserCaught | null => p.caughtFor ?? (p.now && p.now.result !== 'ducked' ? p.now.result : null);

/**
 * A player's time in all over the rounds that are over. While a round is going, some have pressed in it and some
 * haven't yet: counting this round's ducks would put those who haven't first.
 */
const settledMs = (live: LaserLive, p: LaserPlayer): number => (live.phase === 'roundOver' || p.now?.result !== 'ducked' ? p.totalMs : p.totalMs - (p.now.ms ?? 0));

/** Whether there are places yet: once a round is over (in the first, nobody has a time in all to go by). */
const placed = (live: LaserLive): boolean => live.phase !== 'joining' && (live.round > 1 || live.phase === 'roundOver');

/** Those still in, fastest in all first (their place, as it's paid). */
function standing(live: LaserLive): LaserPlayer[] {
  return live.players
    .filter((p) => caughtBy(p) === null)
    .sort((a, b) => settledMs(live, a) - settledMs(live, b) || (a.bestMs ?? Infinity) - (b.bestMs ?? Infinity) || (a.id < b.id ? -1 : 1));
}

/** This round's lines of the log: the round, then a line a press, fastest duck first, then those caught. */
function roundLines(live: LaserLive): TrailLine[] {
  const pressedNow = live.players.filter((p) => p.now !== null);
  const ducked = pressedNow.filter((p) => p.now?.result === 'ducked').sort((a, b) => (a.now?.ms ?? 0) - (b.now?.ms ?? 0));
  const caught = pressedNow.filter((p) => p.now?.result !== 'ducked');
  const who = (id: string): TrailLine['parts'][number] => (isYou(id) ? { text: 'You', kind: 'you' } : { text: nameOf(live, id) });
  return [
    { head: true, parts: [{ text: `⚡ Round ${live.round}`, kind: 'head' }] },
    ...ducked.map((p): TrailLine => ({ parts: [who(p.id), { text: `ducked${p.now?.ms == null ? '' : ` in ${reactionText(p.now.ms)}`} ✔`, kind: 'good' }] })),
    ...caught.map((p): TrailLine => ({ parts: [who(p.id), { text: `${CAUGHT_FOR[p.now?.result as LaserCaught]} and ${isYou(p.id) ? 'were' : 'was'} caught ✖`, kind: 'bad' }] })),
  ];
}

/** What a caught player did, as the log says it. */
const CAUGHT_FOR: Record<LaserCaught, string> = { early: 'pressed too early', wrong: 'pressed the wrong button', late: "didn't press in time" };

function renderLive(state: LaserState, live: LaserLive): void {
  const me = live.players.find((p) => p.id === state.you);
  amount(ui.prize, live.prize);
  ui.prizeSub.textContent = live.phase === 'joining' && live.bonusPerPlayer > 0 ? `+${live.bonusPerPlayer.toLocaleString('en-US')} a player` : '';
  amount(ui.fine, live.fine);
  vaultLine(ui.vault, live.vault);

  const watchingOnly = !page.watching && !state.playing && live.phase !== 'joining';
  const caught = !page.watching && me?.caughtFor != null;
  ui.banner.hidden = !(watchingOnly || caught);
  ui.banner.textContent = caught
    ? `You're caught (${WHY[me?.caughtFor as LaserCaught]}, round ${me?.caughtRound}). React, and watch who's left.`
    : "You're watching: joining closed before you got here. You can still react.";

  ui.stage.hidden = false;
  ui.stage.classList.toggle('fire', live.phase === 'fire');
  ui.join.hidden = !(live.phase === 'joining' && !state.playing && !page.watching);
  ui.row.hidden = live.phase === 'joining';
  seats.render(
    live.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: state.avatars[p.id] ?? '',
      you: isYou(p.id),
      state: p.caughtFor !== null && (p.caughtRound < live.round || live.phase === 'roundOver') ? 'out' : 'in',
      mark: markOf(live, p),
      pickable: false,
    })),
  );

  if (live.phase === 'joining') {
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middleSub.textContent = '';
    ui.title.textContent = state.playing ? "You're in!" : 'The laser grid is on';
    const count = live.players.length;
    ui.text.textContent = `${count} ${count === 1 ? 'player has' : 'players have'} joined. ${live.rounds} rounds: wait for Duck!, then press it before time runs out. Everyone never caught splits the prize by speed: the fastest in all gets the most.`;
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
    rounds.set(live.round, roundLines(live));
  }
  renderBar(live);
  story.render(logLines());

  // Who's playing, on the right: those still in by their place (their time in all), then those caught, the last caught first.
  ui.side.hidden = false;
  const inNow = standing(live);
  const outNow = live.players
    .filter((p) => caughtBy(p) !== null)
    .map((p) => ({ p, round: p.caughtFor ? p.caughtRound : live.round }))
    .sort((a, b) => b.round - a.round);
  players.render(
    [
      ...inNow.map((p, i) => ({
        id: p.id,
        name: p.name,
        avatar: state.avatars[p.id] ?? '',
        you: p.id === state.you,
        out: false,
        ...(p.bestMs !== null && { sub: `${reactionText(p.totalMs)} in all` }),
        status: ((): { text: string; kind?: 'good' } => {
          if (live.phase === 'joining') return { text: 'Joined', kind: 'good' };
          // Their place (once there are places), and this round's duck.
          const place = placed(live) ? `#${i + 1}` : '';
          const duck = p.now?.result === 'ducked' && p.now.ms !== null ? `✔ ${reactionText(p.now.ms)}` : '';
          if (duck) return { text: [place, duck].filter(Boolean).join(' · '), kind: 'good' };
          return { text: place || (live.phase === 'fire' ? '…' : 'In') };
        })(),
      })),
      ...outNow.map(({ p, round }) => ({
        id: p.id,
        name: p.name,
        avatar: state.avatars[p.id] ?? '',
        you: p.id === state.you,
        out: true,
        sub: `round ${round}`,
        status: { text: `✖ ${WHY[caughtBy(p) as LaserCaught]}`, kind: 'bad' as const },
      })),
    ],
    live.phase === 'joining' ? `${live.players.length}` : `${inNow.length} of ${live.players.length} in`,
  );
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** The result's joke titles: the fastest single duck of those through, the first to jump the gun, and who fell in the very last round. */
function titlesOf(last: LaserEnded, you: string): Title[] {
  const mine = (id: string): boolean => id === you && !page.watching;
  const name = (id: string, fallback: string): string => (mine(id) ? 'You' : fallback);
  const titles: Title[] = [];
  const fastest = last.winners.filter((w) => w.bestMs !== null).sort((a, b) => (a.bestMs ?? 0) - (b.bestMs ?? 0))[0];
  if (fastest && fastest.bestMs !== null) titles.push({ icon: '⚡', name: 'Fastest Duck', who: name(fastest.id, fastest.name), why: `${reactionText(fastest.bestMs)} in one press`, you: mine(fastest.id) });
  const gun = last.caught.filter((c) => c.caughtFor === 'early').sort((a, b) => a.round - b.round)[0];
  if (gun) titles.push({ icon: '🔫', name: 'Jumped the Gun', who: name(gun.id, gun.name), why: `pressed before the laser, round ${gun.round}`, you: mine(gun.id) });
  const close = last.winners.length > 0 ? last.caught.find((c) => c.round === last.lastRound) : undefined;
  if (close) titles.push({ icon: '😬', name: 'So Close', who: name(close.id, close.name), why: `caught in the last round (${WHY[close.caughtFor]})`, you: mine(close.id) });
  return titles;
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
    const fined = last.caught.reduce((sum, c) => sum + c.fine, 0);
    ui.resultText.textContent =
      (last.winners.length === 1
        ? `1 player made it through and took all ${coins(last.prize)}.${won && !page.watching ? ' You won it all.' : ''}`
        : `${last.winners.length} players made it through and split ${coins(last.prize)} by speed: the fastest in all got the most.${won && !page.watching ? ` You came ${ordinal(place)} and won ${coins(won.won)}.` : ''}`) +
      (fined > 0 ? ` ${coins(fined)} in fines went back into the vault.` : '');
  }
  fillTitles(ui.resultTitles, last.kind === 'done' ? titlesOf(last, state.you) : []);
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
  // With none going, the last one's result comes before its story.
  document.getElementById('app')?.classList.toggle('ve-ended', live === null);
  if (live) {
    ui.result.hidden = true;
    renderLive(state, live);
  } else {
    pressed = null;
    for (const part of [ui.stage, ui.side, ui.banner, ui.join, ui.bar, ui.vault]) part.hidden = true;
    ui.prize.textContent = '–';
    ui.prizeSub.textContent = '';
    ui.fine.textContent = '–';
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middle.textContent = '–';
    ui.middleSub.textContent = '';
    renderResult(state);
    lastStory.render(logLines());
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
      play('ding');
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
