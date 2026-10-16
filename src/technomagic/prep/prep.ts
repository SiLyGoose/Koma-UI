import { classBadge, className, FACE, heroCut } from '../../shared/heroes';
import { levelPopup } from '../../shared/ui/level/level';
import { GALGORIA } from '../sim/bosses/galgoria';
import { HEROES } from '../sim/heroes';
import { nearer } from '../sim/heroes/kit';
import { el } from '../hud/dom';
import { nameTips } from '../hud/tip';
import type { PickView, PlayerView, RoomState } from '../../protocol/technomagic';

/*
 * Getting ready for a room's fight, as King's Raid has it: across the top the boss and the stage (the host
 * steps it up or down in Raid Settings, top right), then the lineup, a card for every slot (whose each hero is: 1P, 2P…; one of this
 * player's taken out by pressing it). Alone, the lineup is in two halves, the Main Team (whose skills are the player's to use)
 * and the Sub Team (on Auto for the whole fight), each with its tab over it: a hero picked goes into the one whose tab is
 * pressed, and one picked into the other already is moved over. Along the bottom: the heroes this player owns (pressing one puts it in,
 * or takes it out), the room's chat, and who's in (the host's crown, who's ready), with Raid Info, Ready
 * (everyone but the host) and Start Battle (the host, once everyone is ready).
 */

export interface PrepActions {
  /** Puts a hero in (alone: in the Sub Team, `sub`, or the Main Team; moved over, from the other). */
  pick(hero: string, sub: boolean): void;
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
/** Alone: how many of the lineup's slots are the Main Team's (the rest are the Sub Team's). As the bot has it (TM_ROOM.mainTeam). */
const MAIN_TEAM = 4;
const TEAMS = [
  { sub: false, name: 'Main Team' },
  { sub: true, name: 'Sub Team' },
] as const;

/** A phone (or tablet) on its side, where the screen is scaled down to fit the field rather than scrolled. */
const TOUCH_SIDEWAYS = matchMedia('(pointer: coarse) and (orientation: landscape)');
/** The least it is scaled to; past that it scrolls. */
const MIN_FIT = 0.4;

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const heroNamed = (id: string) => HEROES.find((hero) => hero.id === id);

/** Which of two picks is shown nearer the boss (../sim/heroes/kit.ts's nearer; one this page doesn't know: furthest back). */
function nearerPick(a: PickView, b: PickView): number {
  const defA = heroNamed(a.hero);
  const defB = heroNamed(b.hero);
  if (!defA || !defB) return Number(!defA) - Number(!defB);
  return nearer(defA, defB);
}

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
  const settings = levelPopup({ id: 'prep-settings-pop', title: 'Raid Settings', label: 'Stage', confirm: 'Confirm', down: 'Lower stage', up: 'Higher stage' });
  settings.picture.hidden = true;
  // Beside the screen rather than in it: scaled down on a phone (fit()), it would hold the popup in it.
  root.after(settings.root);
  const noteAt = byId('prep-note');
  const ready = byId('prep-ready') as HTMLButtonElement;
  const start = byId('prep-start') as HTMLButtonElement;
  let state: RoomState | null = null;
  /** The stage picked in Raid Settings, until it is confirmed (null: the popup is closed). */
  let picked: number | null = null;
  /** Alone: the team whose tab is pressed, which a hero picked goes into. */
  let intoSub = false;
  // A hero pointed at with a mouse (in the lineup, or the Heroes List): its name, over it.
  const named = nameTips(root, '[data-name]');

  byId('prep-info').append(
    el('p', '', `${GALGORIA.name}: a chimera of three heads that spits venom. Its blows are magical, and nothing slows it; it heals itself all the while.`),
    el('p', '', 'Every 150 blows, the hero that has dealt the most is shut in the swamp for a while. Its Swamp Destroyer knocks every hero down.'),
    el('p', '', `Heroes that fall stay down. Beat it within 3:30, before its rage wipes the party. Each stage, it has more health and hits harder; alone, it has ${Math.round(((GALGORIA.stages.solo[0]?.hp ?? 1) / (GALGORIA.stages.room[0]?.hp ?? 1)) * 100)}% of the health.`),
    el('p', '', 'The host brings up to 4 heroes, everyone else up to 3, 8 in all. Alone, up to 7: 4 in the Main Team, whose skills are yours to use, and 3 in the Sub Team, who fight on Auto. A win gives each player TechnoMagic gear, while they have runs left today that give it.'),
    el('p', '', 'The host picks the stage: each after the first opens once they have beaten the one before it.'),
  );

