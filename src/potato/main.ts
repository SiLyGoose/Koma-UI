import './potato.css';
import { $, amount, clockText, coins, fillList, fillTitles, knockout, startEventPage, toaster, vaultLine, type Title } from '../vault-event/common';
import { ring, type Seat } from '../vault-event/ring';
import { roster } from '../vault-event/roster';
import { play } from '../vault-event/sfx';
import { trail, type TrailLine, type TrailPart } from '../vault-event/trail';
import type { ClientMessage, PotatoAnswer, PotatoEnded, PotatoLive, PotatoMove, PotatoState, ServerMessage } from '../protocol/potato';

/*
 * Hot Potato (the bot's events/games/hot-potato.ts): players join, then potatoes with a hidden fuse go round. The
 * holder presses Pass to toss it to someone else at random, or taps someone's face to pass it to them; pressing Pass
 * when it isn't yours grabs it (so mashing only ever hands you the potato). Whoever holds a potato when it goes off is
 * out and pays a fine; those left split the prize. Played in Discord and here alike, the one game: the bot holds it,
 * and tells every page the same. A page that didn't join in time, or a watch link, watches it (../vault-event/common.ts).
 *
 * The page draws the players as faces in a ring (../vault-event/ring.ts) round a thick arrow that turns to point at
 * whoever has the potato (at whoever it went off on, once it has), flies the potato from face to face as the bot says
 * it moved (PotatoLive.trail), and logs every move beside the game, one line each (../vault-event/trail.ts). The longer
 * a potato is out, the hotter the stage and the arrow get and the faster it ticks: from when it came out (servedAt),
 * never its fuse, which nobody is told.
 */

/** How long a potato takes to get as hot as the page draws it (ms). */
const HEAT_MS = 12_000;

