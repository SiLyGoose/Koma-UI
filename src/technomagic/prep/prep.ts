import { classBadge, className, FACE, heroCut } from '../../shared/heroes';
import { GALGORIA } from '../bosses/galgoria';
import { HEROES } from '../heroes';
import { el } from '../hud/dom';
import type { PickView, PlayerView, RoomState } from '../protocol';
import { SOLO_BOSS_HP } from '../sim/rules';

/*
 * Getting ready for a room's fight, as King's Raid has it: across the top the boss and the stage (the host
 * steps it up or down in Raid Settings, top right), then the lineup, a card for every slot (whose each hero is: 1P, 2P…; one of this
 * player's taken out by pressing it). Along the bottom: the heroes this player owns (pressing one puts it in,
 * or takes it out), the room's chat, and who's in (the host's crown, who's ready), with Raid Info, Ready
 * (everyone but the host) and Start Battle (the host, once everyone is ready).
 */

export interface PrepActions {
  pick(hero: string): void;
  unpick(hero: string): void;
  ready(on: boolean): void;
  stage(stage: number): void;
  begin(): void;
}

export interface Prep {
  /** Where the room's chat goes. */
  readonly chat: HTMLElement;
  show(state: RoomState): void;
  /** Says why something wasn't done (null: nothing to say). */
  note(text: string | null): void;
  hide(): void;
}

/** How many players a room takes (1P to 4P). */
const ROOM_PLAYERS = 4;

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const heroNamed = (id: string) => HEROES.find((hero) => hero.id === id);

/** Each hero's face, cut once. */
const faces = new Map<string, Promise<string | null>>();
function face(id: string, img: HTMLImageElement, fallback: HTMLElement): void {
  if (!faces.has(id)) faces.set(id, heroCut(id, FACE, 256));
  void faces.get(id)?.then((src) => {
    if (!src) return;
    img.src = src;
    img.hidden = false;
    fallback.hidden = true;
  });
}

/** A hero's picture: its face, with its name's first letter until (or unless) there is one. */
function portrait(id: string, className: string): HTMLElement {
  const box = el('span', className);
  const img = el('img', '');
  img.alt = '';
  img.hidden = true;
  const letter = el('span', 'tm-face-letter', (heroNamed(id)?.name ?? id).slice(0, 1));
  box.append(img, letter);
  face(id, img, letter);
  return box;
}

