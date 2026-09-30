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
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  resultRows: $('result-rows'),
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

/**
 * Puts the boss's picture up once it's loaded and decoded, so the old one stays until the new one is
 * ready (swapping the src straight away blanks it for a moment: a flash as the fight ends and the boss
 * changes its look). A newer picture asked for meanwhile wins.
 */
async function showPicture(url: string): Promise<void> {
  const next = new Image();
  next.src = url;
  await next.decode().catch(() => {});
  if (url !== pictureShown) return;
  for (const img of [ui.picture, ui.battlePicture, ui.battleBackdrop]) img.src = url;
}
/** Heal's "who?" is open (for this round). */
let healOpenRound: number | null = null;
/** How many raiders the party row shows at once; with more, a button swaps between them (in the order they joined). */
const PARTY_PAGE = 4;
/** Which of those pages the party row shows. */
let partyPage = 0;
/**
 * The party row's lasting parts: the swap button (with more raiders than fit) and a layer for each four
 * of them, stacked. They stay from one drawing to the next, so a layer glides between front and back.
 */
const swapSlot = el('li', 'rd-swap-slot');
const swapButton = el('button', 'rd-swap');
const swapPage = el('span', 'rd-swap-page');
const partyStack = el('li', 'rd-party-stack');
const partyLayers: HTMLUListElement[] = [];
swapButton.type = 'button';
swapButton.title = 'Show the other raiders';
// A camera with three arrows round it (drawn here, like a game's switch-view button).
swapButton.innerHTML = '<svg class="rd-swap-icon" viewBox="0 0 64 64" aria-hidden="true" fill="currentColor"><path d="M40.6 8.5A25 25 0 0 1 56.6 36.3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M55.8 41.3L54.7 31.2L60.2 32.1Z"/><path d="M48.1 51.2A25 25 0 0 1 15.9 51.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M12.1 47.9L21.3 52.1L17.8 56.3Z"/><path d="M7.4 36.3A25 25 0 0 1 23.4 8.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M28.1 6.8L19.9 12.7L18.0 7.6Z"/><path d="M21 25h5l2.5-3.5h7L38 25h5a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 43 41H21a2.5 2.5 0 0 1-2.5-2.5v-11A2.5 2.5 0 0 1 21 25Z"/><circle cx="32" cy="33" r="5.2" fill="#151823"/><circle cx="32" cy="33" r="3" /></svg>';
swapButton.addEventListener('click', () => {
  partyPage++;
  if (view) render(view);
});
swapSlot.append(swapButton, swapPage);

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

