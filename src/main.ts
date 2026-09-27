import './style.css';
import { barSlot, setConn, soundButton } from './frame';
import { apiFromSocket, showWatchers, showWatching, startLive } from './live';
import './mines.css';
import type { ClientMessage, ErrorCode, Lobby, RunEvent, RunState, ServerMessage, StartRefusal } from './protocol';

/*
 * The mine, played in the browser like Stake's Mines. The link from Discord (or the front page)
 * carries, after the #, the player's token (t) and the bot's WebSocket address (s). The bot holds the
 * board and decides every pick; this page sends the bets, picks and cash outs, and shows what it is told.
 *
 * Between rounds the panel takes a bet and a number of mines; during a round the tiles can be turned
 * over one at a time (the next only once the bot has answered), and the button cashes out.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  panel: $<HTMLFormElement>('panel'),
  balance: $('balance'),
  bet: $<HTMLInputElement>('bet'),
  betRange: $('bet-range'),
  mines: $<HTMLSelectElement>('mines'),
  action: $<HTMLButtonElement>('action'),
  random: $<HTMLButtonElement>('random'),
  mult: $('mult'),
  nextLabel: $('next-label'),
  next: $('next'),
  gems: $('gems'),
  maxPayout: $('max-payout'),
  error: $('error'),
  idle: $('idle'),
  board: $('board'),
  result: $('result'),
  resultMult: $('result-mult'),
  resultText: $('result-text'),
  message: $('message'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
};

const TILES = 25;
const points = (n: number): string => n.toLocaleString('en-US');
const times = (n: number): string => `${n.toFixed(2)}x`;

/**
 * A gem like the bot's :komatreasure:: facets split by gaps (the open tile's colour), each in its own
 * pastel iridescent gradient (in the page once, see GEM_GRADIENTS). It shimmers too (mines.css).
 */
const GEM_SVG =
  '<svg class="mx-gem" viewBox="0 0 64 64" aria-hidden="true"><g stroke="#071824" stroke-width="2.6" stroke-linejoin="round">' +
  '<path fill="url(#mx-ir-1)" d="M4 24 14 10l9 14z"/><path fill="url(#mx-ir-2)" d="M14 10h18l-9 14z"/><path fill="url(#mx-ir-3)" d="M23 24l9-14 9 14z"/>' +
  '<path fill="url(#mx-ir-4)" d="M32 10h18l-9 14z"/><path fill="url(#mx-ir-5)" d="M41 24l9-14 10 14z"/>' +
  '<path fill="url(#mx-ir-6)" d="M4 24h19l9 34z"/><path fill="url(#mx-ir-7)" d="M23 24h18l-9 34z"/><path fill="url(#mx-ir-8)" d="M41 24h19L32 58z"/></g></svg>';

