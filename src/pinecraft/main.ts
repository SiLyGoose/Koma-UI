import '../style.css';
import { barSlot, setConn, soundButton } from '../frame';
import { apiFromSocket, showWatchers, showWatching, startLive, watchAway, watchBack } from '../live';
import './pinecraft.css';
import { burst, cellAt, drawMap, drawScene, isBedrock, isOpenCell, ORE_OF, stepParticles, type Scene } from './draw';
import type { ClientMessage, Direction, ErrorCode, PinecraftOre, ServerMessage, WorldEvent, WorldMap, WorldState } from './protocol';
import { loadSounds, materialOf, play, setMuted, type Material } from './sfx';
import { drawGem, loadTextures, ORE_COLOR, ORES } from './textures';

/*
 * Pinecraft, played in the browser. The link carries, after the #, the player's token (t) and the
 * bot's WebSocket address (s). The bot holds the world and decides every dig; this page sends the
 * moves and draws what it is told.
 *
 * Walking through open ground can't change anything, so the page moves the miner at once and tells
 * the bot afterwards. A block is broken like in Minecraft: hold the direction against it (the keys,
 * or the joystick on a phone) and it cracks, taking longer the harder it is (the bot's
 * breakMs), and letting go starts it over. The page tells the bot when it starts (`mine`) and when it is done (`move`), then waits for the bot's
 * answer before any other move. Holding a direction keeps going.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const g = canvas.getContext('2d') as CanvasRenderingContext2D;
const ui = {
  energy: $('energy'),
  energyFill: $('energy-fill'),
  energyNext: $('energy-next'),
  balance: $('balance'),
  depth: $('depth'),
  earned: $('earned'),
  oreTip: $('ore-tip-rows'),
  log: $('log'),
  wrap: $('board-wrap'),
  floaters: $('floaters'),
  legend: $('legend'),
  message: $('message'),
  stage: $('stage'),
  stick: $('stick'),
  stickKnob: $('stick-knob'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
  mapButton: $<HTMLButtonElement>('map-button'),
  blast: $('blast'),
  blastLeft: $('blast-left'),
  coords: $('coords'),
  map: $('map'),
  mapCanvas: $<HTMLCanvasElement>('map-canvas'),
  mapWhere: $('map-where'),
  mapClose: $<HTMLButtonElement>('map-close'),
};

const ORE_NAME: Record<PinecraftOre, string> = { coal: 'Coal', iron: 'Iron', gold: 'Gold', diamond: 'Diamond', emerald: 'Emerald', ruby: 'Ruby' };

/** Blocks across the view, when the page's styles don't say (--cols on the view). */
const VIEW_COLS = 8;
/** A step every this many ms while a direction is held. */
const STEP_MS = 140;
/** A dig shows at least this much swing, however fast the bot answers. */
const MIN_DIG_MS = 200;
/** How long a block takes to break when the bot doesn't say (an older bot). */
const DEFAULT_BREAK_MS = 400;

const points = (n: number): string => n.toLocaleString('en-US');
const clock = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
/** A link to play has t=, a link to watch someone play has w= (watch-only: the keys and joystick do nothing). */
const watchToken = params.get('w');
const watching = watchToken !== null;
const token = params.get('t') ?? watchToken;
const server = params.get('s');
/** Whose world this page watches, once the bot has said. */
let watched = '';

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
  const cols = parseFloat(getComputedStyle(ui.wrap).getPropertyValue('--cols')) || VIEW_COLS;
  size = { w: rect.width, h: rect.height, block: rect.width / cols };
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
  setText(ui.depth, points(state.dug));
  // With a Dynamite Stick: the blocks until the next blast.
  ui.blast.hidden = !state.blast;
  if (state.blast) {
    setText(ui.blastLeft, state.blast.left === 1 ? 'next block' : `in ${state.blast.left} blocks`);
    ui.blast.classList.toggle('soon', state.blast.left === 1);
  }
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
    text.innerHTML = `${ORE_NAME[ore]} <b></b>`;
    (text.querySelector('b') as HTMLElement).textContent = `+${points(state.values[ore] ?? 0)}`;
    item.append(icon, text);
    ui.legend.append(item);
  }
  renderOreTip(state);
}

