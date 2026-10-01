import '../shared/style.css';
// The dropdown's chevron (.dd-arrow), on the end screen's sorted column.
import '../shared/dropdown.css';
import { barSlot, setConn, soundButton } from '../shared/frame';
import { apiFromSocket, startLive } from '../shared/live';
import { setMuted } from '../shared/sfx';
import { holdReveal } from '../shared/transition';
import { markdown } from './markdown';
import { popupClosed } from '../shared/items/sfx';
import { play } from './sfx';
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
  battle: $('battle'),
  battlePicture: $<HTMLImageElement>('battle-picture'),
  battleBackdrop: $<HTMLImageElement>('battle-backdrop'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  resultSorts: [...document.querySelectorAll<HTMLButtonElement>('.rd-sort')],
  moreStats: $<HTMLButtonElement>('more-stats'),
  statsPop: $('stats-pop'),
  statsPick: $('stats-pick'),
  statsTitle: $('stats-title'),
  statsRows: $('stats-rows'),
  statsAxis: $('stats-axis'),
  statsClose: $<HTMLButtonElement>('stats-close'),
  resultRows: $('result-rows'),
  tags: $('boss-tags'),
  bossName: $('boss-name'),
  bossPct: $('boss-pct'),
  bossFill: $('boss-fill'),
  intentText: $('intent-text'),
  prep: $('prep'),
  prepBackdrop: $<HTMLImageElement>('prep-backdrop'),
  prepPicture: $<HTMLImageElement>('prep-picture'),
  prepBossName: $('prep-boss-name'),
  prepMoves: $('prep-moves'),
  prepPhases: $('prep-phases'),
  prepRewards: $('prep-rewards'),
  prepSlots: $('prep-slots'),
  prepStatus: $('prep-status'),
  start: $<HTMLButtonElement>('start'),
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
  party: $('party'),
  logPanel: $<HTMLDetailsElement>('log-panel'),
  log: $('log'),
  toast: $('toast'),
  message: $('message'),
  gearPop: $('gear-pop'),
  gearFit: $('gear-pop').querySelector('.rd-gear-fit') as HTMLElement,
  gearFrame: $<HTMLIFrameElement>('gear-frame'),
  gearClose: $<HTMLButtonElement>('gear-close'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
};

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t');
const server = params.get('s');
const api = server ? apiFromSocket(server) : '';

/**
 * The loading screen stays over the page until its first screen is drawn, the boss's picture in it (the
 * frame's own hold lets go as soon as it connects, before the raid has been sent). Anything that stops
 * it drawing (no link, an error, the connection lost) lets go too; the transition gives up by itself after a while.
 */
const firstPaint = holdReveal();

function showMessage(title: string, text: string): void {
  firstPaint();
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
  for (const img of [ui.battlePicture, ui.battleBackdrop, ui.prepPicture, ui.prepBackdrop]) img.src = url;
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
      li.dataset.sfx = 'own';
      li.addEventListener('click', () => healAt(p.userId));
      li.addEventListener('pointerenter', () => play('hover'));
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

/**
 * What they picked this turn, to play as it lands. Kept from their click (once the bot takes it) as
 * well as from the raid: with everyone in, the turn closes at once, in the same raid it's sent next.
 */
let lastPick: RaidAction | null = null;
/** The pick on its way to the bot. */
let pendingPick: RaidAction | null = null;

function render(next: RaidView): void {
  const before = view?.phase ?? null;
  // A heal (or a revive) landing on them as the round resolved: their HP went up (nothing else raises it).
  const hpBefore = view?.fight?.players.find((p) => p.userId === next.you)?.hp;
  const hpNow = next.fight?.players.find((p) => p.userId === next.you)?.hp;
  if (hpBefore !== undefined && hpNow !== undefined && hpNow > hpBefore) play('heal');
  // Their attack, guard or support landing as the round resolved: the turn closed (no more picks), or the fight ended on it.
  const wasOpen = view?.fight?.open === true;
  const mine = next.fight?.players.find((p) => p.userId === next.you);
  if (next.fight?.open && mine?.picked) lastPick = mine.picked;
  const resolved = wasOpen && (next.fight ? !next.fight.open : next.phase === 'over');
  if (resolved && lastPick && lastPick !== 'heal') play(lastPick);
  if (resolved || !next.fight) lastPick = null;
  view = next;
  const picture = api + next.picture;
  if (picture !== pictureShown) {
    pictureShown = picture;
    const shown = showPicture(picture);
    // The first screen: uncovered once it's drawn, the picture in it.
    if (before === null) void shown.then(() => requestAnimationFrame(() => requestAnimationFrame(firstPaint)));
  }
  ui.battlePicture.alt = next.boss.name;
  ui.bossTitle.textContent = `· ${next.boss.emoji} ${next.boss.name}`;

  const fighting = next.phase === 'fight';
  // A fight fought out ends on its own screen, VICTORY or DEFEAT (one that never started shows the party screen).
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
  // Before the fight (not fought yet this week, the lobby open, or a lobby that never came to a fight): the party screen.
  const preparing = next.phase === 'lobby' || (next.phase === 'idle' && next.idle !== null) || (next.phase === 'over' && next.over !== null && !ended);
  ui.prep.hidden = !preparing;
  ui.battle.hidden = !(fighting || ended);
  ui.battle.classList.toggle('ending', holding);
  ui.battle.classList.toggle('concluded', ended && resultShown);
  ui.result.hidden = !(ended && resultShown);
  document.body.classList.toggle('rd-fighting', fighting || ended);
  ui.tags.textContent = '';

  if (preparing) renderPrep(next);
  // The fight starting (or the lobby going, or the end screen) takes the gear's popup down with the screen it was opened from.
  else if (before !== next.phase) closeGear(true);
  if (!ended) closeStats(true);
  else if (!ui.statsPop.hidden) renderStats(next);
  if (next.phase === 'fight' && next.fight) renderFight(next);
  if (ended) renderResult(next);
  tick();
}

/** The lobby's countdown, in the party screen's status line (tick() keeps it going). */
let lobbyTimer: HTMLElement | null = null;
/** The last boss the party screen was drawn for (its moves only change with it). */
let prepBoss = '';

/** The raiders' character (everyone's the same one for now). */
const SPRITE = '/characters/tsuri/sprite.png';

/** How a lobby that never came to a fight went. */
const LAST_LOBBY: Record<'no_players' | 'called_off', string> = {
  no_players: 'Nobody joined the last lobby in time.',
  called_off: 'The last raid was called off (something went wrong), and anything spent was given back.',
};

/**
 * An empty seat's card back, in gold line art on the dark card (5 wide by 9 high, like the card): a tall
 * diamond from edge to edge with a finer one inside it, a sun in the middle (long rays up and down,
 * shorter across and between, round a ringed disc with swirls in it), and a curl in every corner.
 */
const CARD_BACK = (() => {
  const gold = '#c9a867';
  const ray = (points: string, angle = 0): string => `<polygon points="${points}" transform="rotate(${angle} 50 90)" />`;
  const corner = (transform: string): string =>
    `<g transform="${transform}"><path d="M5 26 Q5 5 26 5" /><path d="M9 9 q8 1 7 9 q-1 5 -6 3.5" /><path d="M9 9 q1 8 9 7 q5 -1 3.5 -6" /><circle cx="9" cy="9" r="1.4" fill="${gold}" stroke="none" /></g>`;
  return `<svg viewBox="0 0 100 180" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="rd-back-fill" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3b2b13" /><stop offset="1" stop-color="#171208" /></radialGradient></defs>
    <g fill="none" stroke="${gold}" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="50,4 96,90 50,176 4,90" fill="url(#rd-back-fill)" stroke-opacity="0.6" stroke-width="1.1" />
      <polygon points="50,13 88.5,90 50,167 11.5,90" stroke-opacity="0.28" stroke-width="0.6" />
      <g fill="${gold}" fill-opacity="0.5" stroke="none">
        ${ray('50,30 52.8,70 50,76 47.2,70')}${ray('50,30 52.8,70 50,76 47.2,70', 180)}
        ${ray('50,58 52.4,72 50,76 47.6,72', 90)}${ray('50,58 52.4,72 50,76 47.6,72', 270)}
        ${[45, 135, 225, 315].map((a) => ray('50,64 51.8,74 50,76 48.2,74', a)).join('')}
      </g>
      <circle cx="50" cy="90" r="17" fill="#140e06" stroke-opacity="0.65" stroke-width="1.2" />
      <circle cx="50" cy="90" r="13.5" stroke-opacity="0.3" stroke-width="0.5" />
      <g stroke-opacity="0.5" stroke-width="0.7">
        <path d="M50 90 c0 -2.4 3 -2.4 3 0 c0 4 -6 4 -6 0 c0 -6 9 -6 9 0 c0 8 -12 8 -12 0" />
        <path d="M40.5 83 q4 -3.5 7 0.5" /><path d="M59.5 97 q-4 3.5 -7 -0.5" />
        <path d="M41 98 q-1.5 -4.5 2.5 -6.5" /><path d="M59 82 q1.5 4.5 -2.5 6.5" />
      </g>
      <g stroke-opacity="0.55" stroke-width="1.1">
        ${corner('')}${corner('translate(100 0) scale(-1 1)')}${corner('translate(0 180) scale(1 -1)')}${corner('translate(100 180) scale(-1 -1)')}
      </g>
    </g>
  </svg>`;
})();

/** An empty seat's card back (CARD_BACK). */
function cardBack(): HTMLElement {
  const back = el('span', 'rd-slot-back');
  back.innerHTML = CARD_BACK;
  return back;
}

/**
 * The party screen, before the fight: the boss and what it does on the left, the party so far on the
 * right (a card for each raider, the empty seats face down), and what there is to do: start the week's
 * raid, or join, leave and (the host) start it now.
 */
function renderPrep(v: RaidView): void {
  if (prepBoss !== v.boss.id) {
    prepBoss = v.boss.id;
    ui.prepBossName.textContent = v.boss.name;
    // A bot older than the page doesn't send what the boss does: the sections are left out.
    const brief = v.brief ?? { phases: [], moves: [], rewards: '' };
    const list = (ul: HTMLElement, lines: string[]): void => {
      const shown = lines.filter((line) => line.trim() !== '');
      ul.replaceChildren(...shown.map((line) => {
        const li = el('li');
        li.append(...markdown(line, v.names));
        return li;
      }));
      ul.hidden = shown.length === 0;
      (ul.previousElementSibling as HTMLElement).hidden = shown.length === 0;
    };
    list(ui.prepMoves, brief.moves);
    list(ui.prepPhases, brief.phases);
    // The rewards in rows too, a line each.
    list(ui.prepRewards, brief.rewards.split('\n'));
  }

  const lobby = v.lobby;
  const players = lobby?.players ?? [];
  const host = players[0] ?? null;
  // Four seats at least (the empty ones face down); past four, the row scrolls. An empty seat takes
  // them in: joining the lobby, or, with no raid up yet, starting it with them in it.
  const seats = Math.max(4, players.length);
  const takeSeat = lobby ? (players.includes(v.you) ? null : () => send({ t: 'join' })) : v.idle?.canStart ? startRaid : null;
  ui.prepSlots.replaceChildren(
    ...Array.from({ length: seats }, (_, i) => {
      const userId = players[i];
      if (userId === undefined) {
        if (takeSeat) {
          const seat = el('button', 'rd-slot empty open');
          seat.type = 'button';
          seat.setAttribute('aria-label', 'Join the raid');
          seat.append(cardBack(), el('span', 'rd-slot-join', 'Join'));
          seat.addEventListener('click', takeSeat);
          return seat;
        }
        const empty = el('div', 'rd-slot empty');
        empty.append(cardBack());
        return empty;
      }
      // A raider's card shows their gear.
      const card = el('button', `rd-slot${userId === v.you ? ' you' : ''}`);
      card.type = 'button';
      card.title = `${nameOf(userId)}: see their gear`;
      card.addEventListener('click', () => openGear(v, players, userId));
      // Their class, in the top left corner: not there yet, so a question mark.
      const badge = el('span', 'rd-slot-class', '?');
      badge.title = 'Class: ?';
      const sprite = el('img', 'rd-slot-sprite');
      sprite.src = SPRITE;
      sprite.alt = '';
      sprite.draggable = false;
      card.append(badge, el('span', 'rd-slot-glow'), sprite, el('span', 'rd-slot-name', v.names[userId] ?? 'Someone'));
      if (userId === host) card.append(el('span', 'rd-slot-host', 'Host'));
      return card;
    }),
  );

  // What's going on, and what there is to do.
  const reset = new Date(v.resetsAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  const inIt = players.includes(v.you);
  // How the last lobby went, when it never came to a fight.
  const last = v.idle?.last ? `${LAST_LOBBY[v.idle.last]} ` : '';
  ui.start.hidden = true;
  ui.join.hidden = true;
  ui.leave.hidden = true;
  ui.begin.hidden = true;
  lobbyTimer = null;
  if (lobby) {
    lobbyTimer = el('b');
    ui.prepStatus.replaceChildren('The fight starts in ', lobbyTimer, ', or when the host starts it. ', el('span', 'rd-muted-inline', `Boss HP ${fmt(lobby.bossHp)}, growing with every raider.`));
    ui.join.hidden = inIt;
    ui.leave.hidden = !inIt;
    ui.begin.hidden = host !== v.you;
  } else if (v.phase === 'over') {
    // A bot from before `idle.last` says a lobby that never came to a fight is over, and nothing more.
    ui.prepStatus.textContent = `${LAST_LOBBY[v.over?.end === 'called_off' ? 'called_off' : 'no_players']} Start it again in Discord with the raid command, or come back in a little while.`;
  } else if (v.idle?.week === 'busy') {
    ui.prepStatus.textContent = 'A raid is starting in Discord. It will show up here in a moment.';
  } else if (v.idle?.canStart) {
    ui.prepStatus.textContent = `${last}This week's boss hasn't been fought yet. Join to start the raid: its lobby goes up in the server, and everyone can join, here or in Discord. The week resets ${reset}.`;
    ui.start.hidden = false;
  } else {
    ui.prepStatus.textContent = `${last}This week's boss hasn't been fought yet. This server has no bot channel, so start the raid in Discord with the raid command, then join it here. The week resets ${reset}.`;
  }
}

// ---------------------------------------------------------------------------
// A raider's gear

/**
 * How big the gear's frame is laid out, at least: the gear page's computer layout (roster, character,
 * armory side by side) needs about this much. Smaller popups (a phone on its side) show it scaled down.
 */
const GEAR_LAYOUT_WIDTH = 1100;
const GEAR_LAYOUT_HEIGHT = 640;

/** Shows `userId`'s gear, with the party (`players`, in the order they joined) to go between. */
/** Whether a popup (a raider's gear, More stats) is up: the raid behind it stops blurring meanwhile (raid.css). */
function popupShown(): void {
  document.body.classList.toggle('rd-popup-open', !ui.gearPop.hidden || !ui.statsPop.hidden);
}

/**
 * Shows `userId`'s gear, with the party (`players`, in their order) to go between. `fought`: their gear
 * as they fought the raid (the end screen), rather than as it is now.
 */
function openGear(v: RaidView, players: string[], userId: string, fought = false): void {
  if (!token || !server) return;
  const party = players.map((id) => ({ id, name: v.names[id] ?? 'Someone', avatar: v.avatars[id], you: id === v.you || undefined }));
  const hash = new URLSearchParams({ t: token, s: server, p: JSON.stringify(party), w: userId, ...(fought ? { g: 'raid' } : {}) });
  ui.gearFrame.src = `${import.meta.env.BASE_URL}games/raid/gear/#${hash}`;
  ui.gearPop.hidden = false;
  popupShown();
  fitGear();
  ui.gearClose.focus();
}

/** Closes the gear popup, with the popup's closing sound unless `quiet` (the raid moving on took it down). */
function closeGear(quiet = false): void {
  if (ui.gearPop.hidden) return;
  if (!quiet) popupClosed();
  ui.gearPop.hidden = true;
  popupShown();
  ui.gearFrame.src = 'about:blank';
}

/** Lays the frame out at least GEAR_LAYOUT_WIDTH by GEAR_LAYOUT_HEIGHT, scaled to the popup's size. */
function fitGear(): void {
  if (ui.gearPop.hidden) return;
  const { width, height } = ui.gearFit.getBoundingClientRect();
  if (width === 0 || height === 0) return;
  const scale = Math.min(1, width / GEAR_LAYOUT_WIDTH, height / GEAR_LAYOUT_HEIGHT);
  ui.gearFrame.style.width = `${width / scale}px`;
  ui.gearFrame.style.height = `${height / scale}px`;
  ui.gearFrame.style.transform = scale < 1 ? `scale(${scale})` : '';
}

ui.gearClose.dataset.sfx = 'own';
ui.gearClose.addEventListener('click', () => closeGear());
// A click on the dark around the popup closes it too.
ui.gearPop.addEventListener('click', (event) => {
  if (event.target === ui.gearPop) closeGear();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeGear();
});
// Escape inside the frame, with nothing open there (./gear.ts).
window.addEventListener('message', (event) => {
  if (event.origin === location.origin && (event.data as { t?: string } | null)?.t === 'close-gear') closeGear();
});
window.addEventListener('resize', fitGear);

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
  // Healing someone else (or whoever needs it most): the heal's sound now. Healing themselves, it plays as it lands.
  if (target !== view?.you) play('heal');
  pendingPick = 'heal';
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
    button.dataset.sfx = 'own';
    button.addEventListener('click', () => healAt(target));
    button.addEventListener('pointerenter', () => play('hover'));
    ui.healOptions.append(button);
  };
  // First, let the bot choose; then everyone hurt, the worst first.
  option(el('span', 'rd-heal-auto', 'Auto'), '', undefined, null, 'auto');
  const share = (p: { hp: number; maxHp: number }): number => p.hp / p.maxHp;
  for (const p of f.players.filter((q) => q.hp < q.maxHp).sort((a, b) => share(a) - share(b))) {
    option(avatar(p.userId, v), p.userId === v.you ? 'You' : (v.names[p.userId] ?? 'Someone'), p.userId, p, p.hp <= 0 ? 'down' : '');
  }
}

/** ", with 800 / 2,211 HP left", when the boss's HP at the end is known (not for a raid read back from the database). */
const hpLeft = (o: { bossHp: number | null; bossMaxHp: number | null }): string =>
  o.bossHp === null || o.bossMaxHp === null ? '' : `, with ${fmt(o.bossHp)} / ${fmt(o.bossMaxHp)} HP left`;

/** The end of a fight fought out: VICTORY or DEFEAT, and what each raider did, the most damage first. */
function renderResult(v: RaidView): void {
  const o = v.over!;
  const won = o.end === 'won';
  ui.result.classList.toggle('won', won);
  ui.resultTitle.textContent = won ? 'Victory' : 'Defeat';
  // What the winners got, with the currencies' emojis (a bot from before sends only the numbers: in words then).
  const reward: (Node | string)[] = o.rewardText
    ? [' Everyone who fought gets ', ...markdown(o.rewardText, v.names)]
    : o.reward
      ? [` Everyone who fought gets ${fmt(o.reward.points)} points${o.reward.tokens ? `, ${plural(o.reward.tokens, 'token', 'tokens')}` : ''}${o.reward.gems ? ` and ${plural(o.reward.gems, 'komaGem', 'komaGems')}` : ''}`]
      : [];
  ui.resultText.replaceChildren(
    ...(won
      ? [`${v.boss.name} beaten in ${plural(o.rounds, 'round', 'rounds')}${o.lastHit ? `, the final blow by ${nameOf(o.lastHit)}` : ''}.`, ...reward]
      : [o.end === 'fled' ? `${v.boss.name} got away after ${plural(o.rounds, 'round', 'rounds')}${hpLeft(o)}.` : `The party fell after ${plural(o.rounds, 'round', 'rounds')}${hpLeft(o)}.`]),
  );

  // The columns' headers: which one it's sorted by, and which way.
  for (const button of ui.resultSorts) {
    const on = button.dataset.sort === resultSort.key;
    const th = button.parentElement as HTMLElement;
    th.setAttribute('aria-sort', on ? (resultSort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    button.classList.toggle('on', on);
    button.dataset.dir = on ? resultSort.dir : '';
  }

  ui.resultRows.textContent = '';
  const nameFor = (id: string): string => v.names[id] ?? 'Someone';
  const { key, dir } = resultSort;
  const rows = [...o.players].sort((a, b) => {
    const by = key === 'name' ? nameFor(a.userId).localeCompare(nameFor(b.userId), undefined, { sensitivity: 'base' }) : a[key] - b[key];
    return dir === 'asc' ? by : -by;
  });
  const party = o.players.map((p) => p.userId);
  for (const p of rows) {
    const tr = el('tr', p.userId === v.you ? 'you' : '');
    // A row shows their gear as they fought (when the bot kept it).
    if (o.gear) {
      tr.classList.add('open');
      tr.tabIndex = 0;
      tr.title = `${nameFor(p.userId)}: see their gear as they fought`;
      tr.addEventListener('click', () => openGear(v, party, p.userId, true));
      tr.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openGear(v, party, p.userId, true);
        }
      });
    }
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

// ---------------------------------------------------------------------------
// More stats

/** What one raider did, as the end screen gets it. */
type RaiderStats = NonNullable<RaidView['over']>['players'][number];

/** The stats More stats can draw, in groups down its left (more to come). */
const MORE_STATS: { group: string; key: Exclude<keyof RaiderStats, 'userId'>; label: string }[] = [
  { group: 'Healing', key: 'healedSelf', label: 'Healing Done' },
  { group: 'Healing', key: 'healedAllies', label: 'Ally Healing' },
  { group: 'Defense', key: 'mitigated', label: 'Damage Mitigated' },
  { group: 'Defense', key: 'damageTaken', label: 'Damage Taken' },
];
let moreStat: (typeof MORE_STATS)[number]['key'] = 'healedSelf';

/** A round top for the scale over `max`, and the step between its lines (1, 2 or 5 times a power of ten, about five of them). */
function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 10, step: 2 };
  const rough = max / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const f = rough / power;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
  return { top: Math.ceil(max / step) * step, step };
}