/** Each facet's gradient: which way it runs (x1 y1 x2 y2, across the facet) and its colours. */
const GEM_GRADIENTS: [string, string[]][] = [
  ['0 1 1 0', ['#8fd8ff', '#b99bff']],
  ['0 0 1 1', ['#c49bff', '#ff9bd6']],
  ['0 1 1 0', ['#ff9fd0', '#ffc79a']],
  ['0 0 1 1', ['#ff9bd6', '#ffd39a']],
  ['0 0 1 1', ['#ffd39a', '#d4f59a']],
  ['0 0 1 1', ['#a99bff', '#ff9fd6']],
  ['0 0 .4 1', ['#ff9fcf', '#ffc58f', '#f7ef8f']],
  ['0 0 1 1', ['#fbe98f', '#bdf59a', '#8ff0c8']],
];
document.body.insertAdjacentHTML(
  'afterbegin',
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${GEM_GRADIENTS.map(([dir, colors], k) => {
    const [x1, y1, x2, y2] = dir.split(' ');
    const stops = colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('');
    return `<linearGradient id="mx-ir-${k + 1}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  }).join('')}</defs></svg>`,
);
const MINE_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="36" r="22" fill="#e9113c"/><circle cx="23" cy="29" r="6" fill="#ff8aa0" opacity=".7"/><path d="M44 18l6-6" stroke="#b30b2b" stroke-width="5" stroke-linecap="round"/><path d="M50 12l4-2M52 16l5 1M48 8l1-5" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/></svg>';

/** The bot's currency, :zeiucoin:, to go after an amount. */
function coin(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = 'zeiucoin';
  img.className = 'coin';
  return img;
}

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
/** A link to play has t=, a link to watch someone play has w= (watch-only: nothing here can be pressed). */
const watchToken = params.get('w');
const watching = watchToken !== null;
const token = params.get('t') ?? watchToken;
const server = params.get('s');
/** Whose game this page watches, once the bot has said. */
let watched = '';

function showMessage(title: string, text: string): void {
  ui.messageTitle.textContent = title;
  ui.messageText.textContent = text;
  ui.message.hidden = false;
}

// ---------------------------------------------------------------------------
// What is on screen

let lobby: Lobby | null = null;
/** The round on the board: being played, or the last one played (shown until the next bet). */
let run: RunState | null = null;
/** The message waiting for the bot's answer: a start, a pick (of `index`), or a cash out. */
let pending: { seq: number; index?: number | 'random' } | null = null;
let lastActivity = performance.now();

const playing = (): boolean => run?.status === 'playing';

/** The multiplier after `gems` gems with `mines` mines, worked out the way the bot does (for showing what a round can pay). */
function multiplierFor(l: Lobby, mines: number, gems: number): number {
  if (gems <= 0) return 1;
  const span = l.maxMines - l.minMines;
  const edge = l.edgeFewest + (l.edgeMost - l.edgeFewest) * (span > 0 ? (mines - l.minMines) / span : 1);
  let odds = 1;
  for (let i = 0; i < gems; i++) odds *= (TILES - i) / (TILES - mines - i);
  return Math.min(l.maxMultiplier, Math.floor((1 - edge) * odds * 100 + 1e-9) / 100);
}

/** The most a round with `mines` mines can pay, as a multiplier: every gem found, or the cap, whichever comes first. */
const bestMultiplier = (l: Lobby, mines: number): number => multiplierFor(l, mines, TILES - mines);

/** The most a bet of `bet` can win with `mines` mines, shown as "12,400". */
function maxPayoutText(bet: number, mines: number): string {
  if (!lobby || !(bet > 0)) return '–';
  return `${points(Math.round(bet * bestMultiplier(lobby, mines)))} (${times(bestMultiplier(lobby, mines))})`;
}

const tiles: HTMLButtonElement[] = Array.from({ length: TILES }, (_, i) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'mx-tile';
  tile.setAttribute('aria-label', `Tile ${i + 1}`);
  tile.disabled = true;
  tile.addEventListener('click', () => pick(i));
  ui.board.append(tile);
  return tile;
});

function setBalance(balance: number | null | undefined): void {
  if (balance === null || balance === undefined) return;
  ui.balance.textContent = points(balance);
}

function renderBoard(): void {
  const over = run !== null && run.status !== 'playing';
  tiles.forEach((tile, i) => {
    const seen = run?.tiles[i] ?? null;
    const shown = seen !== null;
    const turned = run?.revealed[i] ?? false;
    tile.classList.toggle('open', shown);
    tile.classList.toggle('dim', shown && over && !turned);
    tile.classList.toggle('boom', seen === 'mine' && turned);
    tile.classList.toggle('pending', pending?.index === i);
    if (tile.dataset.shows !== (seen ?? '')) {
      tile.innerHTML = seen === 'gem' ? GEM_SVG : seen === 'mine' ? MINE_SVG : '';
      tile.dataset.shows = seen ?? '';
    }
    tile.disabled = watching || !playing() || shown || pending !== null;
  });

  // How the round ended.
  if (run && over && run.bet > 0) {
    const lost = run.status === 'boom' || run.payout === 0;
    ui.result.classList.toggle('lost', lost);
    ui.resultMult.textContent = lost ? '💣 Boom' : times(run.multiplier);
    const why = run.status === 'idle' ? ' (left alone)' : run.status === 'done' ? (run.multiplier >= run.maxMultiplier ? ' (max win)' : ' (board cleared)') : '';
    if (run.status === 'failed' && run.payout === null) ui.resultText.textContent = 'Cashed out at the multiplier reached';
    else if (lost) ui.resultText.textContent = `−${points(run.bet)}`;
    else ui.resultText.replaceChildren(`+${points(run.payout ?? 0)} `, coin(), why);
    ui.result.hidden = false;
  } else {
    ui.result.hidden = true;
  }
}

function renderPanel(): void {
  const live = playing();
  const busy = pending !== null || watching;
  const inputs = [ui.bet, ui.mines, ...document.querySelectorAll<HTMLButtonElement>('[data-bet]')];
  for (const el of inputs) el.disabled = live || busy || !lobby;
  ui.random.hidden = !live || watching;
  ui.random.disabled = busy;
  if (live && run) {
    ui.action.textContent = run.gems === 0 ? 'Cash out' : `Cash out ${points(run.cashOut)}`;
    ui.action.disabled = busy || run.gems === 0;
    ui.mult.textContent = times(run.multiplier);
    ui.nextLabel.textContent = 'Next gem';
    ui.next.textContent = run.next === null ? '–' : times(run.next);
    ui.gems.textContent = `${run.gems} / ${TILES - run.mines}`;
    ui.maxPayout.textContent = maxPayoutText(run.bet, run.mines);
  } else {
    ui.action.textContent = 'Bet';
    ui.action.disabled = busy || !lobby;
    ui.mult.textContent = times(1);
    ui.nextLabel.textContent = 'First gem';
    ui.next.textContent = lobby ? times(multiplierFor(lobby, Number(ui.mines.value), 1)) : '–';
    ui.gems.textContent = lobby ? `0 / ${TILES - Number(ui.mines.value)}` : '–';
    ui.maxPayout.textContent = maxPayoutText(Math.floor(Number(ui.bet.value)), Number(ui.mines.value));
    ui.idle.hidden = true;
  }
  if (watching) ui.action.textContent = watched ? `Watching ${watched}` : 'Watching';
}

function render(): void {
  renderBoard();
  renderPanel();
}

function showError(text: string | null): void {
  ui.error.hidden = text === null;
  ui.error.textContent = text ?? '';
}

// ---------------------------------------------------------------------------
// The lobby

function showLobby(next: Lobby): void {
  const first = lobby === null;
  lobby = next;
  setBalance(next.balance);
  ui.betRange.textContent = `(${points(next.minBet)} to ${points(next.maxBet)})`;
  ui.bet.min = String(next.minBet);
  ui.bet.max = String(next.maxBet);
  if (first || !ui.bet.value) ui.bet.value = String(Math.max(next.minBet, Math.min(next.lastBet ?? next.minBet, next.maxBet)));
  if (first) {
    ui.mines.textContent = '';
    for (let m = next.minMines; m <= next.maxMines; m++) ui.mines.append(new Option(String(m), String(m)));
    ui.mines.value = String(next.lastMines ?? 3);
  }
  render();
}

function refusalText(r: StartRefusal): string {
  switch (r.reason) {
    case 'too_small':
      return `The smallest bet is ${points(r.limit)}.`;
    case 'too_big':
      return `The biggest bet is ${points(r.limit)}.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'busy':
      return 'You already have a round going. Finish it first (in Discord or another tab).';
  }
}

ui.mines.addEventListener('change', render);
ui.bet.addEventListener('input', renderPanel);

for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-bet]')) {
  chip.addEventListener('click', () => {
    if (!lobby) return;
    const now = Math.floor(Number(ui.bet.value)) || lobby.minBet;
    const most = Math.min(lobby.maxBet, Math.max(lobby.minBet, lobby.balance));
    const next = chip.dataset.bet === 'half' ? Math.floor(now / 2) : chip.dataset.bet === 'double' ? now * 2 : most;
    ui.bet.value = String(Math.max(lobby.minBet, Math.min(next, lobby.maxBet)));
    renderPanel();
  });
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let seq = 0;
let finished = false;
let retries = 0;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the mine again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The mine is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  not_playing: ['Nobody to watch', "They aren't playing Mines right now. Pick someone else from the online list."],
  full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
};

function send(message: ClientMessage): boolean {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function startRound(): void {
  if (watching || !lobby || playing() || pending) return;
  const bet = Math.floor(Number(ui.bet.value));
  if (!Number.isFinite(bet) || bet < 1) return showError('Type how much to bet.');
  seq += 1;
  if (!send({ t: 'start', bet, mines: Number(ui.mines.value), seq })) return;
  pending = { seq };
  showError(null);
  lastActivity = performance.now();
  render();
}

function pick(index: number | 'random'): void {
  if (watching || !playing() || pending) return;
  seq += 1;
  if (!send({ t: 'pick', index, seq })) return;
  pending = { seq, index };
  lastActivity = performance.now();
  render();
}

function cashOut(): void {
  if (watching || !playing() || pending || !run || run.gems === 0) return;
  seq += 1;
  if (!send({ t: 'cashout', seq })) return;
  pending = { seq };
  render();
}

/** The sounds of turning over a tile (public/mines/sfx), each played over the last if they come fast. */
const SOUNDS = {
  gem: new Audio(`${import.meta.env.BASE_URL}mines/sfx/gem-select.mp3`),
  boom: new Audio(`${import.meta.env.BASE_URL}mines/sfx/mine-select.mp3`),
};
for (const sound of Object.values(SOUNDS)) sound.preload = 'auto';

/** Sound off (the frame's sound button). */
let muted = false;
soundButton('mines-muted', (on) => (muted = on));

function playSound(sound: HTMLAudioElement): void {
  if (muted) return;
  const copy = sound.cloneNode() as HTMLAudioElement;
  copy.play().catch(() => {
    // Sound blocked or missing: play on without it.
  });
}

/** What a pick turned over (`picked`: an answer to the page's own pick, not a reconnect). */
function applyEvent(event: RunEvent | undefined, picked: boolean): void {
  if (picked && (event?.kind === 'gem' || event?.kind === 'boom')) playSound(SOUNDS[event.kind]);
  if (event?.kind !== 'boom') return;
  const wrap = ui.board.parentElement as HTMLElement;
  wrap.classList.remove('shake');
  void wrap.offsetWidth;
  wrap.classList.add('shake');
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      finished = true;
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'lobby':
      showLobby(message.lobby);
      return;
    case 'refused':
      if (pending?.seq === message.seq) pending = null;
      showError(refusalText(message));
      render();
      return;
    case 'watching':
      watched = message.player;
      showWatching(watched);
      render();
      return;
    case 'watchers':
      showWatchers(message.count);
      return;
    case 'away':
      showWatching(watched, true);
      return;
    case 'state': {
      // Watching, every pick is theirs: its sound plays too. And they're back if they were away.
      const picked = watching ? message.event !== undefined : message.seq !== 0 && pending?.seq === message.seq;
      if (watching && watched) showWatching(watched);
      if (message.seq === 0 || pending?.seq === message.seq) pending = null;
      run = message.state;
      setBalance(message.state.balance);
      lastActivity = performance.now();
      applyEvent(message.event, picked);
      render();
    }
  }
}

function connect(): void {
  if (!token || !server) return;
  setConn(retries === 0 ? 'Connecting…' : 'Reconnecting…', '');
  const ws = new WebSocket(server);
  socket = ws;
  ws.addEventListener('open', () => {
    retries = 0;
    setConn('Connected', 'ok');
    send(watching ? { t: 'watch', token } : { t: 'hello', token });
  });
  ws.addEventListener('message', (e) => {
    try {
      receive(JSON.parse(String(e.data)) as ServerMessage);
    } catch (err) {
      console.error('Could not read a message from the bot:', err);
    }
  });
  ws.addEventListener('close', () => {
    if (socket === ws) socket = null;
    if (finished) return;
    // Dropped (a phone asleep, a network blip): try again a few times, waiting longer each time.
    pending = null;
    render();
    if (retries >= 6) {
      setConn('Disconnected', 'bad');
      showMessage('Lost the connection', 'Reload this page, or open the mine again for a new link.');
      return;
    }
    const wait = Math.min(8000, 500 * 2 ** retries++);
    setConn('Reconnecting…', 'bad');
    setTimeout(connect, wait);
  });
}

// ---------------------------------------------------------------------------
// Input

ui.panel.addEventListener('submit', (e) => {
  e.preventDefault();
  if (playing()) cashOut();
  else startRound();
});
ui.random.addEventListener('click', () => pick('random'));

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.code === 'KeyR' && playing() && document.activeElement !== ui.bet) {
    e.preventDefault();
    pick('random');
  }
});

// A round left alone cashes out by itself: say so when it's getting close.
setInterval(() => {
  if (watching || !playing() || !run) return;
  const left = Math.ceil((run.idleMs - (performance.now() - lastActivity)) / 1000);
  ui.idle.hidden = left > 15;
  if (!ui.idle.hidden) ui.idle.textContent = `💤 Cashing out by itself in ${Math.max(0, left)}s unless you pick a tile.`;
}, 250);

// ---------------------------------------------------------------------------
// Start

render();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Mines, or use the mine command in Discord.');
} else {
  connect();
  // Who else is on the site, and a way to watch them (asked with this page's own link).
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
}
