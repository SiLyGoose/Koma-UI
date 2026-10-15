import { send } from '../connection';
import { el, markdown } from '../widgets';
import { openGear } from '../gear/gear-popup';
import type { RaidView } from '../../protocol/raid';
import { nameOf, state } from '../state';
import { ui } from '../ui';
import { fmt } from '../words';
import { cardBack } from './card-back';
import { openLevel } from './level';

/** The last boss and difficulty the party screen was drawn for (what it does and gives only change with them). */
let prepBoss = '';

/** The phone's notice that the week's boss hasn't been fought yet was tapped away (it comes up once a visit). */
let noticeSeen = false;

/** The raiders' character (everyone's the same one for now). */
const SPRITE = '/characters/tsuri/sprite.png';

/** How a lobby that never came to a fight went (one its host disbanded: nothing to say). */
const LAST_LOBBY: Record<'no_players' | 'called_off', string> = {
  no_players: 'Everyone left the last lobby, so it closed.',
  called_off: 'The last raid was called off (something went wrong), and anything spent was given back.',
};

/**
 * The party screen, before the fight: the boss and what it does on the left, the party so far on the
 * right (a card for each raider, the empty seats face down), and what there is to do: start the week's
 * raid, or join, leave and (the host) start it now.
 */
export function renderPrep(v: RaidView): void {
  if (prepBoss !== briefKey(v)) renderBrief(v);
  renderSeats(v);
  renderDifficulty(v);
  renderEffects(v);
  renderStatus(v);
}

const briefKey = (v: RaidView): string => `${v.boss.id}:${v.difficulty ?? 1}`;

/**
 * The lobby's difficulty: the level it was started at (./level.ts). The host can still step it down and
 * up, as far as the server has unlocked (one past the hardest it has beaten).
 */
function renderDifficulty(v: RaidView): void {
  const lobby = v.lobby;
  const levels = lobby?.levels;
  // No lobby, or a bot from before difficulties.
  if (!lobby || !levels || lobby.difficulty === undefined) {
    ui.prepDifficulty.hidden = true;
    return;
  }
  const picked = lobby.difficulty;
  const unlocked = lobby.maxDifficulty ?? 1;
  const top = lobby.topDifficulty ?? levels.length;
  const host = (lobby.players[0] ?? null) === v.you;
  ui.prepDifficulty.hidden = false;
  ui.difficultyLevel.textContent = `${picked} / ${top}`;
  ui.difficultyDown.hidden = !host;
  ui.difficultyUp.hidden = !host;
  ui.difficultyDown.disabled = picked <= 1;
  ui.difficultyUp.disabled = picked >= unlocked;
  ui.difficultyText.textContent = host ? '' : 'The host picks it.';
}

/** A share (0 to 1) as a percentage, like "30%". */
const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** What the party adds, all together: the raid drop chance its raiders add (the total is capped at 100%). */
function renderEffects(v: RaidView): void {
  const raiders = v.lobby?.players.length ?? 0;
  const drops = v.drops;
  const added = drops ? Math.max(0, Math.min(drops.perRaider * raiders, 1 - drops.chance)) : 0;
  const effects = added > 0 ? [`+${percent(added)} raid item drop chance (${raiders} ${raiders === 1 ? 'raider' : 'raiders'})`] : [];
  ui.prepEffectsIcon.textContent = effects.length === 0 ? 'None' : '🎁';
  ui.prepEffectsIcon.classList.toggle('on', effects.length > 0);
  if (effects.length === 0) {
    ui.prepEffects.textContent = 'No party buff effects';
    return;
  }
  const list = el('ul', 'rd-prep-effects-list');
  list.append(...effects.map((effect) => el('li', '', effect)));
  ui.prepEffects.replaceChildren(list);
}

