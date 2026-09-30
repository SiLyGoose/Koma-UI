import '../shared/style.css';
import { barSlot, setConn, soundButton } from '../shared/frame';
import { apiFromSocket, startLive } from '../shared/live';
import { setMuted } from '../shared/sfx';
import { markdown } from './markdown';
import type { ActProblem, AnswerCode, ClientMessage, ErrorCode, RaidAction, RaidFightView, RaidView, ServerMessage } from './protocol';
import './raid.css';

/*
 * The weekly raid, in the browser: the same lobby and fight as the raid's message in Discord (the
 * bot runs it; this page shows it and sends what's pressed). The link carries, after the #, the
 * player's token (t) and the bot's web socket (s), like every game's.
 *
 * With no raid going on it shows how this week's stands, and can start it: its lobby goes up in the
 * server's channel in Discord too, and anyone there or here can join.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  bossTitle: $('boss-title'),
  layout: $('layout'),
  picture: $<HTMLImageElement>('boss-picture'),
  battle: $('battle'),
  battlePicture: $<HTMLImageElement>('battle-picture'),
  battleBackdrop: $<HTMLImageElement>('battle-backdrop'),
  tags: $('boss-tags'),
  bossName: $('boss-name'),
  bossPct: $('boss-pct'),
  bossFill: $('boss-fill'),
  intentText: $('intent-text'),
  idle: $('idle'),
  idleTitle: $('idle-title'),
  idleText: $('idle-text'),
  start: $<HTMLButtonElement>('start'),
  lobby: $('lobby'),
  lobbyTimer: $('lobby-timer'),
  lobbyHp: $('lobby-hp'),
  lobbyPlayers: $('lobby-players'),
  join: $<HTMLButtonElement>('join'),
  leave: $<HTMLButtonElement>('leave'),
  begin: $<HTMLButtonElement>('begin'),
  round: $('round'),
  turnText: $('turn-text'),
  turnFill: $('turn-fill'),
  actions: [...document.querySelectorAll<HTMLButtonElement>('[data-action]')],
  actNote: $('act-note'),
  healPick: $('heal-pick'),
  healOptions: $('heal-options'),
  over: $('over'),
  overTitle: $('over-title'),
  overText: $('over-text'),
  overRanking: $('over-ranking'),
  party: $('party'),
  logPanel: $<HTMLDetailsElement>('log-panel'),
  log: $('log'),
  toast: $('toast'),
  message: $('message'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
};

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t');
const server = params.get('s');
const api = server ? apiFromSocket(server) : '';

function showMessage(title: string, text: string): void {
  ui.messageTitle.textContent = title;
  ui.messageText.textContent = text;
  ui.message.hidden = false;
}

// ---------------------------------------------------------------------------
// Words

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const CC_NAME = { stunned: '💫 Stunned', disarmed: '🗡️ Disarmed', taunted: '😤 Taunted' } as const;

/** Why they can't take an action this turn, in words. */
function problemText(problem: ActProblem, turns: number): string {
  switch (problem) {
    case 'not_playing':
      return "You're not in this fight, but you can follow it here.";
    case 'knocked_out':
      return "You're knocked out. A heal can bring you back.";
    case 'stunned':
      return `You're stunned for ${plural(turns, 'more turn', 'more turns')}.`;
    case 'disarmed':
      return `You're disarmed: no attacking for ${plural(turns, 'more turn', 'more turns')}.`;
    case 'taunted':
      return `You're taunted: you can only attack for ${plural(turns, 'more turn', 'more turns')}.`;
  }
}

/** A start, join, leave, begin or act that didn't go through, in words (null: nothing to say). */
function answerText(code: AnswerCode): string | null {
  switch (code) {
    case 'ok':
      return null;
    case 'already_joined':
      return "You're already in.";
    case 'not_joined':
      return "You haven't joined.";
    case 'only_host':
      return 'Only the host (first on the list) can start early.';
    case 'closed':
      return 'The fight has already started.';
    case 'late':
      return 'Too late: that turn is over.';
    case 'already':
      return 'You already picked this turn.';
    case 'no_raid':
      return 'There is no raid going on right now.';
    case 'no_channel':
      return "This server has no bot channel, so start the raid in Discord with the raid command.";
    case 'busy':
      return 'Something else is going on in the server (an event or another raid). Try again in a bit.';
    case 'raided':
      return "This week's raid has already been fought.";
    case 'started':
      return "This week's raid has already been started.";
    case 'failed':
      return 'Something went wrong. Try again in a moment.';
    default:
      return problemText(code, 1);
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(text: string): void {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast.hidden = true), 3500);
}