  ready.addEventListener('click', () => act.ready(ready.getAttribute('aria-pressed') !== 'true'));
  start.addEventListener('click', () => act.begin());
  // Raid Settings: the stage stepped between the arrows, and taken on Confirm (only the host's).
  const closeSettings = (): void => {
    settings.root.hidden = true;
    picked = null;
  };
  byId('prep-settings').addEventListener('click', () => {
    if (!state) return;
    picked = state.stage;
    drawSettings();
    settings.root.hidden = false;
    settings.confirm.focus();
  });
  settings.bind({
    step(by) {
      if (picked === null) return;
      picked += by;
      drawSettings();
    },
    confirm() {
      if (picked !== null && picked !== state?.stage) act.stage(picked);
      closeSettings();
    },
    close: closeSettings,
  });

  /**
   * On a phone on its side: the screen laid out as large as it needs (the field's size over the scale) and
   * scaled down by as little as lets it fit the field, found by halving the gap a few times.
   */
  function fit(): void {
    const field = root.parentElement;
    const on = !root.hidden && TOUCH_SIDEWAYS.matches && field !== null;
    root.classList.toggle('fit', on);
    root.classList.remove('scaled');
    if (!on) {
      root.style.removeProperty('width');
      root.style.removeProperty('height');
      root.style.removeProperty('--fit');
      return;
    }
    const { clientWidth: width, clientHeight: height } = field;
    const fits = (scale: number): boolean => {
      root.style.width = `${width / scale}px`;
      root.style.height = `${height / scale}px`;
      return root.scrollHeight <= root.clientHeight;
    };
    let scale = 1;
    if (!fits(1)) {
      root.classList.add('scaled');
      let low = MIN_FIT;
      let high = 1;
      for (let i = 0; i < 8; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) low = mid;
        else high = mid;
      }
      scale = low;
      fits(scale);
    }
    root.style.setProperty('--fit', String(scale));
  }
  if (root.parentElement) new ResizeObserver(fit).observe(root.parentElement);
  TOUCH_SIDEWAYS.addEventListener('change', fit);
  // Again once the font is in, its words a little wider and taller than the fallback's.
  void document.fonts.ready.then(fit);

  // Raid Info closes on a press anywhere else.
  document.addEventListener('pointerdown', (event) => {
    for (const box of root.querySelectorAll<HTMLDetailsElement>('details[open]')) {
      if (!box.contains(event.target as Node)) box.open = false;
    }
  });

  /** Raid Settings, while it is open: the stage picked (anyone but the host only sees the room's), between its arrows. */
  function drawSettings(): void {
    if (!state || picked === null) return;
    const host = state.players.some((player) => player.id === state?.you && player.host);
    // The host can go up to the stage after the highest they have won.
    picked = host ? Math.min(Math.max(1, picked), state.unlocked) : state.stage;
    settings.bossName.textContent = state.boss.name;
    settings.number.textContent = String(picked);
    settings.down.disabled = !host || picked <= 1;
    settings.up.disabled = !host || picked >= state.unlocked;
    settings.confirm.hidden = !host;
    const next = host && state.unlocked < state.stages ? `Win stage ${state.unlocked} to open stage ${state.unlocked + 1}. ` : '';
    settings.note.textContent = `${host ? next : 'Only the host changes the stage. '}Each stage, the boss has more health and hits harder; from stage 4 on it is harder on the heroes still, and a win gives more gear.`;
  }

  /** One slot of the lineup: a hero (whose, which) or empty. */
  function slot(pick: PickView | undefined, owner: PlayerView | undefined, mine: boolean): HTMLElement {
    const item = el('li', pick ? 'tm-slot filled' : 'tm-slot');
    // Whose it is, over the card (blank over an empty one, to keep the row's cards in line).
    const frame = el('div', 'tm-slot-frame');
    item.append(el('span', 'tm-slot-owner', pick ? `${owner?.number ?? '?'}P` : ''), frame);
    if (!pick) return item;
    const hero = heroNamed(pick.hero);
    const card = el(mine ? 'button' : 'div', 'tm-slot-card');
    card.dataset.name = hero?.name ?? pick.hero;
    if (card instanceof HTMLButtonElement) {
      card.type = 'button';
      card.setAttribute('aria-label', `Take ${hero?.name ?? pick.hero} out`);
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
    drawSettings();
    // As they stand on the field, facing the boss on the right: the front line rightmost, then the middle,
    // then the back; within a line, by class (the tank rightmost), then the first put in. The empty slots are to the left.
    const slots = (picks: readonly PickView[], count: number): HTMLElement[] => {
      const placed = [...picks].sort(nearerPick);
      return Array.from({ length: count }, (_, i) => {
        const pick = placed[count - 1 - i];
        return slot(pick, owner(pick?.owner ?? ''), pick?.owner === state?.you);
      });
    };
    const solo = state.solo;
    lineup.classList.toggle('teams', solo);
    if (solo) {
      // Alone: the Main Team and the Sub Team, side by side, each under its tab.
      lineup.style.removeProperty('--slots');
      lineup.replaceChildren(
        ...TEAMS.map(({ sub, name }) => {
          const picks = state?.lineup.filter((pick) => (pick.sub === true) === sub) ?? [];
          const count = sub ? (state?.slots ?? MAIN_TEAM) - MAIN_TEAM : MAIN_TEAM;
          const focused = intoSub === sub;
          const team = el('li', focused ? 'tm-team focused' : 'tm-team');
          const tab = el('button', 'tm-team-tab', name);
          tab.type = 'button';
          tab.setAttribute('aria-pressed', String(focused));
          tab.title = `Put heroes in the ${name}${sub ? ' (they fight on Auto)' : ''}`;
          tab.append(el('span', 'tm-team-count', `${picks.length}/${count}`));
          // The other team: a press anywhere on it (its tab, a slot, a hero's card) only makes it the one heroes go into.
          if (!focused) {
            team.title = `Put heroes in the ${name}`;
            team.addEventListener(
              'click',
              (event) => {
                event.stopPropagation();
                intoSub = sub;
                draw();
              },
              { capture: true },
            );
          }
          const row = el('ol', 'tm-team-slots');
          row.style.setProperty('--slots', String(count));
          row.append(...slots(picks, count));
          team.append(tab, row);
          return team;
        }),
      );
    } else {
      lineup.style.setProperty('--slots', String(state.slots));
      lineup.replaceChildren(...slots(state.lineup, state.slots));
    }

    // Their heroes: pressing one puts it in, or takes it out (alone: into the team whose tab is pressed, or over to it from the other).
    const limit = me?.limit ?? 0;
    const room = state.lineup.length < state.slots;
    const into = solo && intoSub;
    const teamName = into ? 'Sub Team' : 'Main Team';
    const teamRoom = !solo || state.lineup.filter((pick) => (pick.sub === true) === into).length < (into ? state.slots - MAIN_TEAM : MAIN_TEAM);
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
          const pick = mine.find((one) => one.hero === hero.id);
          const picked = pick !== undefined;
          // Alone, in the other team than the tab's: pressing it moves it over.
          const elsewhere = picked && solo && (pick.sub === true) !== into;
          const button = el('button', picked ? 'tm-prep-hero picked' : 'tm-prep-hero');
          button.type = 'button';
          button.disabled = elsewhere ? !teamRoom : !picked && (mine.length >= limit || !room || !teamRoom);
          button.setAttribute('aria-pressed', String(picked));
          if (solo && picked) button.dataset.team = pick.sub ? 'sub' : 'main';
          button.dataset.name = hero.name;
          button.setAttribute('aria-label', elsewhere ? `Move ${hero.name} to the ${teamName}` : picked ? `Take ${hero.name} out` : `Put ${hero.name} in${solo ? ` the ${teamName}` : ''}`);
          button.append(portrait(hero.id, 'tm-prep-hero-face'));
          if (picked) button.append(el('span', 'tm-prep-hero-check', solo ? (pick.sub ? 'S' : 'M') : '✓'));
          button.addEventListener('click', () => (picked && !elsewhere ? act.unpick(hero.id) : act.pick(hero.id, into)));
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
    named();
  }

  return {
    chat: byId('prep-chat'),
    show(next) {
      state = next;
      root.hidden = false;
      draw();
      fit();
    },
    note(text) {
      noteAt.textContent = text ?? '';
      fit();
    },
    hide() {
      closeSettings();
      root.hidden = true;
      named();
    },
  };
}