const ui = {
  prize: $('prize'),
  middle: $('middle'),
  middleLabel: $('middle-label'),
  fine: $('fine'),
  vault: $('vault'),
  banner: $('banner'),
  stage: $('stage'),
  ring: $('ring'),
  pointer: $('pointer'),
  title: $('stage-title'),
  text: $('stage-text'),
  steps: $('steps'),
  ko: $('ko'),
  toast: $('toast'),
  actions: $('actions'),
  join: $<HTMLButtonElement>('join'),
  pass: $<HTMLButtonElement>('pass'),
  passNote: $('pass-note'),
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

let game: PotatoState | null = null;
const toast = toaster(ui.toast);
// (When the ring changes size, its faces are put round it again, and the arrow is aimed again at theirs.)
const seats = ring(ui.ring, 'circle', (id) => passTo(id), () => aim(game?.live ?? null));
const story = trail(ui.trail, 'Nothing yet: the first potato comes out when joining closes.');
const players = roster(ui.roster, ui.sideCount);
const lastStory = trail(ui.resultTrail, 'Nothing happened.');
/** Which way the arrow points (degrees, clockwise from right; it starts pointing up), kept turning the short way. */
let angle = -90;
/** The last move flown (its key), so each is flown once; null before the first state. */
let lastMove: string | null = null;
/** When the tick last sounded. */
let lastTick = 0;

const page = startEventPage<ServerMessage, ClientMessage>({
  name: 'Hot Potato',
  watchTag: $('watch-tag'),
  mutedKey: 'potato-muted',
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

/** Whether `id` is this page's own player (watching, nobody is: it's someone else's game). */
const isYou = (id: string | null): boolean => id !== null && id === game?.you && !page.watching;

/** A player's name (`You` for this page's own). */
function nameOf(id: string | null, names: ReadonlyMap<string, string> = namesNow()): string {
  if (id === null) return 'Nobody';
  if (isYou(id)) return 'You';
  return names.get(id) ?? 'Someone';
}

function namesNow(): Map<string, string> {
  const live = game?.live;
  if (live) return new Map(live.players.map((p) => [p.id, p.name]));
  const last = game?.last;
  return new Map([...(last?.winners ?? []), ...(last?.out ?? [])].map((p) => [p.id, p.name]));
}

const keyOf = (move: PotatoMove): string => `${move.blast}:${move.at}:${move.kind}:${move.from}:${move.to}`;

/** The moves since the last flown (none on the first state: the page has only just come). */
function newMoves(moves: readonly PotatoMove[]): PotatoMove[] {
  const newest = moves.at(-1);
  if (lastMove === null) {
    lastMove = newest ? keyOf(newest) : '';
    return [];
  }
  const at = moves.findIndex((move) => keyOf(move) === lastMove);
  // Not there (a new game, or more moved than the trail keeps): only the last few.
  const fresh = at < 0 ? moves.slice(-3) : moves.slice(at + 1);
  if (newest) lastMove = keyOf(newest);
  return fresh;
}

/** What changed that's worth a moment: the potato flying, and the news it brings. */
function newsOf(was: PotatoState | null, now: PotatoState): void {
  const live = now.live;
  if (live) newMoves(live.trail).forEach((move, i) => window.setTimeout(() => showMove(move, live), i * 140));
  // Handed the potato (not grabbed: that has its own word, from the bot's answer).
  const newest = live?.trail.at(-1);
  const grabbed = newest?.kind === 'grab' && newest.to === now.you;
  if (live && live.phase === 'potato' && live.holder === now.you && was?.live?.holder !== now.you && !grabbed && !page.watching) toast("🥔 It's yours! Pass it!", 'bad');
  // The last one gone off, and this page's player left standing: a fanfare.
  if (was?.live && !live && now.last?.kind === 'done' && now.last.winners.some((w) => w.id === now.you) && !page.watching) play('fanfare');
}

function showMove(move: PotatoMove, live: PotatoLive): void {
  switch (move.kind) {
    case 'serve':
      seats.fly(null, move.to, '🥔', 450);
      return play('serve');
    case 'pass':
      seats.fly(move.from, move.to, '🥔');
      return play('whoosh');
    case 'grab':
      seats.fly(move.from, move.to, '🥔', 260);
      if (move.to) seats.jolt(move.to);
      return play('oops');
    case 'blast': {
      play('boom');
      if (!move.from) return;
      seats.jolt(move.from);
      if (move.from !== game?.you) return;
      const name = live.players.find((p) => p.id === move.from)?.name ?? 'They';
      knockout(
        ui.ko,
        ui.stage,
        '💥 BOOM!',
        page.watching ? `${name} was holding potato ${move.blast}, and pays ${coins(live.fine)}.` : `You were holding potato ${move.blast}. You pay ${coins(live.fine)}.`,
      );
    }
  }
}

/** The log: a sentence a move, saying what happened (a potato coming out starts a new stretch of it). */
function trailLines(moves: readonly PotatoMove[], names: ReadonlyMap<string, string>): TrailLine[] {
  // A name, or "You" first in the sentence and "you" after.
  const who = (id: string | null, first = false): TrailPart => (isYou(id) ? { text: first ? 'You' : 'you', kind: 'you' } : { text: nameOf(id, names) });
  return moves.map((move): TrailLine => {
    switch (move.kind) {
      case 'serve':
        return { head: true, parts: [{ text: `🥔 Potato ${move.blast} came out to`, kind: 'head' }, who(move.to)] };
      case 'pass':
        return { parts: [who(move.from, true), { text: 'passed it to' }, who(move.to)] };
      case 'grab':
        return { parts: [who(move.to, true), { text: 'grabbed it from', kind: 'grab' }, who(move.from)] };
      case 'blast':
        return { parts: move.from ? [{ text: '💥 It went off on', kind: 'blast' }, who(move.from)] : [{ text: "💥 It went off in nobody's hands", kind: 'blast' }] };
    }
  });
}

/** Turns the arrow to whoever has the potato (or whoever it just went off on); with nobody, it rests, pointing up. */
function aim(live: PotatoLive | null): void {
  const target = live?.phase === 'potato' ? live.holder : live?.phase === 'blast' ? live.blown : null;
  const toward = target ? seats.angleTo(target) : null;
  ui.pointer.classList.toggle('resting', toward === null);
  ui.pointer.classList.toggle('blast', live?.phase === 'blast');
  // Grey, until the potato is on you (or, watching, on them): then red.
  ui.pointer.classList.toggle('mine', target !== null && target === game?.you);
  const wanted = toward ?? -90;
  // The short way round: never more than half a turn.
  angle += ((((wanted - angle) % 360) + 540) % 360) - 180;
  ui.pointer.style.setProperty('--angle', `${angle.toFixed(1)}deg`);
  sizeArrow();
}

/** How far the arrow reaches at its own size (px from the middle to its tip), at its hottest. */
const ARROW_REACH = 89 * 1.12;

/** Makes the arrow as long as the ring has room for: from the middle to just short of the nearest face. */
function sizeArrow(): void {
  // (The faces sit round an ellipse 44% of the ring's width across and 40% of its height up: ring.ts.)
  const radius = Math.min(ui.ring.clientWidth * 0.44, ui.ring.clientHeight * 0.4);
  const face = ui.ring.querySelector<HTMLElement>('.ve-seat-face')?.offsetWidth ?? 50;
  const room = radius - face / 2 - 12;
  ui.pointer.style.setProperty('--arrow-size', Math.max(0.55, Math.min(1.7, room / ARROW_REACH)).toFixed(2));
}

function renderSeats(state: PotatoState, live: PotatoLive): void {
  const mine = live.phase === 'potato' && live.holder === state.you && !page.watching;
  const list: Seat[] = live.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: state.avatars[p.id] ?? '',
    you: isYou(p.id),
    state: p.out ? 'out' : p.id === live.holder ? 'holder' : 'in',
    mark: p.out ? { text: `💥 ${p.blastedBy}`, kind: 'bad' } : p.passes > 0 ? { text: `${p.passes} ${p.passes === 1 ? 'pass' : 'passes'}`, kind: 'good' } : undefined,
    pickable: mine && p.id !== state.you && !p.out,
  }));
  seats.render(list);
  ui.ring.classList.toggle('picking', mine);
  aim(live);
}