// ---------------------------------------------------------------------------
// Drawing

let view: RaidView | null = null;
let pictureShown = '';
/** Heal's "who?" is open (for this round). */
let healOpenRound: number | null = null;

const nameOf = (userId: string): string => (view?.names[userId] ?? 'Someone') + (userId === view?.you ? ' (you)' : '');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hpBar(hp: number, max: number, className = ''): HTMLElement {
  const bar = el('div', `rd-bar ${className}`);
  const fill = el('span');
  const share = max > 0 ? Math.max(0, hp) / max : 0;
  fill.style.width = `${share * 100}%`;
  fill.className = share > 0.5 ? 'hi' : share > 0.25 ? 'mid' : 'lo';
  bar.append(fill);
  return bar;
}

/**
 * The buffs on a raider, as little squares under their HP (public/raid/buff/buff_<name>.png), each with a
 * blue up arrow for a buff: Attack while Support's rally lasts (everyone standing, with its turns
 * left), and Guard once they've picked it this turn (their guard is up for the boss's next move).
 */
function buffRow(p: RaidFightView['players'][number], f: RaidFightView): HTMLElement {
  const row = el('div', 'rd-buffs');
  const buff = (name: 'attack' | 'guard', title: string, count?: number): void => {
    const square = el('span', 'rd-buff');
    square.title = title;
    const icon = el('img');
    icon.src = `/raid/buff/buff_${name}.png`;
    icon.alt = '';
    icon.draggable = false;
    square.append(icon, el('span', 'rd-buff-up'));
    if (count !== undefined) square.append(el('span', 'rd-buff-count', String(count)));
    row.append(square);
  };
  if (p.hp > 0 && f.rallied > 0) buff('attack', `Rallied: attacks ×${f.rallyMultiplier} for ${plural(f.rallied, 'more turn', 'more turns')}`, f.rallied);
  if (p.hp > 0 && p.picked === 'guard') buff('guard', 'Guarding this turn');
  return row;
}

/** A player's profile picture, or the first letter of their name when the bot doesn't know it. */
function avatar(userId: string, v: RaidView): HTMLElement {
  const url = v.avatars[userId];
  const letter = (): HTMLElement => el('span', 'rd-initial', (v.names[userId] ?? '?').trim().charAt(0).toUpperCase() || '?');
  if (!url) return letter();
  const img = el('img');
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => img.replaceWith(letter()), { once: true });
  return img;
}

function render(next: RaidView): void {
  view = next;
  const picture = api + next.picture;
  if (picture !== pictureShown) {
    ui.picture.src = picture;
    ui.battlePicture.src = picture;
    ui.battleBackdrop.src = picture;
    pictureShown = picture;
  }
  ui.picture.alt = next.boss.name;
  ui.battlePicture.alt = next.boss.name;
  ui.bossTitle.textContent = `· ${next.boss.emoji} ${next.boss.name}`;

  const fighting = next.phase === 'fight';
  ui.layout.hidden = fighting;
  ui.battle.hidden = !fighting;
  document.body.classList.toggle('rd-fighting', fighting);
  ui.idle.hidden = next.phase !== 'idle';
  ui.lobby.hidden = next.phase !== 'lobby';
  ui.over.hidden = next.phase !== 'over';
  ui.tags.textContent = '';

  if (next.phase === 'idle' && next.idle) renderIdle(next);
  if (next.phase === 'lobby' && next.lobby) renderLobby(next);
  if (next.phase === 'fight' && next.fight) renderFight(next);
  if (next.phase === 'over' && next.over) renderOver(next);
  tick();
}

