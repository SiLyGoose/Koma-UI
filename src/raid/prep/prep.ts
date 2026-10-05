import { send } from '../connection';
import { el } from '../dom';
import { openGear } from '../gear-popup';
import { markdown } from '../markdown';
import type { RaidView } from '../protocol';
import { nameOf, state } from '../state';
import { ui } from '../ui';
import { fmt } from '../words';
import { cardBack } from './card-back';

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
 * The party screen, before the fight: the boss and what it does on the left, the party so far on the
 * right (a card for each raider, the empty seats face down), and what there is to do: start the week's
 * raid, or join, leave and (the host) start it now.
 */
export function renderPrep(v: RaidView): void {
  if (prepBoss !== v.boss.id) renderBrief(v);
  renderSeats(v);
  renderStatus(v);
}

/** What the boss does: its moves, phases and rewards. */
function renderBrief(v: RaidView): void {
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
  const last = v.idle?.last ? `${LAST_LOBBY[v.idle.last]} ` : '';
  ui.start.hidden = true;
  ui.join.hidden = true;
  ui.leave.hidden = true;
  ui.begin.hidden = true;
  state.lobbyTimer = null;
  if (lobby) {
    state.lobbyTimer = el('b');
    ui.prepStatus.replaceChildren('The fight starts in ', state.lobbyTimer, ', or when the host starts it. ', el('span', 'rd-muted-inline', `Boss HP ${fmt(lobby.bossHp)}, growing with every raider.`));
    ui.join.hidden = inIt;
    ui.leave.hidden = !inIt;
    ui.begin.hidden = (players[0] ?? null) !== v.you;
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

/** Starts this week's raid (its lobby goes up in Discord too), with them in it. */
export function startRaid(): void {
  if (ui.start.disabled) return;
  ui.start.disabled = true;
  send({ t: 'start' });
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
  ui.start.addEventListener('click', startRaid);
  ui.join.addEventListener('click', () => send({ t: 'join' }));
  ui.leave.addEventListener('click', () => send({ t: 'leave' }));
  ui.begin.addEventListener('click', () => send({ t: 'begin' }));
}
