import './style.css';
import { boardSize, drawScene, tileOrigin, TILE, type Scene } from './draw';
import type { ClientMessage, Direction, ErrorCode, Lobby, MineOre, RunEvent, RunState, ServerMessage, StartRefusal } from './protocol';

/*
 * The mine, played in the browser. The link from Discord carries, after the #, the player's token
 * (t) and the bot's WebSocket address (s). The bot holds the field and decides every dig; this page
 * sends the moves and draws what it is told.
 *
 * Between runs the page shows the lobby: the balance and a bet box to start the next run. A link
 * opened while a run is going (started in Discord, or in another tab) picks that run up.
 *
 * Walking over tiles already dug can't change anything, so the page moves the miner at once and
 * tells the bot afterwards. A dig waits for the bot's answer (the tile shakes until it comes), and
 * no other move is taken until then.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const g = canvas.getContext('2d') as CanvasRenderingContext2D;
const ui = {
  conn: $('conn'),
  mult: $('mult'),
  cash: $('cash'),
  balance: $('balance'),
  field: $('field'),
  ores: $('ores'),
  dyn: $('dyn'),
  log: $('log'),
  idle: $('idle'),
  cashout: $<HTMLButtonElement>('cashout'),
  wrap: $('board-wrap'),
  floaters: $('floaters'),
  overlay: $('overlay'),
  overlayTitle: $('overlay-title'),
  overlayText: $('overlay-text'),
  lobby: $<HTMLFormElement>('lobby'),
  bet: $<HTMLInputElement>('bet'),
  betRange: $('bet-range'),
  start: $<HTMLButtonElement>('start'),
  lobbyError: $('lobby-error'),
  lobbyInfo: $('lobby-info'),
  legend: $('legend'),
  message: $('message'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
};

const ORE_NAME: Record<MineOre, string> = { coal: 'Coal', iron: 'Iron', gold: 'Gold', diamond: 'Diamond' };
const ORE_EMOJI: Record<MineOre, string> = { coal: '⚫', iron: '⛓️', gold: '🟡', diamond: '💎' };
const ORE_TEXT: Record<MineOre, string> = { coal: '#cfd2d8', iron: '#ecd6c4', gold: '#f5c542', diamond: '#7fe6fb' };

const points = (n: number): string => n.toLocaleString('en-US');
const times = (n: number): string => `${Number(n.toFixed(2))}x`;

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t');
const server = params.get('s');

function showMessage(title: string, text: string): void {
  ui.messageTitle.textContent = title;
  ui.messageText.textContent = text;
  ui.message.hidden = false;
}

// ---------------------------------------------------------------------------
// What is on screen

/** The run on the board: being played, or the last one played (shown under the lobby). */
let state: RunState | null = null;
let lobby: Lobby | null = null;
const scene: Scene = { state: null as unknown as RunState, miner: { col: 0, row: 0 }, digging: null, blastAt: null };
/** Where the miner is headed, in tiles (it slides there). */
let target = { col: 0, row: 0 };
let lastActivity = performance.now();
let canvasSize = 0;

const playing = (): boolean => state?.status === 'digging';

function resizeCanvas(size: number): void {
  if (size === canvasSize) return;
  canvasSize = size;
  const css = boardSize(size);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(css * ratio);
  canvas.height = Math.round(css * ratio);
  g.setTransform(canvas.width / css, 0, 0, canvas.height / css, 0, 0);
}

function place(pos: number, size: number, snap: boolean): void {
  target = { col: pos % size, row: Math.floor(pos / size) };
  if (snap) scene.miner = { ...target };
}

