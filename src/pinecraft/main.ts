import '../style.css';
import './pinecraft.css';
import { burst, cellAt, drawScene, isBedrock, isOpenCell, ORE_OF, stepParticles, type Scene } from './draw';
import type { ClientMessage, Direction, ErrorCode, PinecraftOre, ServerMessage, WorldEvent, WorldState } from './protocol';
import { drawGem, loadTextures, ORE_COLOR, ORES } from './textures';

/*
 * Pinecraft, played in the browser. The link carries, after the #, the player's token (t) and the
 * bot's WebSocket address (s). The bot holds the world and decides every dig; this page sends the
 * moves and draws what it is told.
 *
 * Walking through open ground can't change anything, so the page moves the miner at once and tells
 * the bot afterwards. A dig waits for the bot's answer (the pickaxe swings until it comes), and no
 * other move is taken until then. Holding a direction keeps going.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const g = canvas.getContext('2d') as CanvasRenderingContext2D;
const ui = {
  conn: $('conn'),
  energy: $('energy'),
  energyFill: $('energy-fill'),
  energyNext: $('energy-next'),
  balance: $('balance'),
  depth: $('depth'),
  earned: $('earned'),
  log: $('log'),
  wrap: $('board-wrap'),
  floaters: $('floaters'),
  legend: $('legend'),
  message: $('message'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
};

const ORE_NAME: Record<PinecraftOre, string> = { coal: 'Coal', iron: 'Iron', gold: 'Gold', diamond: 'Diamond', ruby: 'Ruby', emerald: 'Emerald' };

/** Blocks across the view. */
const VIEW_COLS = 11;
/** A step every this many ms while a direction is held. */
const STEP_MS = 140;
/** A dig shows at least this much swing, however fast the bot answers. */
const MIN_DIG_MS = 200;

const points = (n: number): string => n.toLocaleString('en-US');
const clock = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

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

let scene: Scene | null = null;
/** Energy as the page counts it: the bot's last word, plus what has come back since. */
let energy = { count: 0, max: 0, nextAt: null as number | null, every: 0 };
let size = { w: 0, h: 0, block: 0 };

function resize(): void {
  const rect = ui.wrap.getBoundingClientRect();
  if (rect.width === 0) return;
  const ratio = window.devicePixelRatio || 1;
  size = { w: rect.width, h: rect.height, block: rect.width / VIEW_COLS };
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  g.setTransform(canvas.width / rect.width, 0, 0, canvas.height / rect.height, 0, 0);
}
new ResizeObserver(resize).observe(ui.wrap);

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