/** What each ore pays, in the tooltip over "Earned from ores". */
function renderOreTip(state: WorldState): void {
  ui.oreTip.textContent = '';
  for (const ore of ORES) {
    const name = document.createElement('span');
    name.className = 'pc-tip-ore';
    name.textContent = ORE_NAME[ore];
    const icon = document.createElement('canvas');
    icon.width = 40;
    icon.height = 40;
    icon.className = 'pc-tip-gem';
    drawGem(icon.getContext('2d') as CanvasRenderingContext2D, ore, 20, 20, 14);
    name.append(icon);
    const value = document.createElement('span');
    value.className = 'pc-tip-value';
    value.textContent = `+${points(state.values[ore] ?? 0)}`;
    ui.oreTip.append(name, value);
  }
}

/** The sounds of blocks breaking: each kind once (a blast breaks many), then a chime for any gem. */
function breakSounds(blocks: { ground: 'dirt' | 'stone'; ore: PinecraftOre | null }[]): void {
  const kinds = new Set(blocks.map((b) => materialOf(b.ground, b.ore)));
  if (kinds.has('dirt')) play('breakDirt');
  if (kinds.has('stone')) play('breakStone');
  if (kinds.has('gem')) {
    play('breakGem');
    setTimeout(() => play('collectGem', 0.4), 120);
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
  // A new week: a fresh mine. Forget the old one's blocks, and start from the room.
  if (!first && state.week && scene.state.week && state.week !== scene.state.week) {
    scene.known.clear();
    scene.particles = [];
    scene.digging = null;
    scene.swing = null;
    scene.miner = { x: state.x, y: state.y };
    worldMap = null;
    moveMiner = true;
    ui.log.textContent = '🔄 New week, new mine! Your energy and earnings are kept.';
  }
  // An answer behind the page's own walks: the page's idea of where the miner is stands.
  if (!moveMiner) {
    state.x = scene.state.x;
    state.y = scene.state.y;
  }
  scene.state = state;
  const known = scene.known;
  state.rows.forEach((row, k) => {
    const y = state.top + k;
    for (let i = 0; i < row.length; i++) known.set(y * state.size + state.left + i, row[i] as string);
  });
  if (moveMiner) target = { x: state.x, y: state.y };
  if (first) centerCamera(true);

  energy = { count: state.energy, max: state.maxEnergy, nextAt: state.nextEnergyMs === null ? null : now + state.nextEnergyMs, every: state.energyMs };
  renderHud(state);
  renderEnergy(now);

  if (event) {
    if (event.kind === 'dig' && dug) {
      breakSounds([event, ...(event.blast ?? [])]);
      burst(scene, dug.x, dug.y, event.ground, event.ore, now);
      if (event.ore) floatText(dug.x, dug.y, `+${points(event.points)}${event.lucky ? ' ×2' : ''}`, event.lucky ? '#7dffb0' : '#ffd84a');
      // A blast: every block around goes at once.
      if (event.blast) {
        for (const b of event.blast) {
          burst(scene, b.x, b.y, b.ground, b.ore, now);
          if (b.ore) floatText(b.x, b.y, `+${points(b.points)}${b.lucky ? ' ×2' : ''}`, b.lucky ? '#7dffb0' : '#ffb057');
        }
        effect(ui.wrap, 'shake');
      }
    }
    if (event.kind === 'tired') effect(ui.energy.parentElement as HTMLElement, 'shake');
    if (event.kind === 'tired' || event.kind === 'bedrock') play('cancel');
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
  not_playing: ['Nobody to watch', "They aren't playing Pinecraft right now. Pick someone else from the online list."],
  full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
};

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function receive(message: ServerMessage): void {
  if (message.t === 'error') {
    finished = true;
    const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
    showMessage(title, text);
    setConn('Disconnected', 'bad');
    return;
  }
  if (message.t === 'map') {
    worldMap = message.map;
    if (mapOpen) renderMap();
    return;
  }
  if (message.t === 'watchers') return showWatchers(message.count);
  if (message.t === 'watching') {
    watched = message.player;
    showWatching(watched);
    ui.log.textContent = `Watching ${watched} dig`;
    return;
  }
  if (message.t === 'away') {
    showWatching(watched, true);
    // A moment later (not for a reload), tell them, with the way home.
    return watchAway(
      () => showMessage(`${watched} left the game`, `${watched} isn't playing Pinecraft any more. Head back home to see who's online and watch someone else.`),
      () => (ui.message.hidden = true),
    );
  }
  if (message.t === 'breaking') return watchBreaking(message.dir);
  if (watching) return watchState(message.state, message.event);
  const answersDig = pendingDig !== null && message.seq === pendingDig.seq;
  // Answers to walks the page already made are behind it; only the latest (or a fresh start) moves the miner.
  const moveMiner = message.seq === 0 || message.seq === seq;
  if (message.seq === 0) {
    pendingDig = null;
    breaking = null;
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

/** Watching: the player started on a block. Its cracks grow as theirs do (until the bot says how it went). */
let watchBreak: ReturnType<typeof setTimeout> | null = null;
function watchBreaking(dir: Direction): void {
  if (!scene) return;
  const { state } = scene;
  const x = state.x + STEP[dir][0];
  const y = state.y + STEP[dir][1];
  const now = performance.now();
  const takes = breakTime(cellAt(scene, x, y));
  if (dir === 'left' || dir === 'right') scene.facing = dir === 'left' ? -1 : 1;
  scene.digging = { x, y, since: now, takes };
  scene.swing = { since: now, dir };
  // They let go before it broke: the cracks go a moment after it would have.
  if (watchBreak) clearTimeout(watchBreak);
  watchBreak = setTimeout(() => {
    if (scene?.digging?.x === x && scene.digging.y === y) {
      scene.digging = null;
      scene.swing = null;
    }
  }, takes + 1500);
}

/** Watching: the bot's word on the player's world. The miner goes where it says, and a dig is where they now stand. */
function watchState(state: WorldState, event: WorldEvent | undefined): void {
  if (watched) {
    showWatching(watched);
    watchBack();
  }
  if (scene && state.x !== scene.state.x) scene.facing = state.x < scene.state.x ? -1 : 1;
  if (scene) {
    scene.digging = null;
    scene.swing = null;
  }
  apply(state, event, true, event?.kind === 'dig' ? { x: state.x, y: state.y } : null);
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
    pendingDig = null;
    breaking = null;
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

/**
 * The block being broken: which way, where, since when, and how long it takes; what it sounds like,
 * and when the pickaxe next hits it.
 */
let breaking: { dir: Direction; x: number; y: number; since: number; takes: number; material: Material; nextHit: number } | null = null;
/** A pickaxe swing (as drawn), and how far into one it strikes. */
const SWING_MS = 260;
const STRIKE_MS = 130;

/** How long the block with letter `c` takes to break. */
function breakTime(c: string): number {
  const times = scene?.state.breakMs;
  if (!times) return DEFAULT_BREAK_MS;
  const ore = ORE_OF[c];
  return ore ? times[ore] : c === 's' ? times.stone : times.dirt;
}

function stopBreaking(): void {
  if (!breaking) return;
  breaking = null;
  if (scene && pendingDig === null) {
    scene.digging = null;
    scene.swing = null;
  }
}

/** The block is broken: tell the bot, and wait for its answer. */
function finishBreaking(): void {
  const done = breaking;
  if (!done) return;
  breaking = null;
  seq += 1;
  pendingDig = { seq, x: done.x, y: done.y, since: done.since };
  send({ t: 'move', dir: done.dir, seq });
}

/** One step `dir`: through open ground, or starting to break the block there. */
/** The block last refused (bedrock, or no energy for it): holding against it says so only once. */
let refused: string | null = null;

/** Can't break block (x, y): the cancel sound, once until the direction is let go. */
function refuse(x: number, y: number): void {
  const key = `${x},${y}`;
  if (refused !== key) play('cancel');
  refused = key;
}

/** How to play, shown over the mine until the first move. */
let startTip: string | null = null;

function move(dir: Direction): void {
  if (watching || !scene || pendingDig !== null || socket?.readyState !== WebSocket.OPEN) return;
  if (startTip !== null && ui.log.textContent === startTip) ui.log.textContent = '';
  startTip = null;
  const { state } = scene;
  const now = performance.now();
  lastStep = now;
  if (dir === 'left' || dir === 'right') scene.facing = dir === 'left' ? -1 : 1;
  const x = state.x + STEP[dir][0];
  const y = state.y + STEP[dir][1];
  if (breaking && breaking.x === x && breaking.y === y) return;
  stopBreaking();
  if (x < 0 || y < 0 || x >= state.size || y >= state.size) return;
  const c = cellAt(scene, x, y);
  if (isBedrock(c)) return refuse(x, y);
  // An ore can take more than one energy (a Golden Pickaxe).
  if (!isOpenCell(c) && energy.count < (ORE_OF[c] ? (state.oreEnergy ?? 1) : 1)) {
    effect(ui.energy.parentElement as HTMLElement, 'shake');
    return refuse(x, y);
  }
  refused = null;
  if (isOpenCell(c)) {
    // Open ground: go now, tell the bot after.
    play('footstep', 0.1);
    seq += 1;
    state.x = x;
    state.y = y;
    target = { x, y };
    send({ t: 'move', dir, seq });
    return;
  }
  const takes = breakTime(c);
  const ore = ORE_OF[c] ?? null;
  breaking = { dir, x, y, since: now, takes, material: materialOf(c === 's' ? 'stone' : 'dirt', ore), nextHit: now + STRIKE_MS };
  scene.digging = { x, y, since: now, takes };
  scene.swing = { since: now, dir };
  send({ t: 'mine', dir });
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
  refused = null;
};

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyM' && !e.repeat) {
    e.preventDefault();
    if (mapOpen) closeMap();
    else openMap();
    return;
  }
  if (mapOpen) {
    if (e.code === 'Escape') closeMap();
    return;
  }
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

// Phones: touch anywhere on the mine and a joystick shows up under the finger, and stays there
// until it lifts. Drag to walk, and hold against a block to break it.
/** How far the knob goes from the joystick's middle, in px, and how far before it counts. */
const STICK_REACH = 36;
const STICK_DEAD = 12;
/** Half the ring's size (.pc-stick in the styles). */
const STICK_HALF = 55;
/** The finger on the joystick, and the joystick's middle, in px from the stage's top left. */
let stick: { id: number; x: number; y: number } | null = null;
let stickDir: Direction | null = null;
function setStick(dir: Direction | null): void {
  if (dir === stickDir) return;
  if (stickDir) release(stickDir);
  stickDir = dir;
  if (dir) press(dir);
}
function steer(e: PointerEvent): void {
  if (!stick) return;
  const rect = ui.stage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let dx = x - stick.x;
  let dy = y - stick.y;
  const d = Math.hypot(dx, dy);
  setStick(d < STICK_DEAD ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  // Past the edge the knob stops there; the joystick itself stays put.
  if (d > STICK_REACH) {
    dx *= STICK_REACH / d;
    dy *= STICK_REACH / d;
  }
  ui.stick.style.transform = `translate(${stick.x - STICK_HALF}px, ${stick.y - STICK_HALF}px)`;
  ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
ui.stage.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' || stick) return;
  e.preventDefault();
  // Close the ore tooltip if it was tapped open.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  ui.stage.setPointerCapture(e.pointerId);
  const rect = ui.stage.getBoundingClientRect();
  stick = { id: e.pointerId, x: e.clientX - rect.left, y: e.clientY - rect.top };
  ui.stick.classList.add('on');
  steer(e);
});
ui.stage.addEventListener('pointermove', (e) => {
  if (e.pointerId === stick?.id) steer(e);
});
for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
  ui.stage.addEventListener(end, (e) => {
    if (e.pointerId !== stick?.id) return;
    stick = null;
    ui.stick.classList.remove('on');
    ui.stickKnob.style.transform = '';
    setStick(null);
  });
}

if (matchMedia('(pointer: coarse)').matches) {
  ui.log.textContent = 'Touch and drag anywhere on the mine to walk · hold against a block to break it. Every block takes one ⚡; harder ones take longer.';
}
startTip = ui.log.textContent;

// ---------------------------------------------------------------------------
// The map

/** Where the miner is, counted from where they started: right and up are positive. */
function coords(): { x: number; y: number } | null {
  if (!scene?.state.spawn) return null;
  const { state } = scene;
  return { x: state.x - state.spawn.x, y: state.spawn.y - state.y };
}

let mapOpen = false;
/** The map the bot sent last (asked for each time the map is opened). */
let worldMap: WorldMap | null = null;

function renderMap(): void {
  if (!scene || !worldMap) return;
  const rect = ui.mapCanvas.getBoundingClientRect();
  if (rect.width === 0) return;
  const ratio = window.devicePixelRatio || 1;
  ui.mapCanvas.width = Math.round(rect.width * ratio);
  ui.mapCanvas.height = Math.round(rect.height * ratio);
  const mg = ui.mapCanvas.getContext('2d') as CanvasRenderingContext2D;
  mg.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawMap(mg, worldMap, rect.width, rect.height, scene.state, scene.state.spawn);
}

/** "in 3d 4h", "in 5h 20m", "in 12m". */
function untilText(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `in ${days}d ${hours}h` : hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`;
}

function openMap(): void {
  if (!scene?.state.spawn || mapOpen) return;
  mapOpen = true;
  held.length = 0;
  setStick(null);
  stopBreaking();
  const at = coords();
  const resets = scene.state.resetsAt ? ` · new mine ${untilText(scene.state.resetsAt - Date.now())}` : '';
  ui.mapWhere.textContent = (at ? `You are at ${at.x},${at.y}` : '') + resets;
  ui.map.hidden = false;
  renderMap();
  send({ t: 'map' });
}

function closeMap(): void {
  mapOpen = false;
  ui.map.hidden = true;
}

ui.mapButton.addEventListener('pointerdown', (e) => e.stopPropagation());
ui.mapButton.addEventListener('click', openMap);
ui.mapClose.addEventListener('click', closeMap);
new ResizeObserver(() => mapOpen && renderMap()).observe(ui.mapCanvas);

// ---------------------------------------------------------------------------
// Drawing

function centerCamera(snap: boolean): void {
  if (!scene || size.block === 0) return;
  const cols = size.w / size.block;
  const rows = size.h / size.block;
  const { state } = scene;
  const want = {
    x: Math.max(-1, Math.min(state.size + 1 - cols, scene.miner.x + 0.5 - cols / 2)),
    y: Math.max(-1, Math.min(state.size + 1 - rows, scene.miner.y + 0.5 - rows / 2)),
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
    // Breaking a block: let go (or turn) and it starts over; hold on long enough and it breaks.
    const dir = held[held.length - 1];
    if (breaking) {
      if (dir !== breaking.dir) stopBreaking();
      else if (now - breaking.since >= breaking.takes) finishBreaking();
      else if (now >= breaking.nextHit) {
        // The pickaxe strikes: stone rings and gems chink (dirt makes no sound until it breaks).
        if (breaking.material !== 'dirt') play(breaking.material === 'gem' ? 'hitGem' : 'hitStone');
        breaking.nextHit += SWING_MS;
      }
    }
    // Keep going while a direction is held.
    if (dir && pendingDig === null && !breaking && now - lastStep >= STEP_MS) move(dir);

    const k = Math.min(1, dt / 45);
    scene.miner.x += (target.x - scene.miner.x) * k;
    scene.miner.y += (target.y - scene.miner.y) * k;
    centerCamera(false);
    stepParticles(scene, dt, now);
    drawScene(g, scene, size.w, size.h, size.block, now);
    renderEnergy(now);
    const at = coords();
    if (at) setText(ui.coords, `${at.x},${at.y}`);
  }
  requestAnimationFrame(frame);
}

soundButton('pinecraft-muted', setMuted);

// ---------------------------------------------------------------------------
// Start

resize();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Pinecraft, or use the pinecraft command in Discord.');
} else {
  void loadTextures();
  loadSounds();
  connect();
  requestAnimationFrame(frame);
  // Who else is on the site, and a way to watch them (asked with this page's own link).
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
}