function bump(el: HTMLElement): void {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function effect(el: HTMLElement, name: 'shake' | 'flash'): void {
  el.classList.remove(name);
  void el.offsetWidth;
  el.classList.add(name);
}

/** Text floating up from tile `pos`. */
function floatText(pos: number, text: string, color: string): void {
  if (!state) return;
  const full = boardSize(state.size);
  const { x, y } = tileOrigin(pos, state.size);
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${((x + TILE / 2) / full) * 100}%`;
  el.style.top = `${((y + TILE / 2) / full) * 100}%`;
  ui.floaters.append(el);
  setTimeout(() => el.remove(), 1000);
}

function setBalance(balance: number | null): void {
  if (balance === null) return;
  const before = ui.balance.textContent;
  ui.balance.textContent = points(balance);
  if (before !== '–' && before !== ui.balance.textContent) bump(ui.balance);
}

function renderHud(): void {
  if (!state) return;
  const before = ui.mult.textContent;
  ui.mult.textContent = times(state.multiplier);
  if (playing() && before !== ui.mult.textContent) bump(ui.mult);
  ui.cash.textContent = playing() ? points(state.cashOut) : '–';
  ui.field.textContent = `#${state.field}`;
  ui.ores.textContent = String(state.oresLeft);
  ui.dyn.textContent = `🧨 ${state.dynamite}`;
  setBalance(state.balance);
  ui.cashout.disabled = !playing();
  ui.cashout.textContent = playing() ? `💰 Cash out ${points(state.cashOut)}` : '💰 Cash out';
}

function renderLegend(values: Record<MineOre, number>, fieldBonus: number): void {
  const ores = (Object.keys(ORE_NAME) as MineOre[]).map((ore) => `${ORE_EMOJI[ore]} ${ORE_NAME[ore]} +${times(values[ore])}`);
  ui.legend.textContent = '';
  for (const text of [...ores, `✨ Clear a field +${times(fieldBonus)}`]) {
    const span = document.createElement('span');
    span.textContent = text;
    ui.legend.append(span);
  }
}

/** The overlay's heading and text: how the last run went, or a welcome when there wasn't one. */
function renderOverlay(): void {
  // (The empty board behind the first lobby has no bet: nothing was played on it.)
  if (state && state.status !== 'digging' && state.bet > 0) {
    const titles: Record<Exclude<RunState['status'], 'digging'>, string> = {
      boom: '🧨 BOOM!',
      cashed: `💰 Cashed out at ${times(state.multiplier)}`,
      idle: `💤 Cashed out at ${times(state.multiplier)}`,
      failed: '⚠️ Something went wrong',
    };
    ui.overlayTitle.textContent = titles[state.status];
    ui.overlayText.textContent =
      state.status === 'boom'
        ? `You lost your bet of ${points(state.bet)}.`
        : state.payout === null
          ? 'The run was cashed out at the multiplier it had reached.'
          : `You got ${points(state.payout)} for your bet of ${points(state.bet)}.`;
  } else {
    ui.overlayTitle.textContent = `⛏️ Ready to dig${lobby ? `, ${lobby.player}` : ''}?`;
    ui.overlayText.textContent = 'Every ore raises your multiplier. Dynamite ends the run. Cash out whenever you like.';
  }
  ui.overlay.hidden = false;
  ui.idle.hidden = true;
}

/** An empty field for the board behind the first lobby, before any run has been played here. */
function blankState(l: Lobby): RunState {
  const size = 5;
  const middle = (size * size - 1) / 2;
  return {
    player: l.player,
    size,
    tiles: Array.from({ length: size * size }, (_, i) => (i === middle ? 'rock' : null)),
    dug: Array.from({ length: size * size }, (_, i) => i === middle),
    pos: middle,
    field: 1,
    oresLeft: l.ores,
    dynamite: l.dynamite,
    bet: 0,
    balance: l.balance,
    multiplier: 1,
    cashOut: 0,
    status: 'cashed',
    payout: null,
    idleMs: 0,
    values: l.values,
    fieldBonus: l.fieldBonus,
  };
}

function describe(event: RunEvent): string {
  switch (event.kind) {
    case 'walk':
      return 'You walk over dug ground.';
    case 'edge':
      return "That's the edge of the field.";
    case 'rock':
      return '🪨 Just rock.';
    case 'ore':
      return `${ORE_EMOJI[event.ore]} ${ORE_NAME[event.ore]}! +${times(event.gained)}`;
    case 'cleared':
      return `✨ Field cleared! +${times(event.bonus)} bonus. Here's field ${state?.field ?? ''}, with more dynamite.`;
    case 'boom':
      return '🧨 BOOM!';
    case 'cashout':
      return '💰 Cashed out.';
    case 'idle':
      return '💤 Left alone for too long, so the run was cashed out.';
    case 'failed':
      return '⚠️ Something went wrong, so the run was cashed out.';
  }
}

/** The bot's word on the run: as it is now, and what the last move did. */
function apply(next: RunState, event: RunEvent | undefined, digAt: number | null): void {
  // A run that wasn't on the board before (just started, or picked up after connecting).
  const fresh = state === null || (next.status === 'digging' && !playing());
  const newField = !fresh && state !== null && next.field !== state.field;
  state = next;
  scene.state = next;
  resizeCanvas(next.size);
  if (fresh) {
    scene.blastAt = null;
    scene.digging = null;
    ui.floaters.textContent = '';
    renderLegend(next.values, next.fieldBonus);
    ui.log.textContent = 'Move with WASD or the arrow keys. Stepping onto a hidden tile digs it.';
  }
  place(next.pos, next.size, fresh || newField || next.status !== 'digging');

  if (event) {
    ui.log.textContent = describe(event);
    if ((event.kind === 'ore' || event.kind === 'cleared') && digAt !== null) floatText(digAt, `+${times(event.gained)}`, ORE_TEXT[event.ore]);
    if (event.kind === 'cleared') effect(ui.wrap, 'flash');
    if (event.kind === 'boom') {
      scene.blastAt = performance.now();
      effect(ui.wrap, 'shake');
    }
  }
  renderHud();
  if (playing()) {
    ui.overlay.hidden = true;
  } else {
    // Over: say how it went; the lobby follows from the bot in a moment.
    ui.lobby.hidden = true;
    renderOverlay();
  }
}

// ---------------------------------------------------------------------------
// The lobby

let starting: number | null = null;

function showLobby(next: Lobby): void {
  lobby = next;
  starting = null;
  if (!state) {
    apply(blankState(next), undefined, null);
    renderLegend(next.values, next.fieldBonus);
  }
  setBalance(next.balance);
  renderOverlay();
  ui.betRange.textContent = `(${points(next.minBet)} to ${points(next.maxBet)})`;
  ui.bet.min = String(next.minBet);
  ui.bet.max = String(next.maxBet);
  const wanted = next.lastBet ?? next.minBet;
  ui.bet.value = String(Math.max(next.minBet, Math.min(wanted, next.maxBet)));
  ui.lobbyInfo.textContent = `A new run: ${next.ores} ores and ${next.dynamite} dynamite on the first field.`;
  ui.lobbyError.hidden = true;
  ui.start.disabled = false;
  ui.lobby.hidden = false;
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
      return 'You already have a run going. Finish it first (in Discord or another tab).';
  }
}