/** What the boss does: its moves, phases and rewards. */
function renderBrief(v: RaidView): void {
  prepBoss = briefKey(v);
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

/** The party so far: a card for each raider, the empty seats face down. */
function renderSeats(v: RaidView): void {
  const players = v.lobby?.players ?? [];
  const host = players[0] ?? null;
  // Four seats at least (the empty ones face down); past four, the row scrolls. An empty seat takes
  // them in: joining the lobby, or, with no raid up yet, starting it with them in it.
  const seats = Math.max(4, players.length);
  const takeSeat = v.lobby ? (players.includes(v.you) ? null : () => send({ t: 'join' })) : v.idle?.canStart ? startRaid : null;
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
}

/** What's going on, and what there is to do. */
function renderStatus(v: RaidView): void {
  const lobby = v.lobby;
  const players = lobby?.players ?? [];
  const reset = new Date(v.resetsAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  const inIt = players.includes(v.you);
  // How the last lobby went, when it never came to a fight.
  const last = v.idle?.last && v.idle.last !== 'disbanded' ? `${LAST_LOBBY[v.idle.last]} ` : '';
  ui.start.hidden = true;
  ui.join.hidden = true;
  ui.leave.hidden = true;
  ui.begin.hidden = true;
  ui.disband.hidden = true;
  let unfought = false;
  if (!lobby) disarmDisband();
  if (lobby) {
    const host = players[0] ?? null;
    const hp = el('span', 'rd-muted-inline', `Boss HP ${fmt(lobby.bossHp)}, growing with every raider.`);
    if (host === v.you) {
      ui.prepStatus.replaceChildren("You're the host: start the raid once everyone is in, or disband it. ", hp);
    } else {
      ui.prepStatus.replaceChildren(host ? `Waiting for ${nameOf(host)} (the host) to start the raid. ` : 'Waiting for the host to start the raid. ', hp);
    }
    ui.join.hidden = inIt;
    ui.leave.hidden = !inIt;
    ui.begin.hidden = host !== v.you;
    ui.disband.hidden = host !== v.you;
  } else if (v.phase === 'over') {
    // A bot from before `idle.last` says a lobby that never came to a fight is over, and nothing more.
    ui.prepStatus.textContent = `${LAST_LOBBY[v.over?.end === 'called_off' ? 'called_off' : 'no_players']} Start it again in Discord with the raid command, or come back in a little while.`;
  } else if (v.idle?.week === 'busy') {
    ui.prepStatus.textContent = 'A raid is starting in Discord. It will show up here in a moment.';
  } else if (v.idle?.canStart) {
    ui.prepStatus.textContent = `${last}This week's boss hasn't been fought yet. Join to start the raid: its lobby goes up in the server, and everyone can join, here or in Discord. The week resets ${reset}.`;
    ui.start.hidden = false;
    unfought = true;
  } else {
    ui.prepStatus.textContent = `${last}This week's boss hasn't been fought yet. This server has no bot channel, so start the raid in Discord with the raid command, then join it here. The week resets ${reset}.`;
    unfought = true;
  }
  // On a phone, that line isn't across the top: it comes up first, over the party screen (../styles/prep-party.css).
  ui.prep.classList.toggle('unfought', unfought);
  ui.prep.classList.toggle('notice-up', unfought && !noticeSeen);
  if (unfought) ui.prepNoticeText.textContent = ui.prepStatus.textContent;
}

/** Disband asks once more before it goes: the first press arms it for a moment, the second disbands. */
const DISBAND_ARMED_MS = 4000;
let disbandArmed: ReturnType<typeof setTimeout> | null = null;

function disarmDisband(): void {
  if (disbandArmed) clearTimeout(disbandArmed);
  disbandArmed = null;
  ui.disband.textContent = 'Disband';
  ui.disband.classList.remove('armed');
}

function pressDisband(): void {
  if (disbandArmed) {
    disarmDisband();
    send({ t: 'disband' });
    return;
  }
  ui.disband.textContent = 'Really disband?';
  ui.disband.classList.add('armed');
  disbandArmed = setTimeout(disarmDisband, DISBAND_ARMED_MS);
}

/**
 * Starts this week's raid (its lobby goes up in Discord too), with them in it: its difficulty first
 * (./level.ts), which starts it. A bot from before that was picked first starts it straight away.
 */
export function startRaid(): void {
  if (ui.start.disabled) return;
  if (state.view?.idle?.pick) return openLevel();
  ui.start.disabled = send({ t: 'start' });
}

/** The party screen's buttons, and its row of seats scrolling sideways. */
export function wirePrep(): void {
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
  ui.prepNotice.addEventListener('click', () => {
    noticeSeen = true;
    ui.prep.classList.remove('notice-up');
  });
  ui.start.addEventListener('click', startRaid);
  ui.join.addEventListener('click', () => send({ t: 'join' }));
  ui.leave.addEventListener('click', () => send({ t: 'leave' }));
  ui.begin.addEventListener('click', () => send({ t: 'begin' }));
  ui.disband.addEventListener('click', pressDisband);
  const stepDifficulty = (by: 1 | -1): void => {
    const picked = state.view?.lobby?.difficulty;
    if (picked !== undefined) send({ t: 'difficulty', level: picked + by });
  };
  ui.difficultyDown.addEventListener('click', () => stepDifficulty(-1));
  ui.difficultyUp.addEventListener('click', () => stepDifficulty(1));
}