export function makePrep(act: PrepActions): Prep {
  const root = byId('prep');
  const lineup = byId('lineup');
  const heroes = byId('prep-heroes');
  const players = byId('prep-players');
  const level = byId('prep-level');
  const stageShown = byId('prep-stage');
  const stageDown = byId('prep-stage-down') as HTMLButtonElement;
  const stageUp = byId('prep-stage-up') as HTMLButtonElement;
  const stageText = byId('prep-stage-text');
  const rewards = byId('prep-rewards');
  const noteAt = byId('prep-note');
  const ready = byId('prep-ready') as HTMLButtonElement;
  const start = byId('prep-start') as HTMLButtonElement;
  let state: RoomState | null = null;

  byId('prep-info').append(
    el('p', '', `${GALGORIA.name}: a chimera of three heads that spits venom. Its blows are magical, and nothing slows it; it heals itself all the while.`),
    el('p', '', 'Every 150 blows, the hero that has dealt the most is shut in the swamp for a while. Its Swamp Destroyer knocks every hero down.'),
    el('p', '', `Heroes that fall stay down. Beat it within 3:30, before its rage wipes the party. Alone, it has ${Math.round(SOLO_BOSS_HP * 100)}% of its health.`),
    el('p', '', 'The host brings up to 4 heroes, everyone else up to 2 (alone, up to 8). A win gives each player TechnoMagic gear, while they have runs left today that give it.'),
  );

  ready.addEventListener('click', () => act.ready(ready.getAttribute('aria-pressed') !== 'true'));
  start.addEventListener('click', () => act.begin());
  const step = (by: number): void => {
    if (state) act.stage(Math.min(state.stages, Math.max(1, state.stage + by)));
  };
  stageDown.addEventListener('click', () => step(-1));
  stageUp.addEventListener('click', () => step(1));
  // A popup (Raid Settings, Raid Info) closes on a press anywhere else.
  document.addEventListener('pointerdown', (event) => {
    for (const box of root.querySelectorAll<HTMLDetailsElement>('details[open]')) {
      if (!box.contains(event.target as Node)) box.open = false;
    }
  });

  /** One slot of the lineup: a hero (whose, which) or empty. */
  function slot(pick: PickView | undefined, owner: PlayerView | undefined, mine: boolean): HTMLElement {
    const item = el('li', pick ? 'tm-slot filled' : 'tm-slot');
    // Whose it is, over the card (blank over an empty one, to keep the row's cards in line).
    const frame = el('div', 'tm-slot-frame');
    item.append(el('span', 'tm-slot-owner', pick ? `${owner?.number ?? '?'}P` : ''), frame);
    if (!pick) return item;
    const hero = heroNamed(pick.hero);
    const card = el(mine ? 'button' : 'div', 'tm-slot-card');
    if (card instanceof HTMLButtonElement) {
      card.type = 'button';
      card.title = `Take ${hero?.name ?? pick.hero} out`;
      card.addEventListener('click', () => act.unpick(pick.hero));
    }
    item.dataset.player = String(owner?.number ?? 0);
    const badge = el('img', 'tm-slot-class');
    badge.alt = hero ? className(hero.class) : '';
    if (hero) badge.src = classBadge(hero.class);
    card.append(portrait(pick.hero, 'tm-slot-face'), badge, el('span', 'tm-slot-name', hero?.name ?? pick.hero));
    frame.append(card);
    return item;
  }

  function draw(): void {
    if (!state) return;
    const me = state.players.find((player) => player.id === state?.you);
    const host = me?.host === true;
    const mine = state.lineup.filter((pick) => pick.owner === state?.you);
    const owner = (id: string): PlayerView | undefined => state?.players.find((player) => player.id === id);

    level.textContent = `· Stage ${state.stage}`;
    stageShown.textContent = String(state.stage);
    stageDown.disabled = !host || state.stage <= 1;
    stageUp.disabled = !host || state.stage >= state.stages;
    stageText.textContent = `${host ? '' : 'Only the host changes the stage. '}From stage 4 on, the boss is harder on the heroes, and a win likelier to give 4-star gear.`;
    lineup.style.setProperty('--slots', String(state.slots));
    lineup.replaceChildren(...Array.from({ length: state.slots }, (_, i) => slot(state?.lineup[i], owner(state?.lineup[i]?.owner ?? ''), state?.lineup[i]?.owner === state?.you)));

    // Their heroes: pressing one puts it in, or takes it out.
    const limit = me?.limit ?? 0;
    const room = state.lineup.length < state.slots;
    const owned = HEROES.filter((hero) => me?.owned.includes(hero.id));
    byId('prep-heroes-title').textContent = `Heroes List · ${mine.length}/${limit}`;
    if (owned.length === 0) {
      const empty = el('p', 'tm-prep-empty', 'You have no heroes yet. Recruit some in the ');
      const link = el('a', '', 'shop');
      link.href = '/shop/heroes/';
      empty.append(link, ', and gear them on the ');
      const gear = el('a', '', 'Heroes page');
      gear.href = '/heroes/';
      empty.append(gear, '.');
      heroes.replaceChildren(empty);
    } else {
      heroes.replaceChildren(
        ...owned.map((hero) => {
          const picked = mine.some((pick) => pick.hero === hero.id);
          const button = el('button', picked ? 'tm-prep-hero picked' : 'tm-prep-hero');
          button.type = 'button';
          button.disabled = !picked && (mine.length >= limit || !room);
          button.setAttribute('aria-pressed', String(picked));
          button.title = picked ? `Take ${hero.name} out` : `Put ${hero.name} in`;
          button.append(portrait(hero.id, 'tm-prep-hero-face'), el('span', 'tm-prep-hero-name', hero.name));
          if (picked) button.append(el('span', 'tm-prep-hero-check', '✓'));
          button.addEventListener('click', () => (picked ? act.unpick(hero.id) : act.pick(hero.id)));
          return button;
        }),
      );
    }

    const joined = state.players.length;
    players.replaceChildren(
      ...state.players.map((player) => {
        const row = el('li', player.id === state?.you ? 'tm-prep-player you' : 'tm-prep-player');
        row.dataset.player = String(player.number);
        const picks = state?.lineup.filter((pick) => pick.owner === player.id).length ?? 0;
        row.append(el('b', 'tm-prep-player-no', `${player.number}P`), el('span', 'tm-prep-player-name', player.name), el('span', 'tm-prep-player-heroes', `${picks}/${player.limit}`));
        const status = player.host ? el('span', 'tm-prep-player-host', '👑') : el('span', player.ready ? 'tm-prep-player-ready on' : 'tm-prep-player-ready', player.away ? 'Away' : player.ready ? 'Ready' : 'Not Ready');
        if (player.host) status.title = 'Host';
        row.append(status);
        return row;
      }),
      // The places still open for other raiders.
      ...Array.from({ length: Math.max(0, ROOM_PLAYERS - joined) }, (_, i) => {
        const row = el('li', 'tm-prep-player open');
        row.append(el('b', 'tm-prep-player-no', `${joined + i + 1}P`), el('span', 'tm-prep-player-name', 'Waiting for a raider…'));
        return row;
      }),
    );

    rewards.textContent = state.rewardsLeft > 0 ? `${state.rewardsLeft} run${state.rewardsLeft === 1 ? '' : 's'} left today that give gear` : 'No more runs today give gear (you can still fight)';

    ready.hidden = host;
    const isReady = me?.ready === true && !host;
    ready.setAttribute('aria-pressed', String(isReady));
    ready.textContent = isReady ? 'Ready ✓' : 'Ready';
    ready.disabled = !isReady && mine.length === 0;
    ready.title = mine.length === 0 ? 'Put a hero in first' : '';

    start.hidden = !host;
    const waiting = state.players.filter((player) => !player.host && !player.ready);
    const empty = state.players.filter((player) => !state?.lineup.some((pick) => pick.owner === player.id));
    start.disabled = waiting.length > 0 || empty.length > 0;
    start.title = empty.length > 0 ? `${empty.map((player) => player.name).join(', ')}: no hero in yet` : waiting.length > 0 ? `Waiting for ${waiting.map((player) => player.name).join(', ')}` : '';
  }

  return {
    chat: byId('prep-chat'),
    show(next) {
      state = next;
      root.hidden = false;
      draw();
    },
    note(text) {
      noteAt.textContent = text ?? '';
    },
    hide() {
      root.hidden = true;
    },
  };
}