/** The bet in the box, kept to the allowed range. */
function betFromBox(): number | null {
  const bet = Math.floor(Number(ui.bet.value));
  return Number.isFinite(bet) && bet > 0 ? bet : null;
}

function startRun(): void {
  if (!lobby || ui.lobby.hidden || starting !== null || playing()) return;
  const bet = betFromBox();
  if (bet === null) {
    ui.lobbyError.textContent = 'Type how much to bet.';
    ui.lobbyError.hidden = false;
    return;
  }
  seq += 1;
  starting = seq;
  ui.start.disabled = true;
  ui.lobbyError.hidden = true;
  lastActivity = performance.now();
  send({ t: 'start', bet, seq });
}

ui.lobby.addEventListener('submit', (e) => {
  e.preventDefault();
  startRun();
});

for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-bet]')) {
  chip.addEventListener('click', () => {
    if (!lobby) return;
    const now = betFromBox() ?? lobby.minBet;
    const most = Math.min(lobby.maxBet, Math.max(lobby.minBet, lobby.balance));
    const next = chip.dataset.bet === 'half' ? Math.floor(now / 2) : chip.dataset.bet === 'double' ? now * 2 : most;
    ui.bet.value = String(Math.max(lobby.minBet, Math.min(next, lobby.maxBet)));
  });
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let seq = 0;
/** The move waiting for the bot's answer to a dig (or a cash out): its seq, and the tile. */
let pendingDig: { seq: number; at: number } | null = null;
/** Set once the bot has said no: nothing to reconnect for. */
let finished = false;
let retries = 0;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the mine again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The mine is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
};

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function setConn(text: string, kind: '' | 'ok' | 'bad'): void {
  ui.conn.textContent = text;
  ui.conn.className = `conn ${kind}`;
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
      if (message.seq === starting) starting = null;
      ui.lobbyError.textContent = refusalText(message);
      ui.lobbyError.hidden = false;
      ui.start.disabled = false;
      return;
    case 'state': {
      const over = message.state.status !== 'digging';
      const answersStart = starting !== null && message.seq === starting;
      const answersDig = pendingDig !== null && message.seq === pendingDig.seq;
      // Answers to walks the page already made are old news, except the one to its latest message
      // (or to none: a run picked up after connecting), a new run, and anything that ends the run.
      if (!over && !answersDig && !answersStart && message.seq !== 0 && message.seq < seq) return;
      const digAt = answersDig ? (pendingDig?.at ?? null) : null;
      if (answersDig || answersStart || message.seq === 0) {
        pendingDig = null;
        scene.digging = null;
      }
      if (answersStart) starting = null;
      lastActivity = performance.now();
      apply(message.state, message.event, digAt);
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
    send({ t: 'hello', token });
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
    pendingDig = null;
    starting = null;
    scene.digging = null;
    if (retries >= 6) {
      setConn('Disconnected', 'bad');
      showMessage('Lost the connection', 'Reload this page, or press Open the mine in Discord for a new link.');
      return;
    }
    const wait = Math.min(8000, 500 * 2 ** retries++);
    setConn('Reconnecting…', 'bad');
    setTimeout(connect, wait);
  });
}

