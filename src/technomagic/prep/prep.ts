import { inLandscape, onLandscape } from '../../shared/ui/landscape/landscape';
import { className, FACE, heroCard, heroCut } from '../../shared/heroes';
import { levelPopup } from '../../shared/ui/level/level';
import { stagesOf, type BossDef } from '../sim/bosses/boss';
import { DOWN } from '../sim/bosses/gauge';
import { RAID_TIME } from '../sim/rules';
import { isDragon } from '../sim/bosses';
import { DRAGON_LIST, raidCard, TM_LIST } from '../../shared/raids';
import { raidRewards } from '../../shared/raid-rewards/raid-rewards';
import { HEROES } from '../sim/heroes';
import { nearer } from '../sim/heroes/kit';
import { el } from '../hud/dom';
import { movePopup } from './move';
import { nameTips } from '../hud/tip';
import { play } from '../sfx';
import type { PickView, PlayerView, RaidMode, RoomState } from '../../protocol/technomagic';

/*
 * Getting ready for a room's fight, as King's Raid has it: across the top the boss and the stage (the host
 * steps it up or down in Raid Settings, top right, where the room's link can be copied for others to join; a dragon's raid
 * there too goes between its Normal and Hard modes, at once, each with its own stages), then the lineup, a card for every slot (whose each hero is: 1P, 2P…; one of this
 * player's taken out by pressing it). Single player, the lineup is in two halves, the Main Team (whose skills are the player's to use)
 * and the Sub Team (on Auto for the whole fight), each with its tab over it: a hero picked goes into the one whose tab is
 * pressed, and one picked into the other already is moved over. Along the bottom: the heroes this player owns (pressing one puts it in,
 * or takes it out), the room's chat, and who's in (the host's crown, who's ready), with Raid Info, Ready
 * (everyone but the host) and Start Battle (the host: in blue once everyone is ready, else on the plaque with how many
 * are, forcing the start). The Dragon Raid's has its dragons along the
 * top in place of the boss's name: pressing another goes against it. Alone (single player, or the only one in the raid),
 * straight there; with others in the raid, a popup (./move.ts) asks the host whether to bring them along (the raid goes
 * against it, everyone with it) or go alone (leaving the raid to them), and anyone else whether to leave it to go alone.
 */

export interface PrepActions {
  /** Puts a hero in (alone: in the Sub Team, `sub`, or the Main Team; moved over, from the other). */
  pick(hero: string, sub: boolean): void;
  unpick(hero: string): void;
  ready(on: boolean): void;
  stage(stage: number): void;
  /** Takes the raid into the boss's other mode (a dragon's Normal or Hard: the host's). */
  mode(mode: RaidMode): void;
  /** Starts the fight: `force`d, without waiting for everyone to be ready. */
  begin(force: boolean): void;
  /**
   * Goes against another of the raid's bosses (the Dragon Raid's: another dragon): `bring`, the raid with everyone in it
   * (the host's), else alone (single player, a room of their own against it; with others, out of the raid into a new one).
   */
  boss(id: string, bring: boolean): void;
}

export interface Prep {
  /** Where the room's chat goes. */
  readonly chat: HTMLElement;
  show(state: RoomState): void;
  /** Says why something wasn't done (null: nothing to say). */
  note(text: string | null): void;
  hide(): void;
}

/** How long a boss's raid lasts, as its timer shows it (3:00). */
const clockOf = (boss: BossDef): string => {
  const time = boss.time ?? RAID_TIME;
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
};

/** The names of a dragon's modes, as Raid Settings has them. */
const MODE_NAMES: Readonly<Record<RaidMode, string>> = { normal: 'Normal', hard: 'Hard' };
const MODES: readonly RaidMode[] = ['normal', 'hard'];