function renderStats(v: RaidView): void {
  const o = v.over;
  if (!o) return;
  // The choices, once: a radio for each stat, under its group's heading.
  if (!ui.statsPick.childElementCount) {
    let group = '';
    for (const stat of MORE_STATS) {
      if (stat.group !== group) {
        group = stat.group;
        ui.statsPick.append(el('p', 'rd-stats-group', group));
      }
      const label = el('label', 'rd-stats-option');
      const input = el('input');
      input.type = 'radio';
      input.name = 'more-stat';
      input.value = stat.key;
      input.addEventListener('change', () => {
        moreStat = stat.key;
        if (view) renderStats(view);
      });
      label.append(input, el('span', 'rd-stats-radio'), el('span', '', stat.label));
      ui.statsPick.append(label);
    }
  }
  for (const input of ui.statsPick.querySelectorAll<HTMLInputElement>('input')) input.checked = input.value === moreStat;
  const stat = MORE_STATS.find((s) => s.key === moreStat) ?? MORE_STATS[0]!;
  ui.statsTitle.textContent = stat.label;

  // Every raider in the order they joined, a bar each against the scale.
  const values = o.players.map((p) => ({ userId: p.userId, value: p[stat.key] ?? 0 }));
  const { top, step } = niceScale(Math.max(0, ...values.map((r) => r.value)));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const grid = el('div', 'rd-stats-grid');
  grid.setAttribute('aria-hidden', 'true');
  for (const tick of ticks) {
    const line = el('span');
    line.style.left = `${(tick / top) * 100}%`;
    grid.append(line);
  }
  ui.statsRows.replaceChildren(
    grid,
    ...values.map(({ userId, value }) => {
      const row = el('div', `rd-stats-row${userId === v.you ? ' you' : ''}`);
      row.title = `${nameOf(userId)}: ${fmt(value)}`;
      const face = el('span', 'rd-stats-face');
      face.append(avatar(userId, v));
      const track = el('span', 'rd-stats-track');
      const bar = el('span', 'rd-stats-bar');
      bar.style.width = `${(value / top) * 100}%`;
      track.append(bar, el('b', 'rd-stats-value', fmt(value)));
      row.append(face, track);
      return row;
    }),
  );
  ui.statsAxis.replaceChildren(
    ...ticks.map((tick) => {
      const label = el('span', '', fmt(tick));
      label.style.left = `${(tick / top) * 100}%`;
      return label;
    }),
  );
}