/** Text floating up from block (x, y). */
function floatText(x: number, y: number, text: string, color: string): void {
  if (!scene) return;
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${(x + 0.5 - scene.cam.x) * size.block}px`;
  el.style.top = `${(y + 0.3 - scene.cam.y) * size.block}px`;
  ui.floaters.append(el);
  setTimeout(() => el.remove(), 1000);
}

function setText(el: HTMLElement, text: string, bumpIt = false): void {
  if (el.textContent === text) return;
  const before = el.textContent;
  el.textContent = text;
  if (bumpIt && before !== '–') bump(el);
}

function renderEnergy(now: number): void {
  while (energy.nextAt !== null && now >= energy.nextAt && energy.count < energy.max) {
    energy.count++;
    energy.nextAt = energy.count >= energy.max ? null : energy.nextAt + energy.every;
  }
  setText(ui.energy, `${energy.count} / ${energy.max}`);
  ui.energyFill.style.width = `${energy.max > 0 ? (100 * energy.count) / energy.max : 0}%`;
  ui.energyFill.classList.toggle('low', energy.count < Math.max(1, energy.max * 0.15));
  ui.energyNext.textContent = energy.nextAt === null ? 'Full' : `+1 in ${clock(energy.nextAt - now)}`;
}

function renderHud(state: WorldState): void {
  setText(ui.balance, state.balance === null ? '–' : points(state.balance), true);
  setText(ui.earned, points(state.earned), true);
}

function renderLegend(state: WorldState): void {
  ui.legend.textContent = '';
  for (const ore of ORES) {
    const item = document.createElement('span');
    item.className = 'legend-ore';
    const icon = document.createElement('canvas');
    icon.width = 32;
    icon.height = 32;
    icon.className = 'legend-gem';
    drawGem(icon.getContext('2d') as CanvasRenderingContext2D, ore, 16, 16, 11);
    const text = document.createElement('span');
    text.innerHTML = `${ORE_NAME[ore]} <b></b> <small></small>`;
    (text.querySelector('b') as HTMLElement).textContent = `+${points(state.values[ore] ?? 0)}`;
    (text.querySelector('small') as HTMLElement).textContent = state.from[ore] ? `from ${state.from[ore]}m` : '';
    item.append(icon, text);
    ui.legend.append(item);
  }
}

function describe(event: WorldEvent, state: WorldState): string | null {
  switch (event.kind) {
    case 'walk':
      return null;
    case 'edge':
      return "That's as far as the mine goes.";
    case 'bedrock':
      return 'Bedrock: nothing gets through that.';
    case 'tired':
      return `⚡ Out of energy. One comes back every ${Math.round(state.energyMs / 60_000)} minutes.`;
    case 'dig':
      return event.ore ? `${ORE_NAME[event.ore]}! +${points(event.points)}` : null;
  }
}

/** The bot's word on the world, and what the last move did (`dug`: the block the page was digging). */
function apply(state: WorldState, event: WorldEvent | undefined, moveMiner: boolean, dug: { x: number; y: number } | null): void {
  const now = performance.now();
  const first = scene === null;
  if (!scene) {
    scene = { state, known: new Map(), cam: { x: 0, y: 0 }, miner: { x: state.x, y: state.y }, facing: 1, swing: null, digging: null, particles: [] };
    renderLegend(state);
  }
  // An answer behind the page's own walks: the page's idea of where the miner is stands.
  if (!moveMiner) {
    state.x = scene.state.x;
    state.y = scene.state.y;
  }
  scene.state = state;
  state.rows.forEach((row, k) => scene?.known.set(state.top + k, row));
  if (moveMiner) target = { x: state.x, y: state.y };
  if (first) centerCamera(true);

  energy = { count: state.energy, max: state.maxEnergy, nextAt: state.nextEnergyMs === null ? null : now + state.nextEnergyMs, every: state.energyMs };
  renderHud(state);
  renderEnergy(now);

  if (event) {
    const text = describe(event, state);
    if (text) ui.log.textContent = text;
    if (event.kind === 'dig' && dug) {
      burst(scene, dug.x, dug.y, event.ground, event.ore, now);
      if (event.ore) {
        floatText(dug.x, dug.y, `+${points(event.points)}`, '#ffd84a');
        if (event.points >= 35) effect(ui.wrap, 'flash');
      }
    }
    if (event.kind === 'tired') effect(ui.energy.parentElement as HTMLElement, 'shake');
  }
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let seq = 0;
/** The dig waiting for the bot's answer: its seq, the block, and when the swing started. */
let pendingDig: { seq: number; x: number; y: number; since: number } | null = null;
let finished = false;
let retries = 0;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open Pinecraft again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Pinecraft is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  failed: ['Something went wrong', 'Your mine could not be loaded or saved. Try again in a moment.'],
};

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function setConn(text: string, kind: '' | 'ok' | 'bad'): void {
  ui.conn.textContent = text;
  ui.conn.className = `conn ${kind}`;
}

function receive(message: ServerMessage): void {
  if (message.t === 'error') {
    finished = true;
    const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
    showMessage(title, text);
    setConn('Disconnected', 'bad');
    return;
  }
  const answersDig = pendingDig !== null && message.seq === pendingDig.seq;
  // Answers to walks the page already made are behind it; only the latest (or a fresh start) moves the miner.
  const moveMiner = message.seq === 0 || message.seq === seq;
  if (message.seq === 0) {
    pendingDig = null;
    if (scene) scene.digging = null;
  }
  if (!answersDig) {
    apply(message.state, message.event, moveMiner, null);
    return;
  }
  // A dig: let the pickaxe swing a little before the block breaks.
  const dig = pendingDig as NonNullable<typeof pendingDig>;
  const wait = Math.max(0, dig.since + MIN_DIG_MS - performance.now());
  setTimeout(() => {
    if (pendingDig !== dig) return;
    pendingDig = null;
    if (scene) scene.digging = null;
    apply(message.state, message.event, moveMiner, { x: dig.x, y: dig.y });
  }, wait);
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
    pendingDig = null;
    if (scene) scene.digging = null;
    if (retries >= 6) {
      setConn('Disconnected', 'bad');
      showMessage('Lost the connection', 'Reload this page, or open Pinecraft again for a new link.');
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
/** Where the miner is headed, in blocks (they slide there). */
let target = { x: 0, y: 0 };
let lastStep = 0;

function move(dir: Direction): void {
  if (!scene || pendingDig !== null || socket?.readyState !== WebSocket.OPEN) return;
  const { state } = scene;
  const now = performance.now();
  lastStep = now;
  if (dir === 'left' || dir === 'right') scene.facing = dir === 'left' ? -1 : 1;
  const x = state.x + STEP[dir][0];
  const y = state.y + STEP[dir][1];
  if (x < 0 || y < 0 || x >= state.width || y >= state.depth) return;
  const c = cellAt(scene, x, y);
  if (isBedrock(c)) {
    ui.log.textContent = 'Bedrock: nothing gets through that.';
    return;
  }
  if (!isOpenCell(c) && energy.count < 1) {
    ui.log.textContent = `⚡ Out of energy. ${energy.nextAt === null ? '' : `One more in ${clock(energy.nextAt - now)}.`}`;
    effect(ui.energy.parentElement as HTMLElement, 'shake');
    return;
  }
  seq += 1;
  if (isOpenCell(c)) {
    // Open ground: go now, tell the bot after.
    state.x = x;
    state.y = y;
    target = { x, y };
  } else {
    pendingDig = { seq, x, y, since: now };
    scene.digging = { x, y, since: now };
    scene.swing = { since: now, dir };
    if (ORE_OF[c]) ui.log.textContent = `Digging out ${ORE_NAME[ORE_OF[c] as PinecraftOre].toLowerCase()}…`;
  }
  send({ t: 'move', dir, seq });
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

/** The directions held down, the latest last: holding one keeps moving that way. */
const held: Direction[] = [];
const press = (dir: Direction): void => {
  if (!held.includes(dir)) held.push(dir);
  if (performance.now() - lastStep >= STEP_MS) move(dir);
};
const release = (dir: Direction): void => {
  const k = held.indexOf(dir);
  if (k >= 0) held.splice(k, 1);
};

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const dir = KEYS[e.code];
  if (!dir) return;
  e.preventDefault();
  if (!e.repeat) press(dir);
});
window.addEventListener('keyup', (e) => {
  const dir = KEYS[e.code];
  if (dir) release(dir);
});
window.addEventListener('blur', () => (held.length = 0));

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
  const dir = button.dataset.dir as Direction;
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    press(dir);
  });
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(end, () => release(dir));
}

// Swipes on the view, for phones: one step each.
let swipeFrom: { x: number; y: number } | null = null;
ui.wrap.addEventListener('pointerdown', (e) => (swipeFrom = { x: e.clientX, y: e.clientY }));
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

function centerCamera(snap: boolean): void {
  if (!scene || size.block === 0) return;
  const cols = size.w / size.block;
  const rows = size.h / size.block;
  const { state } = scene;
  const want = {
    x: Math.max(0, Math.min(state.width - cols, scene.miner.x + 0.5 - cols / 2)),
    y: Math.max(-1, Math.min(state.depth - rows, scene.miner.y + 0.5 - rows * 0.45)),
  };
  const k = snap ? 1 : 0.12;
  scene.cam.x += (want.x - scene.cam.x) * k;
  scene.cam.y += (want.y - scene.cam.y) * k;
}

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(64, now - lastFrame);
  lastFrame = now;
  if (scene && size.block > 0) {
    // Keep going while a direction is held.
    const dir = held[held.length - 1];
    if (dir && pendingDig === null && now - lastStep >= STEP_MS) move(dir);

    const k = Math.min(1, dt / 45);
    scene.miner.x += (target.x - scene.miner.x) * k;
    scene.miner.y += (target.y - scene.miner.y) * k;
    centerCamera(false);
    stepParticles(scene, dt, now);
    drawScene(g, scene, size.w, size.h, size.block, now);
    renderEnergy(now);
    setText(ui.depth, `${Math.max(0, Math.round(scene.miner.y - scene.state.sky))}m`);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Start

resize();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Pinecraft, or use the pinecraft command in Discord.');
} else {
  void loadTextures();
  connect();
  requestAnimationFrame(frame);
}