/** Raid Info: what the boss does, and how its raid goes. */
function infoOf(boss: BossDef): string[] {
  const solo = Math.round(((boss.stages.solo[0]?.hp ?? 1) / (boss.stages.room[0]?.hp ?? 1)) * 100);
  const lineup = 'With others, the host brings up to 4 heroes, everyone else up to 3, 8 in all. Single player, up to 7: 4 in the Main Team, whose skills are yours to use, and 3 in the Sub Team, who fight on Auto.';
  if (isDragon(boss.id)) {
    const normal = boss.normal ? stagesOf(boss.normal) : 0;
    return [
      raidCard(boss.id)?.about ?? boss.name,
      `Its CC Gauge: no stun holds a dragon, but your heroes' stuns wear the gauge down (it fills again soon after); empty, it is Down for ${DOWN} seconds, its breath cut short.`,
      `Two modes, King's Raid's: Normal, its Normal Dragon Raid (${normal} stages, the first far easier than Hard's, the last harder than any), and Hard, its Hard Dragon Raid (${stagesOf(boss)} stages). Each stage has more health and defense and hits harder.`,
      `Heroes that fall stay down. Beat it within ${clockOf(boss)}, before its rage wipes the party. Single player, it has ${solo}% of the health.`,
      `${lineup} A win gives every player hero gear (raid items), zeiucoins and hero essences of the dragon's two kinds, more at each stage; a Normal stage as tough as one of Hard's pays as that one does. There is no daily limit.`,
      'The host picks the mode and the stage in Raid Settings: each stage after the first opens once they have beaten the one before it, each dragon and mode apart.',
    ];
  }
  return [
    `${boss.name}: a chimera of three heads that spits venom. Its blows are magical, and nothing slows it; it heals itself all the while.`,
    `Every 150 blows, the hero that has dealt the most is shut in the swamp for a while. Its Swamp Destroyer knocks every hero down. No stun holds it, but stuns wear its CC Gauge down (it fills again soon after); empty, it is Down for ${DOWN} seconds.`,
    `Heroes that fall stay down. Beat it within ${clockOf(boss)}, before its rage wipes the party. Each stage, it has more health and hits harder; single player, it has ${solo}% of the health.`,
    `${lineup} A win gives each player TechnoMagic gear and zeiucoins.`,
    'The host picks the stage: each after the first opens once they have beaten the one before it.',
  ];
}

/** How many players a room takes (1P to 4P). */
const ROOM_PLAYERS = 4;
/** Alone: how many of the lineup's slots are the Main Team's (the rest are the Sub Team's). As the bot has it (TM_ROOM.mainTeam). */
const MAIN_TEAM = 4;
const TEAMS = [
  { sub: false, name: 'Main Team' },
  { sub: true, name: 'Sub Team' },
] as const;

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

/** Each hero's picture made so far, by where it goes (its class) and whose: the same one again on every redraw, already showing its face rather than flashing its letter. */
const portraits = new Map<string, HTMLElement>();
/** A hero's picture: its face, with its name's first letter until (or unless) there is one. */
function portrait(id: string, className: string): HTMLElement {
  const key = `${className}:${id}`;
  const made = portraits.get(key);
  if (made) return made;
  const box = el('span', className);
  portraits.set(key, box);
  const img = el('img', '');
  img.alt = '';
  img.hidden = true;
  const letter = el('span', 'tm-face-letter', (heroNamed(id)?.name ?? id).slice(0, 1));
  box.append(img, letter);
  face(id, img, letter);
  return box;
}

/** Each hero's card made so far, by which and its skin (as portraits are kept). */
const cards = new Map<string, HTMLElement>();
/** A hero's picture on its lineup card: King's Raid's own card of it, top to its width (its bottom cut off, as the game's); one with none, its face. */
function cardArt(id: string, skin: number): HTMLElement {
  const src = heroCard(id, skin);
  if (!src) return portrait(id, 'tm-slot-art');
  const key = `${id}:${skin}`;
  const made = cards.get(key);
  if (made) return made;
  const box = el('span', 'tm-slot-art');
  const img = el('img', '');
  img.alt = '';
  img.src = src;
  box.append(img);
  cards.set(key, box);
  return box;
}