function renderIdle(v: RaidView): void {
  const idle = v.idle!;
  const reset = new Date(v.resetsAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  const titles = { open: `${v.boss.name} awaits`, won: `${v.boss.name} was defeated`, wiped: `${v.boss.name} won this week`, fled: `${v.boss.name} got away`, busy: 'The raid is being set up' };
  ui.idleTitle.textContent = titles[idle.week];
  ui.idleText.textContent =
    idle.week === 'open'
      ? idle.canStart
        ? `This week's boss hasn't been fought yet. Start the raid and everyone in the server can join, here or in Discord. The week resets ${reset}.`
        : `This week's boss hasn't been fought yet. This server has no bot channel, so start the raid in Discord with the raid command, then join it here. The week resets ${reset}.`
      : idle.week === 'busy'
        ? 'A raid is starting in Discord. It will show up here in a moment.'
        : `The next raid can be started after the week resets, ${reset}.`;
  ui.start.hidden = !idle.canStart;
}

function renderLobby(v: RaidView): void {
  const lobby = v.lobby!;
  const inIt = lobby.players.includes(v.you);
  ui.lobbyHp.textContent = fmt(lobby.bossHp);
  ui.lobbyPlayers.textContent = '';
  for (const userId of lobby.players) {
    const li = el('li', userId === v.you ? 'you' : '', nameOf(userId));
    if (userId === lobby.players[0]) li.append(el('span', 'rd-tag', 'host'));
    ui.lobbyPlayers.append(li);
  }
  ui.join.hidden = inIt;
  ui.leave.hidden = !inIt;
  ui.begin.hidden = lobby.players[0] !== v.you;
}

function renderFight(v: RaidView): void {
  const f = v.fight!;
  const me = f.players.find((p) => p.userId === v.you);

  const bossShare = f.bossMaxHp > 0 ? Math.max(0, f.bossHp) / f.bossMaxHp : 0;
  ui.bossName.textContent = `${v.boss.emoji} ${v.boss.name}`;
  ui.bossPct.textContent = `${Math.ceil(bossShare * 100)}%`;
  ui.bossFill.style.width = `${bossShare * 100}%`;
  if (f.enrage > 0) ui.tags.append(el('span', 'rd-tag hot', f.enrage >= 2 ? '🔥 Furious' : '😠 Enraged'));
  if (f.shielded) ui.tags.append(el('span', 'rd-tag cold', '🔷 Shielded'));
  if (f.rallied > 0) ui.tags.append(el('span', 'rd-tag gold', `✨ Rallied ×${f.rallyMultiplier} · ${plural(f.rallied, 'turn', 'turns')}`));
  ui.intentText.replaceChildren(...markdown(f.intent, v.names));

  ui.round.textContent = `Round ${f.round} of ${f.maxRounds}`;
  const picked = me?.picked ?? null;
  for (const button of ui.actions) {
    const action = button.dataset.action as RaidAction;
    button.classList.toggle('picked', picked === action);
    button.disabled = !f.open || picked !== null || f.problems[action] !== null;
  }
  // Why they can't act, or what they picked.
  const problems = Object.values(f.problems).filter((p): p is ActProblem => p !== null);
  const blocking = f.problems.attack && f.problems.guard ? f.problems.attack : f.problems.attack ?? f.problems.guard ?? f.problems.heal;
  // Only why they can't act (their pick shows on its circle, lit gold).
  ui.actNote.textContent = !picked && problems.length > 0 && blocking ? problemText(blocking, me?.cc?.turns ?? 1) : '';
  if (!f.open || picked !== null || healOpenRound !== f.round) healOpenRound = null;
  renderHealPick(v);

  ui.party.textContent = '';
  for (const p of f.players) {
    const li = el('li', `rd-member${p.userId === v.you ? ' you' : ''}${p.hp <= 0 ? ' down' : ''}${p.picked ? ' ready' : ''}`);
    li.title = nameOf(p.userId);
    const portrait = el('div', 'rd-portrait');
    portrait.append(avatar(p.userId, v));
    // What they picked this turn (or that they're down, or held by crowd control), on the portrait's corner.
    // Their pick shows as its action's picture (public/raid/actions); down, stunned and still choosing as signs.
    if (p.hp > 0 && p.canAct && p.picked) {
      const badge = el('span', 'rd-badge picked');
      const icon = el('img');
      icon.src = `/raid/actions/action_${p.picked}.png`;
      icon.alt = p.picked;
      icon.draggable = false;
      badge.append(icon);
      portrait.append(badge);
    } else {
      const sign = p.hp <= 0 ? '💀' : !p.canAct ? '💫' : f.open ? '…' : '';
      if (sign) portrait.append(el('span', 'rd-badge', sign));
    }
    if (p.cc && p.hp > 0) portrait.append(el('span', 'rd-cc', `${CC_NAME[p.cc.effect].split(' ')[0]}${p.cc.turns}`));
    // Under the portrait, as in a game's party bar: their name on the left and their HP on the right, over the bar.
    const stats = el('div', 'rd-member-stats');
    stats.append(el('span', 'rd-member-name', v.names[p.userId] ?? 'Someone'), el('span', 'rd-member-hp', fmt(Math.max(0, p.hp))));
    li.append(portrait, stats, hpBar(p.hp, p.maxHp, 'rd-member-bar'), buffRow(p, f));
    ui.party.append(li);
  }

  const atBottom = ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 24;
  ui.log.textContent = '';
  for (const line of f.log) {
    const li = el('li');
    li.append(...markdown(line, v.names));
    ui.log.append(li);
  }
  if (f.log.length === 0) ui.log.append(el('li', 'rd-muted', 'Nothing yet. Pick your moves!'));
  if (atBottom) ui.log.scrollTop = ui.log.scrollHeight;
}

function renderHealPick(v: RaidView): void {
  const f = v.fight!;
  ui.healPick.hidden = healOpenRound !== f.round;
  if (ui.healPick.hidden) return;
  ui.healOptions.textContent = '';
  /** One choice: a circle (their picture, or the word Auto), their name under it, and their HP. */
  const option = (face: HTMLElement, name: string, target: string | undefined, hp: { hp: number; maxHp: number } | null, className = ''): void => {
    const button = el('button', `rd-heal-option ${className}`);
    button.type = 'button';
    button.title = hp ? `Heal ${name} (${hp.hp <= 0 ? 'down' : `${fmt(hp.hp)}/${fmt(hp.maxHp)} HP`})` : 'Heal whoever needs it most';
    const circle = el('span', 'rd-heal-face');
    circle.append(face);
    if (hp && hp.hp <= 0) circle.append(el('span', 'rd-badge', '💀'));
    button.append(circle);
    if (name) button.append(el('span', 'rd-heal-name', name));
    if (hp) button.append(hpBar(hp.hp, hp.maxHp, 'rd-heal-bar'));
    button.addEventListener('click', () => {
      healOpenRound = null;
      send(target === undefined ? { t: 'act', action: 'heal' } : { t: 'act', action: 'heal', target });
      if (view) render(view);
    });
    ui.healOptions.append(button);
  };
  // First, let the bot choose; then everyone hurt, the worst first.
  option(el('span', 'rd-heal-auto', 'Auto'), '', undefined, null, 'auto');
  const share = (p: { hp: number; maxHp: number }): number => p.hp / p.maxHp;
  for (const p of f.players.filter((q) => q.hp < q.maxHp).sort((a, b) => share(a) - share(b))) {
    option(avatar(p.userId, v), p.userId === v.you ? 'You' : (v.names[p.userId] ?? 'Someone'), p.userId, p, p.hp <= 0 ? 'down' : '');
  }
}

function renderOver(v: RaidView): void {
  const o = v.over!;
  const b = v.boss.name;
  const titles = { won: `🏆 ${b} defeated!`, wiped: `💀 The party fell`, fled: `💨 ${b} got away`, no_players: `${b} went back to sleep`, called_off: 'The raid was called off' };
  ui.overTitle.textContent = titles[o.end];
  const reward = o.reward ? ` Everyone who fought gets ${fmt(o.reward.points)} points${o.reward.tokens ? `, ${plural(o.reward.tokens, 'token', 'tokens')}` : ''}${o.reward.gems ? ` and ${plural(o.reward.gems, 'komaGem', 'komaGems')}` : ''}.` : '';
  ui.overText.textContent =
    o.end === 'won'
      ? `Beaten in ${plural(o.rounds, 'round', 'rounds')}${o.lastHit ? `, the final blow by ${nameOf(o.lastHit)}` : ''}.${reward}`
      : o.end === 'wiped' || o.end === 'fled'
        ? `After ${plural(o.rounds, 'round', 'rounds')}, with ${fmt(o.bossHp)} / ${fmt(o.bossMaxHp)} HP left.`
        : o.end === 'no_players'
          ? 'Nobody joined the raid in time.'
          : 'Something went wrong, so the raid was called off and the week freed up. Points spent or stolen were given back.';
  ui.overRanking.textContent = '';
  const total = o.ranking.reduce((sum, r) => sum + r.damage, 0);
  for (const r of o.ranking) {
    const li = el('li', r.userId === v.you ? 'you' : '', nameOf(r.userId));
    li.append(el('span', 'rd-dmg', `${fmt(r.damage)} dmg · ${total > 0 ? Math.round((r.damage / total) * 100) : 0}%`));
    ui.overRanking.append(li);
  }
}

/** The countdowns: the lobby closing, and the turn's time running out. */
function tick(): void {
  const now = Date.now();
  if (view?.phase === 'lobby' && view.lobby) {
    const s = Math.max(0, Math.ceil((view.lobby.closesAt - now) / 1000));
    ui.lobbyTimer.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
  }
  if (view?.phase === 'fight' && view.fight) {
    const f = view.fight;
    if (f.open) {
      const left = Math.max(0, f.endsAt - now);
      ui.turnText.textContent = `${Math.ceil(left / 1000)}s left`;
      ui.turnFill.style.width = `${Math.min(100, (left / turnLength(f.endsAt)) * 100)}%`;
    } else {
      ui.turnText.textContent = 'Resolving…';
      ui.turnFill.style.width = '0%';
    }
  }
}
setInterval(tick, 250);

/** How long this turn is (the first time the page saw it open, and when it ends), for the timer bar. */
const turnStarts = new Map<number, number>();
function turnLength(endsAt: number): number {
  let started = turnStarts.get(endsAt);
  if (started === undefined) {
    started = Date.now();
    turnStarts.set(endsAt, started);
  }
  return Math.max(1000, endsAt - started);
}

// ---------------------------------------------------------------------------
// Pressing things

ui.start.addEventListener('click', () => {
  ui.start.disabled = true;
  send({ t: 'start' });
});
ui.join.addEventListener('click', () => send({ t: 'join' }));
ui.leave.addEventListener('click', () => send({ t: 'leave' }));
ui.begin.addEventListener('click', () => send({ t: 'begin' }));
for (const button of ui.actions) {
  button.addEventListener('click', () => {
    const action = button.dataset.action as RaidAction;
    const f = view?.fight;
    if (!f) return;
    // Heal: ask who, when anyone is hurt (with nobody hurt there's nothing to pick).
    if (action === 'heal' && f.players.some((p) => p.hp < p.maxHp)) {
      healOpenRound = healOpenRound === f.round ? null : f.round;
      if (view) render(view);
      return;
    }
    send({ t: 'act', action });
  });
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let finished = false;
let retries = 0;
const RETRY_MAX_MS = 5000;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the raid again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The raid is open in another tab or window.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
};

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  else toast('Not connected to the bot right now.');
}