function openStats(): void {
  if (!view?.over) return;
  ui.statsPop.hidden = false;
  popupShown();
  renderStats(view);
  ui.statsClose.focus();
}

/** Closes More stats, with the popup's closing sound unless `quiet` (the end screen going took it down). */
function closeStats(quiet = false): void {
  if (ui.statsPop.hidden) return;
  if (!quiet) popupClosed();
  ui.statsPop.hidden = true;
  popupShown();
  ui.moreStats.focus({ preventScroll: true });
}

ui.moreStats.addEventListener('click', openStats);
ui.statsClose.dataset.sfx = 'own';
ui.statsClose.addEventListener('click', () => closeStats());
ui.statsPop.addEventListener('click', (event) => {
  if (event.target === ui.statsPop) closeStats();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && ui.gearPop.hidden) closeStats();
});

/** How the end screen's table is sorted: by one column, either way (most damage first, to start with). */
type ResultSortKey = 'name' | 'damage' | 'healed' | 'mitigated';
let resultSort: { key: ResultSortKey; dir: 'asc' | 'desc' } = { key: 'damage', dir: 'desc' };

for (const button of ui.resultSorts) {
  button.addEventListener('click', () => {
    const key = button.dataset.sort as ResultSortKey;
    // The same column again: the other way round. Another: most first (names from A).
    resultSort = key === resultSort.key ? { key, dir: resultSort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' };
    if (view?.over) renderResult(view);
  });
}

/** The countdowns: the lobby closing, and the turn's time running out. */
function tick(): void {
  const now = Date.now();
  if (view?.phase === 'lobby' && view.lobby && lobbyTimer) {
    const s = Math.max(0, Math.ceil((view.lobby.closesAt - now) / 1000));
    lobbyTimer.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
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

// The party's row scrolls sideways past four raiders: a mouse's wheel scrolls it too.
ui.prepSlots.addEventListener(
  'wheel',
  (event) => {
    const row = ui.prepSlots;
    if (row.scrollWidth <= row.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    row.scrollBy({ left: event.deltaY, behavior: 'smooth' });
  },
  { passive: false },
);

function startRaid(): void {
  if (ui.start.disabled) return;
  ui.start.disabled = true;
  send({ t: 'start' });
}

ui.start.addEventListener('click', startRaid);
ui.join.addEventListener('click', () => send({ t: 'join' }));
ui.leave.addEventListener('click', () => send({ t: 'leave' }));
ui.begin.addEventListener('click', () => send({ t: 'begin' }));
for (const button of ui.actions) {
  // Picking an action has its own sound (./sfx.ts), not the plain click's.
  button.dataset.sfx = 'own';
  // Over an action that can be picked now.
  button.addEventListener('pointerenter', () => {
    if (!button.disabled) play('actionHover');
  });
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
    // Heal's own sound plays with who it's for (healAt), and as it lands on them.
    if (action !== 'heal') play(action);
    pendingPick = action;
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
    if (message.to === 'act') {
      if (message.code === 'ok' && pendingPick) lastPick = pendingPick;
      pendingPick = null;
    }
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
    firstPaint();
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