function renderLive(state: PotatoState, live: PotatoLive): void {
  const me = live.players.find((p) => p.id === state.you);
  const mine = live.phase === 'potato' && live.holder === state.you && !page.watching;
  amount(ui.prize, live.prize);
  amount(ui.fine, live.fine);
  vaultLine(ui.vault, live.vault);

  // Who's watching, and why: not in this one, or out of it.
  const watchingOnly = !page.watching && !state.playing && live.phase !== 'joining';
  ui.banner.hidden = !(watchingOnly || (me?.out && !page.watching));
  ui.banner.textContent = me?.out ? "You're out: a potato went off in your hands. React, and watch who's left." : "You're watching: joining closed before you got here. You can still react.";

  ui.stage.hidden = false;
  ui.stage.classList.toggle('mine', mine);
  ui.stage.classList.toggle('blast', live.phase === 'blast');
  ui.join.hidden = !(live.phase === 'joining' && !state.playing && !page.watching);
  const passing = live.phase !== 'joining' && state.playing && !page.watching && me?.out !== true;
  ui.pass.hidden = !passing;
  ui.pass.disabled = live.phase !== 'potato';
  ui.pass.classList.toggle('mine', mine);
  ui.pass.classList.toggle('cold', passing && live.phase === 'potato' && !mine);
  ui.pass.textContent = mine ? 'PASS IT!' : 'Pass';
  // The trap stays (a press when it isn't yours grabs it), but nobody can say they weren't told.
  ui.passNote.hidden = !passing || live.phase !== 'potato';
  ui.passNote.classList.toggle('warn', !mine);
  ui.passNote.textContent = mine ? "Or tap someone's face to pick who gets it" : '⚠ Not yours: pressing grabs it';
  ui.steps.hidden = live.phase !== 'joining';
  renderSeats(state, live);

  if (live.phase === 'joining') {
    ui.middleLabel.textContent = 'Joining closes in';
    ui.title.textContent = state.playing ? "You're in!" : 'A Hot Potato is starting';
    const count = live.players.length;
    ui.text.textContent = `${count} ${count === 1 ? 'player has' : 'players have'} joined${count < state.minPlayers ? ` (it takes ${state.minPlayers})` : ''}. Up to ${live.blasts} ${live.blasts === 1 ? 'potato goes' : 'potatoes go'} off, then everyone left splits the prize.`;
  } else {
    ui.middleLabel.textContent = 'Potato';
    ui.middle.textContent = `${live.blast} of ${live.blasts}`;
    if (live.phase === 'potato') {
      ui.title.textContent = mine ? 'You have the potato! Pass it!' : `${nameOf(live.holder)} ${isYou(live.holder) ? 'have' : 'has'} the potato`;
      ui.text.textContent = mine ? "Pass tosses it at random, or tap someone's face to pass it to them. The fuse is hidden." : "Press Pass only when it's yours: otherwise you grab it. The fuse is hidden.";
    } else {
      ui.title.textContent = `Potato ${live.blast} of ${live.blasts} went off!`;
      const blown = live.blown;
      ui.text.textContent =
        blown === null
          ? "It went off in nobody's hands."
          : `${nameOf(blown)} ${isYou(blown) ? 'were' : 'was'} holding it, and ${isYou(blown) ? 'are' : 'is'} out.${live.blast < live.blasts ? ' The next potato is coming…' : ''}`;
    }
  }
  story.render(trailLines(live.trail, namesNow()));

  // Who's playing, on the right: those still in (the holder lit), then those blown up, the first blown at the bottom.
  ui.side.hidden = false;
  const left = live.players.filter((p) => !p.out);
  const out = live.players.filter((p) => p.out).sort((a, b) => b.blastedBy - a.blastedBy);
  const passes = (n: number): string => (n === 0 ? '' : `${n} ${n === 1 ? 'pass' : 'passes'}`);
  players.render(
    [
      ...left.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: state.avatars[p.id] ?? '',
        you: p.id === state.you,
        out: false,
        lit: p.id === live.holder,
        sub: passes(p.passes),
        status: p.id === live.holder ? { text: '🥔 Has it', kind: 'hot' as const } : { text: live.phase === 'joining' ? 'Joined' : 'In', kind: 'good' as const },
      })),
      ...out.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: state.avatars[p.id] ?? '',
        you: p.id === state.you,
        out: true,
        sub: passes(p.passes),
        status: { text: `💥 Potato ${p.blastedBy}`, kind: 'bad' as const },
      })),
    ],
    live.phase === 'joining' ? `${live.players.length}` : `${left.length} of ${live.players.length} in`,
  );
}