export function makePrep(act: PrepActions, boss: BossDef): Prep {
  const root = byId('prep');
  const lineup = byId('lineup');
  const heroes = byId('prep-heroes');
  const players = byId('prep-players');
  const level = byId('prep-level');
  const settings = levelPopup({ id: 'prep-settings-pop', title: 'Raid Settings', label: 'Stage', confirm: 'Confirm', down: 'Lower stage', up: 'Higher stage' });
  settings.picture.hidden = true;
  // A dragon's: its two modes, a tab each over the stage (the host's press takes the raid into it at once).
  const modes = el('div', 'tm-mode-pick');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Mode');
  const modeTabs = MODES.map((mode) => {
    const tab = el('button', 'tm-mode-tab', MODE_NAMES[mode]);
    tab.type = 'button';
    tab.dataset.mode = mode;
    tab.addEventListener('click', () => {
      if (state && mode !== state.mode) act.mode(mode);
    });
    modes.append(tab);
    return tab;
  });
  settings.down.parentElement?.before(modes);
  // The room's link, for others to join it (not in a room of the player's own: single player).
  const copyLink = el('button', 'tm-room-link', 'Copy Room Link');
  copyLink.type = 'button';
  settings.confirm.before(copyLink);
  let copied: number | undefined;
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
  // (Beside the screen too, as Raid Settings is.)
  let movingTo = '';
  const moving = movePopup(root.parentElement ?? document.body, {
    bring: () => act.boss(movingTo, true),
    alone: () => act.boss(movingTo, false),
  });

  /** Another boss pressed: straight there alone, or (others in the raid) as the popup says. */
  function pickBoss(id: string): void {
    if (!state || id === state.boss.id) return;
    const you = state.you;
    const host = state.players.some((player) => player.id === you && player.host);
    const others = state.players.filter((player) => player.id !== you).map((player) => player.name);
    if (state.solo || others.length === 0) return act.boss(id, !state.solo);
    movingTo = id;
    moving.open(state.bosses.find((boss) => boss.id === id)?.name ?? id, others, host);
  }

  // Raid Info: what the boss does, then what a win gives (as the front page's Raid List draws it).
  const rewards = raidCard(boss.id)?.rewards ?? [];
  byId('prep-info').append(...infoOf(boss).map((line) => el('p', '', line)));
  if (rewards.length > 0) byId('prep-info').append(raidRewards(rewards, (isDragon(boss.id) ? DRAGON_LIST : TM_LIST).rewardNote));
  const bossName = byId('prep-boss');

  ready.addEventListener('click', () => act.ready(ready.getAttribute('aria-pressed') !== 'true'));
  // Start Battle has its own sound (../sfx.ts), not the plain click's.
  start.dataset.sfx = 'own';
  /** Not everyone ready with a hero in: Start Battle forces the start. */
  let forced = false;
  start.addEventListener('click', () => {
    play('start');
    act.begin(forced);
  });
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
  copyLink.addEventListener('click', () => {
    const link = state?.link;
    if (!link) return;
    const said = (text: string): void => {
      copyLink.textContent = text;
      clearTimeout(copied);
      copied = window.setTimeout(() => (copyLink.textContent = 'Copy Room Link'), 1600);
    };
    navigator.clipboard.writeText(link).then(
      () => said('Copied!'),
      () => said('Could not copy'),
    );
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
    // (A phone or tablet on its side, or the page turned for it: ../../shared/ui/landscape.)
    const on = !root.hidden && inLandscape() && field !== null;
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
  onLandscape(fit);
  // Again once the font is in, its words a little wider and taller than the fallback's.
  void document.fonts.ready.then(fit);

  // Raid Info closes on a press anywhere else.
  document.addEventListener('pointerdown', (event) => {
    for (const box of root.querySelectorAll<HTMLDetailsElement>('details[open]')) {
      if (!box.contains(event.target as Node)) box.open = false;
    }
  });

  /** Raid Settings, while it is open: a dragon's mode, and the stage picked (anyone but the host only sees the room's), between its arrows. */
  function drawSettings(): void {
    if (!state || picked === null) return;
    const host = state.players.some((player) => player.id === state?.you && player.host);
    // The host can go up to the stage after the highest they have won.
    picked = host ? Math.min(Math.max(1, picked), state.unlocked) : state.stage;
    modes.hidden = state.boss.normal === undefined;
    for (const tab of modeTabs) {
      const on = tab.dataset.mode === state.mode;
      tab.setAttribute('aria-pressed', String(on));
      tab.disabled = !host && !on;
      tab.title = on ? `${tab.textContent}: this raid's` : host ? `Go to ${tab.textContent}` : 'Only the host changes the mode';
    }
    settings.bossName.textContent = state.boss.name;
    settings.number.textContent = String(picked);
    settings.down.disabled = !host || picked <= 1;
    settings.up.disabled = !host || picked >= state.unlocked;
    settings.confirm.hidden = !host;
    copyLink.hidden = state.link === null;
    const next = host && state.unlocked < state.stages ? `Win stage ${state.unlocked} to open stage ${state.unlocked + 1}. ` : '';
    const stages = !isDragon(state.boss.id)
      ? 'Each stage, the boss has more health and hits harder; from stage 4 on it is harder on the heroes still, and a win gives more gear.'
      : state.mode === 'normal'
        ? `King's Raid's Normal Dragon Raid: its first stages are far easier than Hard's. From stage 13 it is as tough as Hard's stages and pays as they do, and its last are harder than any.`
        : `King's Raid's Hard Dragon Raid: each stage has more health and defense and hits harder, and from stage 5 on far more. A win gives more at each stage.`;
    settings.note.textContent = `${host ? next : 'Only the host changes the mode and the stage. '}${stages}`;
  }

  /**
   * One slot of the lineup: a hero (whose, which) or empty. Its card as King's Raid's hero portraits are (its HeroPortrait):
   * the hero's own card, its frame round it, its class's tag on the frame's emblem and the kind of damage it deals beside it, its name at the bottom.
   */
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
    card.append(cardArt(pick.hero, pick.skin), el('span', 'tm-slot-border'));
    if (hero) {
      const tag = el('img', 'tm-slot-class');
      tag.alt = className(hero.class);
      tag.src = `/kr/ui/class-${hero.class}.webp`;
      const deals = el('img', 'tm-slot-deals');
      deals.alt = hero.stats.deals === 'magical' ? 'Magical' : 'Physical';
      deals.src = `/kr/ui/deals-${hero.stats.deals}.webp`;
      card.append(tag, deals);
    }
    card.append(el('span', 'tm-slot-name', hero?.name ?? pick.hero));
    frame.append(card);
    return item;
  }

  function draw(): void {
    if (!state) return;
    const me = state.players.find((player) => player.id === state?.you);
    const host = me?.host === true;
    const mine = state.lineup.filter((pick) => pick.owner === state?.you);
    const owner = (id: string): PlayerView | undefined => state?.players.find((player) => player.id === id);

    level.textContent = state.boss.normal === undefined ? `· Stage ${state.stage}` : `· ${MODE_NAMES[state.mode]} · Stage ${state.stage}`;
    // The boss; the Dragon Raid's, each of its dragons, this room's pressed (another: to its room).
    if (state.bosses.length > 1) {
      bossName.replaceChildren(
        ...state.bosses.map(({ id, name }) => {
          const pick = el('button', 'tm-prep-boss-pick', name);
          pick.type = 'button';
          pick.setAttribute('aria-pressed', String(id === state?.boss.id));
          pick.title = id === state?.boss.id ? `${name}: this raid's` : `Go against ${name}`;
          pick.addEventListener('click', () => pickBoss(id));
          return pick;
        }),
      );
    } else bossName.textContent = state.boss.name;
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
          // Another player's in already: no hero is brought twice.
          const taker = picked ? undefined : owner(state?.lineup.find((one) => one.hero === hero.id)?.owner ?? '');
          // Alone, in the other team than the tab's: pressing it moves it over.
          const elsewhere = picked && solo && (pick.sub === true) !== into;
          const button = el('button', picked ? 'tm-prep-hero picked' : taker ? 'tm-prep-hero taken' : 'tm-prep-hero');
          button.type = 'button';
          button.disabled = elsewhere ? !teamRoom : !picked && (taker !== undefined || mine.length >= limit || !room || !teamRoom);
          button.setAttribute('aria-pressed', String(picked));
          if (solo && picked) button.dataset.team = pick.sub ? 'sub' : 'main';
          button.dataset.name = hero.name;
          button.setAttribute('aria-label', elsewhere ? `Move ${hero.name} to the ${teamName}` : picked ? `Take ${hero.name} out` : taker ? `${hero.name}: in already, ${taker.number}P's` : `Put ${hero.name} in${solo ? ` the ${teamName}` : ''}`);
          button.append(portrait(hero.id, 'tm-prep-hero-face'));
          if (picked) button.append(el('span', 'tm-prep-hero-check', solo ? (pick.sub ? 'S' : 'M') : '✓'));
          else if (taker) button.append(el('span', 'tm-prep-hero-check', `${taker.number}P`));
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
    // Everyone ready with a hero in: Start Battle in blue. Otherwise the host can force it, on the plaque, with how many are
    // ready (whoever has no hero in sits that fight out).
    forced = state.lineup.length > 0 && (waiting.length > 0 || empty.length > 0);
    const names = (some: readonly PlayerView[]): string => some.map((player) => player.name).join(', ');
    start.classList.toggle('main', !forced);
    start.classList.toggle('secondary', forced);
    start.replaceChildren('Start Battle', ...(forced ? [el('span', 'tm-prep-start-count', `${state.players.length - waiting.length}/${state.players.length} Ready`)] : []));
    start.disabled = state.lineup.length === 0;
    start.title = forced ? [waiting.length > 0 && `Not ready: ${names(waiting)}`, empty.length > 0 && `No hero in, sitting it out: ${names(empty)}`, 'Press to start anyway'].filter(Boolean).join('. ') : state.lineup.length === 0 ? 'Put a hero in first' : '';
    named();
  }

  /** Alone: how many heroes are in a team, and how many it holds. */
  const inTeam = (at: RoomState, sub: boolean): number => at.lineup.filter((pick) => (pick.sub === true) === sub).length;
  const teamSize = (at: RoomState, sub: boolean): number => (sub ? at.slots - MAIN_TEAM : MAIN_TEAM);

  return {
    chat: byId('prep-chat'),
    show(next) {
      // Alone: a hero put in that fills the team whose tab is pressed presses the other's, if it has room.
      const before = state ? inTeam(state, intoSub) : 0;
      if (next.solo && inTeam(next, intoSub) > before && inTeam(next, intoSub) >= teamSize(next, intoSub) && inTeam(next, !intoSub) < teamSize(next, !intoSub)) intoSub = !intoSub;
      // Raid Settings open as the raid goes into another mode: its stage there picked.
      if (picked !== null && state && next.mode !== state.mode) picked = next.stage;
      state = next;
      root.hidden = false;
      // Drawn anew, the Heroes List (and the screen) stay scrolled where they were.
      const { scrollTop: listAt } = heroes;
      const { scrollTop: rootAt } = root;
      draw();
      fit();
      heroes.scrollTop = listAt;
      root.scrollTop = rootAt;
    },
    note(text) {
      noteAt.textContent = text ?? '';
      fit();
    },
    hide() {
      closeSettings();
      moving.close();
      root.hidden = true;
      named();
    },
  };
}