/** A raider in the party row: their picture with their pick, name and HP, HP bar and buffs. `front`: in the row in front (the one to pick from). */
function memberItem(p: RaidFightView['players'][number], f: RaidFightView, v: RaidView, front: boolean): HTMLElement {
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
  // Picking who to heal: a hurt raider here can be picked too (the swap button still shows the others).
  if (front && healOpenRound === f.round) {
    if (p.hp < p.maxHp) {
      li.classList.add('heal-target');
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Heal ${nameOf(p.userId)}`);
      li.title = `Heal ${nameOf(p.userId)}`;
      li.addEventListener('click', () => healAt(p.userId));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          healAt(p.userId);
        }
      });
    } else {
      li.classList.add('heal-off');
    }
  }
  return li;
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

/** How long the battle stays up once the fight ends, before the end screen fades in over it. */
const END_PAUSE_MS = 500;
/** The end screen is showing (after its pause). */
let resultShown = false;
/** The pause before it, while it runs. */
let endTimer: ReturnType<typeof setTimeout> | null = null;

function render(next: RaidView): void {
  const before = view?.phase ?? null;
  view = next;
  const picture = api + next.picture;
  if (picture !== pictureShown) {
    pictureShown = picture;
    void showPicture(picture);
  }
  ui.picture.alt = next.boss.name;
  ui.battlePicture.alt = next.boss.name;
  ui.bossTitle.textContent = `· ${next.boss.emoji} ${next.boss.name}`;

  const fighting = next.phase === 'fight';
  // A fight fought out ends on its own screen, VICTORY or DEFEAT (one that never started keeps the plain one).
  const ended = next.phase === 'over' && next.over !== null && ['won', 'wiped', 'fled'].includes(next.over.end);
  // The fight just ended here: the battle stays up a moment (its last blow, the boss's new look), then the end fades in.
  if (!ended) {
    resultShown = false;
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
  } else if (!resultShown && !endTimer) {
    if (before === 'fight') {
      endTimer = setTimeout(() => {
        endTimer = null;
        resultShown = true;
        if (view) render(view);
      }, END_PAUSE_MS);
    } else {
      resultShown = true;
    }
  }
  const holding = ended && !resultShown;
  // The end screen goes over the battle's scene (the boss stays put under it) as the battle's own parts fade out.
  ui.layout.hidden = fighting || ended;
  ui.battle.hidden = !(fighting || ended);
  ui.battle.classList.toggle('ending', holding);
  ui.battle.classList.toggle('concluded', ended && resultShown);
  ui.result.hidden = !(ended && resultShown);
  document.body.classList.toggle('rd-fighting', fighting || ended);
  ui.idle.hidden = next.phase !== 'idle';
  ui.lobby.hidden = next.phase !== 'lobby';
  ui.over.hidden = next.phase !== 'over';
  ui.tags.textContent = '';

  if (next.phase === 'idle' && next.idle) renderIdle(next);
  if (next.phase === 'lobby' && next.lobby) renderLobby(next);
  if (next.phase === 'fight' && next.fight) renderFight(next);
  if (next.phase === 'over' && next.over) renderOver(next);
  if (ended) renderResult(next);
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

  // More raiders than fit show four at a time, in the order they joined: the four in front, the next
  // four behind them (up and to the left, faded), and a button on the left swapping them round.
  const pages = Math.ceil(f.players.length / PARTY_PAGE);
  partyPage = pages > 1 ? partyPage % pages : 0;
  if (!partyStack.isConnected) ui.party.replaceChildren(swapSlot, partyStack);
  swapSlot.hidden = pages < 2;
  ui.party.classList.toggle('stacked', pages > 1);
  swapButton.setAttribute('aria-label', `Show the other raiders (${partyPage + 1} of ${pages})`);
  swapPage.textContent = `${partyPage + 1}/${pages}`;
  while (partyLayers.length < pages) {
    const layer = el('ul', 'rd-party-layer');
    partyLayers.push(layer);
    partyStack.append(layer);
  }
  partyLayers.forEach((layer, page) => {
    // The layer stays (so it glides when it moves front or back); what's in it is drawn afresh.
    const role = page === partyPage ? 'front' : pages > 1 && page === (partyPage + 1) % pages ? 'back' : 'off';
    layer.className = `rd-party-layer ${role}`;
    layer.inert = role !== 'front';
    layer.replaceChildren(...f.players.slice(page * PARTY_PAGE, (page + 1) * PARTY_PAGE).map((p) => memberItem(p, f, v, role === 'front')));
  });

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

/** Heals `target` (undefined: whoever needs it most, the bot's pick), and closes the picker. */
function healAt(target: string | undefined): void {
  healOpenRound = null;
  send(target === undefined ? { t: 'act', action: 'heal' } : { t: 'act', action: 'heal', target });
  if (view) render(view);
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
    button.addEventListener('click', () => healAt(target));
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

/** The end of a fight fought out: VICTORY or DEFEAT, and what each raider did, the most damage first. */
function renderResult(v: RaidView): void {
  const o = v.over!;
  const won = o.end === 'won';
  ui.result.classList.toggle('won', won);
  ui.resultTitle.textContent = won ? 'Victory' : 'Defeat';
  const reward = o.reward
    ? ` Everyone who fought gets ${fmt(o.reward.points)} points${o.reward.tokens ? `, ${plural(o.reward.tokens, 'token', 'tokens')}` : ''}${o.reward.gems ? ` and ${plural(o.reward.gems, 'komaGem', 'komaGems')}` : ''}.`
    : '';
  ui.resultText.textContent = won
    ? `${v.boss.name} beaten in ${plural(o.rounds, 'round', 'rounds')}${o.lastHit ? `, the final blow by ${nameOf(o.lastHit)}` : ''}.${reward}`
    : o.end === 'fled'
      ? `${v.boss.name} got away after ${plural(o.rounds, 'round', 'rounds')}, with ${fmt(o.bossHp)} / ${fmt(o.bossMaxHp)} HP left.`
      : `The party fell after ${plural(o.rounds, 'round', 'rounds')}, with ${v.boss.name} on ${fmt(o.bossHp)} / ${fmt(o.bossMaxHp)} HP.`;

  ui.resultRows.textContent = '';
  const rows = [...o.players].sort((a, b) => b.damage - a.damage);
  for (const p of rows) {
    const tr = el('tr', p.userId === v.you ? 'you' : '');
    // Their picture and name together in the first cell (in a box of their own, so the cell stays a table cell).
    const who = el('div', 'rd-result-who');
    const face = el('span', 'rd-result-face');
    face.append(avatar(p.userId, v));
    who.append(face, el('span', 'rd-result-name', v.names[p.userId] ?? 'Someone'));
    if (p.userId === o.lastHit) who.append(el('span', 'rd-result-star', '⭐'));
    const whoCell = el('td');
    whoCell.append(who);
    tr.append(whoCell, el('td', 'num dmg', fmt(p.damage)), el('td', 'num heal', fmt(p.healed)), el('td', 'num guard', fmt(p.mitigated)));
    ui.resultRows.append(tr);
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