/**
 * The result's joke titles, from what happened (the trail: the last of it, in a long game): the most passes, the
 * most grabs, and who held it longest of those left standing.
 */
function titlesOf(last: PotatoEnded, you: string): Title[] {
  const names = new Map([...last.winners, ...last.out].map((p) => [p.id, p.name]));
  const passes = new Map<string, number>();
  const grabs = new Map<string, number>();
  const held = new Map<string, number>();
  let holder: string | null = null;
  let since = 0;
  for (const move of last.trail) {
    if (holder) held.set(holder, (held.get(holder) ?? 0) + (move.at - since));
    if (move.kind === 'pass' && move.from) passes.set(move.from, (passes.get(move.from) ?? 0) + 1);
    if (move.kind === 'grab' && move.to) grabs.set(move.to, (grabs.get(move.to) ?? 0) + 1);
    holder = move.kind === 'blast' ? null : move.to;
    since = move.at;
  }
  const most = (counts: ReadonlyMap<string, number>, among?: ReadonlySet<string>): [string, number] | null =>
    [...counts].filter(([id, n]) => n > 0 && (!among || among.has(id))).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? null;
  const mine = (id: string): boolean => id === you && !page.watching;
  const name = (id: string): string => (mine(id) ? 'You' : (names.get(id) ?? 'Someone'));
  const titles: Title[] = [];
  const hot = most(passes);
  if (hot) titles.push({ icon: '🔥', name: 'Hot Hands', who: name(hot[0]), why: `${hot[1]} ${hot[1] === 1 ? 'pass' : 'passes'}`, you: mine(hot[0]) });
  const butter = most(grabs);
  if (butter) titles.push({ icon: '🧈', name: 'Butterfingers', who: name(butter[0]), why: `grabbed it ${butter[1]} ${butter[1] === 1 ? 'time' : 'times'}`, you: mine(butter[0]) });
  const ice = most(held, new Set(last.winners.map((w) => w.id)));
  if (ice) titles.push({ icon: '🧊', name: 'Ice Veins', who: name(ice[0]), why: `held it ${(ice[1] / 1000).toFixed(1)}s and lived`, you: mine(ice[0]) });
  return titles;
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
    const fined = last.out.reduce((sum, o) => sum + o.fine, 0);
    ui.resultText.textContent = `${last.winners.length} ${last.winners.length === 1 ? 'player was' : 'players were'} still standing and split ${coins(last.prize)}.${won && !page.watching ? ` You won ${coins(won.won)}.` : ''}${fined > 0 ? ` ${coins(fined)} in fines went back into the vault.` : ''}`;
  }
  fillTitles(ui.resultTitles, last.kind === 'done' ? titlesOf(last, state.you) : []);
  fillList(ui.resultWinners, last.winners.map((w) => ({ text: `${w.name} +${w.won.toLocaleString('en-US')}`, you: w.id === state.you })), 'Nobody');
  fillList(ui.resultOut, last.out.map((o) => ({ text: `${o.name} paid ${o.fine.toLocaleString('en-US')} · potato ${o.blast}`, you: o.id === state.you })), 'Nobody');
  // (Nothing happened in one that never started: no log on the result then.)
  lastStory.render(trailLines(last.trail, namesNow()));
  if (ui.resultTrail.parentElement) ui.resultTrail.parentElement.hidden = last.trail.length === 0;
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
    for (const part of [ui.stage, ui.side, ui.banner, ui.join, ui.pass, ui.passNote, ui.vault]) part.hidden = true;
    ui.prize.textContent = '–';
    ui.fine.textContent = '–';
    ui.middleLabel.textContent = 'Joining closes in';
    ui.middle.textContent = '–';
    renderResult(state);
  }
  frame();
}

/** Ten times a second: the joining clock, and how hot the potato going round has got (with its tick). */
function frame(): void {
  const live = game?.live;
  if (live?.phase === 'joining') ui.middle.textContent = clockText(live.joinEndsAt - Date.now());
  const now = Date.now();
  const heat = live?.phase === 'potato' && live.servedAt > 0 ? Math.min(1, Math.max(0, (now - live.servedAt) / HEAT_MS)) : 0;
  ui.stage.style.setProperty('--heat', heat.toFixed(3));
  if (live?.phase !== 'potato') return;
  // From a tick every 0.65 s to one every 0.18 s.
  if (now - lastTick >= 650 - 470 * heat) {
    lastTick = now;
    play('tick', heat);
  }
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
/** The holder tapped someone's face: it goes to them. */
function passTo(id: string): void {
  if (ui.pass.hidden || ui.pass.disabled || !ui.pass.classList.contains('mine')) return;
  if (!page.send({ t: 'pass', to: id })) toast('Not connected right now. Try again in a moment.');
}
ui.pass.addEventListener('click', pass);
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button, [contenteditable="true"]')) return;
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  pass();
});
setInterval(frame, 100);