function receive(message: ServerMessage): void {
  if (message.t === 'error') {
    finished = true;
    const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
    showMessage(title, text);
    setConn('Disconnected', 'bad');
    return;
  }
  if (message.t === 'answer') {
    if (message.to === 'start') ui.start.disabled = false;
    const text = answerText(message.code);
    if (text) toast(text);
    else if (message.to === 'start') toast("The raid's lobby is up! Join in.");
    return;
  }
  // Anything else (like the online list's watcher count) isn't the raid.
  if (message.t === 'raid') render(message.view);
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
    // Keep trying for as long as the page is open (the bot may be restarting), waiting longer each time.
    const wait = Math.min(RETRY_MAX_MS, 500 * 2 ** retries++);
    setConn('Reconnecting…', 'bad');
    setTimeout(connect, wait);
  });
}

soundButton('raid-muted', setMuted);
// On a phone (or a short screen) the log starts folded away, leaving the boss and the party in view.
if (window.matchMedia('(max-width: 700px), (max-height: 520px)').matches) ui.logPanel.open = false;

/*
 * Phones play the raid sideways, filling the screen like a game. Held upright, a cover asks them to
 * turn it (raid.css); where the browser allows it (Android), its button goes full screen and locks the
 * screen to landscape, which turns it for them. Held sideways, the first tap goes full screen.
 */
const touch = window.matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;
const canFullscreen = typeof root.requestFullscreen === 'function';
const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;

async function playLandscape(): Promise<void> {
  try {
    if (!document.fullscreenElement) await root.requestFullscreen({ navigationUI: 'hide' });
    await orientation?.lock?.('landscape');
  } catch {
    // Not allowed here (or turned down): turning the phone by hand still works.
  }
}

if (touch && canFullscreen) {
  const go = $<HTMLButtonElement>('rotate-go');
  go.hidden = typeof orientation?.lock !== 'function';
  go.addEventListener('click', () => void playLandscape());
  document.addEventListener(
    'pointerdown',
    () => {
      if (window.matchMedia('(orientation: landscape)').matches && !document.fullscreenElement) void playLandscape();
    },
    { once: true },
  );
}

if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Raid, or use the Play on the web button on the raid in Discord.');
} else {
  connect();
  startLive({ mount: barSlot(), api, auth: () => `Game ${token}`, newTab: true });
}