// ---------------------------------------------------------------------------
// Input

const STEP: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function move(dir: Direction): void {
  if (!state || !playing() || pendingDig !== null || socket?.readyState !== WebSocket.OPEN) return;
  const size = state.size;
  const col = (state.pos % size) + STEP[dir][0];
  const row = Math.floor(state.pos / size) + STEP[dir][1];
  if (col < 0 || row < 0 || col >= size || row >= size) return;
  const next = row * size + col;
  seq += 1;
  lastActivity = performance.now();
  if (state.dug[next]) {
    // Walking over dug ground: move now, tell the bot after.
    state.pos = next;
    place(next, size, false);
    ui.log.textContent = 'You walk over dug ground.';
  } else {
    pendingDig = { seq, at: next };
    scene.digging = next;
  }
  send({ t: 'move', dir, seq });
}

function cashOut(): void {
  if (!state || !playing() || pendingDig !== null) return;
  seq += 1;
  pendingDig = { seq, at: state.pos };
  send({ t: 'cashout', seq });
}

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Typing a bet: leave the keys to the box (Enter starts, through the form).
  if (document.activeElement === ui.bet) return;
  const dir = KEYS[e.code];
  if (dir) {
    e.preventDefault();
    if (!e.repeat) move(dir);
    return;
  }
  if (e.repeat) return;
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && playing()) {
    e.preventDefault();
    cashOut();
  } else if (e.code === 'KeyR' && !playing()) {
    e.preventDefault();
    startRun();
  }
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    move(button.dataset.dir as Direction);
  });
}
ui.cashout.addEventListener('click', cashOut);

// Swipes on the board, for phones (not on the lobby over it).
let swipeFrom: { x: number; y: number } | null = null;
ui.wrap.addEventListener('pointerdown', (e) => {
  swipeFrom = playing() ? { x: e.clientX, y: e.clientY } : null;
});
ui.wrap.addEventListener('pointerup', (e) => {
  if (!swipeFrom) return;
  const dx = e.clientX - swipeFrom.x;
  const dy = e.clientY - swipeFrom.y;
  swipeFrom = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
});

// ---------------------------------------------------------------------------
// Drawing

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(64, now - lastFrame);
  lastFrame = now;
  if (state) {
    // Slide towards the tile the miner is headed for (about 80 ms a tile).
    const k = Math.min(1, dt / 45);
    scene.miner.col += (target.col - scene.miner.col) * k;
    scene.miner.row += (target.row - scene.miner.row) * k;
    drawScene(g, scene, now);

    if (playing()) {
      const left = Math.ceil((state.idleMs - (now - lastActivity)) / 1000);
      ui.idle.hidden = left > 15;
      if (!ui.idle.hidden) ui.idle.textContent = `💤 Cashing out by itself in ${Math.max(0, left)}s unless you move.`;
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Start

if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick the Mine, or use the mine command in Discord.');
} else {
  connect();
  requestAnimationFrame(frame);
}
