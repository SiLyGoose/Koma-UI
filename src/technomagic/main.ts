import '../shared/style.css';
import '../shared/ui/button/button.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { setMuted } from '../shared/audio';
import { gameSocket, linkToken, server, showMessage, single, token, watching, type GameSocket } from '../shared/game';
import { apiFromSocket, chatBox, startLive, store } from '../shared/ui';
import { landscapeCover } from '../shared/ui/landscape/landscape';
import { navigate } from '../shared/transition';
import { Group, Vector3 } from 'three';
import { artPicture } from './art';
import { built } from '../shared/built';
import { battlePicture, iconPicture, portraitPicture, type SkinAssets } from './assets';
import { bossNamed, DRAGONS, TM_BOSSES } from './sim/bosses';
import { bossIn, stagesOf, type BossDef } from './sim/bosses/boss';
import { BOSS_VIEWS } from './bosses/models';
import { makeStage } from './engine/stage';
import { Ahead } from './fight/ahead';
import { bossEffects, heroEffects } from './fight/kr-moves';
import { readSounds } from './fight/sounds';
import { makeFightView, SIGN_EFFECTS, type FightView } from './fight/view';
import { loadEffects } from './fx/effects';
import { makeKrEffects } from './fx/kr-effects';
import { makeMagic } from './fx/magic';
import { loadProps } from './fx/props';
import { HEROES } from './sim/heroes';
import { SCALE, type Hero } from './heroes/body/hero';
import { nearer, type HeroDef } from './sim/heroes/kit';
import { loadHeroes, type Entrant } from './heroes/load';
import { lookOf } from './heroes/looks';
import { makeActions } from './hud/actions';
import { makeBossBar } from './hud/boss-bar';
import { makeCard } from './hud/card';
import { attr, el } from './hud/dom';
import { leavePopup } from './hud/leave';
import { makeMeter } from './hud/meter';
import { makeNumbers, together } from './hud/numbers';
import { makeCastBar } from './hud/cast';
import { makeOverhead, type Overhead } from './hud/overhead';
import { makeBanners } from './hud/banners';
import { makeCurtain } from './fight/curtain';
import { makeMinions } from './fight/minions';
import { cutFace, cutHead, readPortrait } from './hud/portrait';
import { makeTimer } from './hud/timer';
import { makePrep } from './prep/prep';
import { managePopup } from './manage/popup';
import { makeResult, type ResultAction, type ResultStat } from './result';
import { installSounds, play as playSound } from './sfx';
import type { AnswerCode, ClientMessage, ErrorCode, FightStart, OverView, RoomState, ServerMessage, TurnInput } from '../protocol/technomagic';
import { HERO_TURN, makeSim, SECTION, SECTIONS, SIM_VERSION, TICK, type Input, type Sim } from './sim';
import { artifactBuff } from './sim/artifacts';
import { setBuff } from './sim/sets';
import { skillBuffs } from './sim/skills';
import { uniqueBuff } from './sim/unique';
import './technomagic.css';

/*
 * The TechnoMagic Raid: a boss fight seen from the side, the heroes on the left and the boss on the
 * right. The fight itself is the sim's (sim/: worked out a step at a time, thirty a second, nothing drawn);
 * this page draws it (fight/view.ts) and tells it what the players do.
 *
 * Opened from Discord or the front page (the link carries the player's token and the bot's WebSocket, after
 * the #), it is a raid of the server's, played together as in King's Raid (../protocol/technomagic.ts): the one the address
 * names (?room=, its id; `new`: one to create, put in the address once the bot says its id, so a reload comes back to it),
 * else an open one against the boss; or (single player, picked on the front page) a room of the player's own. Getting ready (prep/):
 * everyone puts heroes of theirs into the lineup and the host starts the fight. The fight is run by the bot,
 * and this page runs the same one from the same seed with everyone's presses as the bot relays them, never
 * going past the step the bot has reached (a step or two behind it, so it never has to wait). Each player
 * has a card for each of their own heroes along the bottom of the field (its health and mana, its three
 * skills, its Auto); everyone's heroes are on the field. The bot says how it ended, and what each found. With Auto
 * Repeat ticked on getting ready, a win's result goes again by itself (Stop Repeat Battle, over the fight, ends that).
 * Only the lineup's heroes are read (every hero's models together are well over a hundred MB), each as it's
 * picked, so they're in by the time the fight begins.
 *
 * Opened with no link (`yarn dev`), it is a field for trying things out, with nothing kept: every hero's
 * skins have a card, the hero on a card puts it on the field or takes it off, the buttons under the field
 * set the boss attacking (or Boss auto), and the raid's stage (?stage=) is picked there. With Deathless (on to
 * start with) no one falls, so moves and what they deal can be tried for as long as it takes; with Unique weapons
 * every hero wields its own (at its fifth tier), drawn with it. ?boss= picks the boss.
 *
 * The Dragon Raid (King's Raid's dragons, the raid heroes farm for gear and essences) is this page too, at games/dragon/
 * (its #app says `data-raid="dragon"`): its own socket, and the dragon named in the address (?boss=, else the last one
 * played here), switched between on the prep screen (the host bringing the raid along, or anyone going alone: prep/move.ts).
 *
 * Its parts: assets/ names the files (by hero, boss and effect); engine/ loads the models, poses their
 * bones and draws the field; heroes/ and bosses/ are who stands on it, a folder each; combat/ is how a
 * blow is worked out and sim/ the fight itself; fight/ draws it and fx/ what is drawn for a hit and a skill;
 * hud/ is what is shown over the field; prep/ getting ready in a room; styles/ how the page looks.
 */

/** Trying things out with Unique weapons on: the tier every hero's is at. */
const UNIQUE_TRIED = 5;
/** Which heroes were on the field last when trying things out (their names, as a list), kept by this browser. */
const FIELD_KEY = 'technomagic-field';
/** Whether Auto Repeat is ticked (in a room), kept by this browser. */
const REPEAT_KEY = 'technomagic-repeat';
/** Heroes that couldn't be read: none (and why, in the console), so the page goes on without them. */
const unread = (error: unknown): Entrant[] => {
  console.warn(error);
  return [];
};

/** Steps the sim may catch up in one frame (after the tab was away) when trying things out. */
const CATCH_UP = 8;
/** Trying things out: how far the wheel is turned (in its own pixels) to scroll the cards along by one. */
const WHEEL_STEP = 50;
/**
 * In a room: how far behind the bot this page may fall before it hurries to catch up (to LAG steps behind),
 * and, joining a fight long under way (or back to it after the page was away), jumps there.
 */
const LAG = 4;
const HURRY = 10;
const JUMP = 90;
/**
 * A fight over: how long the boss is seen beaten (or the party fallen) before what it gave is shown; and, the bot saying it
 * was won while this page's fight has the boss still standing (it gave up getting back in step with the bot's: MOST_RESYNCS),
 * how long its health takes to drain to nothing first, so it is never shown won with health left.
 */
const OVER_WAIT = 2;
const DRAIN = 0.5;
/**
 * In a room, this page's run of the fight out of step with the bot's (parted from it, getting no further short of where the
 * bot's ended, or ended otherwise): Reconnecting… over the field while it is given the fight again and runs it from the start
 * to where the bot's is. How long (seconds) it may get no further before that; how long it waits for the fight to come again
 * before asking again (with the connection made again); and how many times a fight it asks before it is let be, ended where
 * it is, its Battle Stats said to be short. And how long a page opened as a result is up waits for the fight before showing
 * the result without it.
 */
const STUCK = 3;
const RESYNC_WAIT = 4;
const MOST_RESYNCS = 4;
const NO_FIGHT_WAIT = 5;
/** Auto Repeat: how long a win's result is seen before this player is in for the next fight. */
const REPEAT_WAIT = 8;

/** Which raid this page is (its #app's data-raid): the TechnoMagic Raid's, or the Dragon Raid's; its name; and its bosses. */
const DRAGON = (document.getElementById('app') as HTMLElement).dataset.raid === 'dragon';
const RAID_NAME = DRAGON ? 'Dragon Raid' : 'TechnoMagic Raid';
const RAID_BOSSES: readonly BossDef[] = DRAGON ? DRAGONS : TM_BOSSES;

// A phone held upright: the raid is played on its side, so over everything, the words to turn it and the button that turns it.
landscapeCover(document.getElementById('app') as HTMLElement, {
  title: 'Turn your phone sideways',
  text: `The ${RAID_NAME} is played in landscape.`,
  back: { go: () => navigate('/', { back: true }) },
});

/** The dragon last played here (this browser's), fought when the address names none. */
const DRAGON_KEY = 'dragon-raid-boss';

/**
 * The boss this page is against: the one the address names (?boss=, one of this raid's), else (the Dragon Raid's) the
 * one last played here, else the raid's first. Trying things out, any boss may be named.
 */
function bossOfPage(params: URLSearchParams, trying: boolean): BossDef {
  const named = params.get('boss');
  const asked = named ? bossNamed(named) : null;
  if (asked && (trying || RAID_BOSSES.includes(asked))) return asked;
  const last = DRAGON ? RAID_BOSSES.find((boss) => boss.id === store.get(localStorage, DRAGON_KEY)) : undefined;
  return last ?? (RAID_BOSSES[0] as BossDef);
}

/**
 * This page again against another boss (the raid's, or another dragon's), its link kept (after the #), in the same raid
 * or (`room`) another (`new`: one to create): under the site's loading screen (../shared/transition/), so the page
 * reloading never shows bare.
 */
function goToBoss(id: string, room?: string): void {
  const address = new URL(location.href);
  address.searchParams.set('boss', id);
  if (room) address.searchParams.set('room', room);
  navigate(address.href, { replace: true });
}

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', `Open the ${RAID_NAME} again from the games page or from Discord for a new one.`],
  replaced: ['Opened somewhere else', 'The raid is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  full: ['The raid is full', 'As many people as can are already in this raid. Find or create another from the games page.'],
  gone: ['This raid is over', 'Everyone has left it. Find or create another from the games page.'],
};

const ANSWERS: Record<AnswerCode, string> = {
  closed: 'That can’t be done right now.',
  only_host: 'Only the host can do that.',
  not_owned: 'That hero isn’t yours.',
  picked: 'That hero is in already.',
  limit: 'You have as many heroes in as you can bring.',
  full: 'The lineup is full.',
  team_full: 'That team is full.',
  not_ready: 'Everyone has to be ready first.',
  no_heroes: 'Everyone needs a hero in first.',
  locked: 'Win the stage before it first.',
  failed: 'That didn’t work. Try again.',
};

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const party = document.getElementById('party') as HTMLElement;
const overheads = document.getElementById('overheads') as HTMLElement;
const numbersAt = document.getElementById('numbers') as HTMLElement;
const meterAt = document.getElementById('meter') as HTMLElement;
const actionsRow = document.getElementById('actions') as HTMLElement;
const bossAutoButton = document.getElementById('auto') as HTMLButtonElement;
const deathlessButton = document.getElementById('deathless') as HTMLButtonElement;
const uniqueButton = document.getElementById('unique') as HTMLButtonElement;
const stagePicker = document.getElementById('stage-pick') as HTMLSelectElement;
const hint = document.getElementById('hint') as HTMLElement;
const repeatStop = document.getElementById('repeat-stop') as HTMLButtonElement;
const results = makeResult(document.getElementById('result') as HTMLElement);

soundButton('technomagic-muted', setMuted);
installSounds();

/** What pressing a card does (trying things out: the sim directly; in a room: told to the bot), and whose cards are shown. */
interface Controls {
  mine(fighter: number): boolean;
  /** In a room: another player's hero (its health bar blue). */
  ally?(fighter: number): boolean;
  use(fighter: number, skill: number): void;
  auto(fighter: number): void;
  allAuto(): void;
  toggle?(fighter: number): void;
  /** In a room: what this page has pressed that its fight hasn't taken yet, shown at once. */
  ahead?: Ahead;
}

/** The fight on the page: its sim, how it is drawn, and what is shown over it. */
/**
 * As a fight is over (stageEnd()): where the row of heroes stands (how far toward the camera from the field's middle), the
 * height the camera looks at, how much of it it sees up and down, and how long the sting (Victory, Lose) plays before
 * its music.
 */
/** A raid of more than one wave: how long after the battle's banner its first phase's comes (seconds). */
const PHASE_AFTER = 1.9;
const ROW_Z = 2;
const ROW_LOOK = 1.7;
const ROW_HIGH = 7.2;
const STING = 3.2;

interface Game {
  sim: Sim;
  view: FightView;
  /** The fighters this player has (by their index), in the fight's order: the first four stand in the row as it is over. */
  mine: readonly number[];
  /** Each fighter's picture, as the meter has it. */
  faces: readonly string[];
  /** A room's (null: trying things out). */
  lock: Lock | null;
  /** Seconds not yet stepped. */
  owed: number;
  /** A room's that didn't end as the bot's did (drained to its end, or ended where it got to): its Battle Stats aren't all of the fight. */
  short?: boolean;
  draw(): void;
}

async function start(): Promise<void> {
  // Watching isn't playing: nothing to read.
  if (watching) {
    setConn('Not watchable', 'bad');
    showMessage('The raid isn’t watched', `Open the ${RAID_NAME} from the games page to join the room instead.`);
    return;
  }
  const params = new URLSearchParams(location.search);
  const def = bossOfPage(params, !(token && server));
  if (DRAGON) store.set(localStorage, DRAGON_KEY, def.id);
  const bossView = BOSS_VIEWS[def.id];
  if (!bossView) throw new Error(`${def.name} has no body`);
  // Trying things out: the boss in the mode the address names (?mode=normal: a dragon's Normal mode), at its stage.
  const tried = bossIn(def, params.get('mode') === 'normal' ? 'normal' : null);
  const stageNumber = Math.min(stagesOf(tried), Math.max(1, Math.floor(Number(params.get('stage'))) || 1));
  const stage = makeStage(canvas);
  // What every fight has, at once: the boss, the effects and the shield (and the field dressed). The heroes are read as
  // they're wanted (read()). Whatever isn't on this computer is left out: the page goes on without it.
  // What is drawn as light (a hit's effects, magic, the boss's venom): kept bright when the field goes dark (fight/view.ts).
  const bright = new Group();
  stage.scene.add(bright);
  const [boss, effects, props, fieldEffects] = await Promise.all([
    bossView.load(stage.scene, bright),
    loadEffects(bright),
    loadProps(stage.scene),
    bossView.look.scenery && stage.dress(bossView.look.scenery),
  ]);
  const magic = makeMagic(bright);
  // King's Raid's own effects, each read as it is first wanted.
  const kr = makeKrEffects(bright, stage.camera);
  // Its map's own (its fog, its sparks), always going on.
  if (fieldEffects) kr.ambient(fieldEffects);
  // The game's banners over the battle (its start, its finish).
  const banners = makeBanners(stage);
  // The minions of its raid's waves, their models and clips read now (a raid of one wave: none).
  const minions = makeMinions(stage.scene, bossView.look.assets, kr);
  // The map moved on to the next wave's platform, what stands on it with it (its own effects, a minion still falling and where one broke).
  const shift = (dx: number): void => {
    kr.shift(dx);
    minions.shift(dx);
  };
  const moveOn = (platforms: number): void => stage.moveOn(platforms, shift);

  /** Every body read so far (each skin of each hero read, and as they look with their unique weapons once that's wanted), for a fight to take from. */
  const pool: Entrant[] = [];
  /** The skins' own pictures for their cards (null: none, or it can't be read: it is pictured as it stands, once it does). */
  const faces = new Map<SkinAssets, string | null>();
  /** Which of those are the game's own battle portraits (drawn whole on the card, as King's Raid does), not cut from a skin's picture. */
  const battles = new Set<string>();
  /** And for the meter, their faces close up (null: the card's picture there too). */
  const heads = new Map<SkinAssets, string | null>();
  const reads = new Map<string, Promise<Entrant[]>>();
  /**
   * A hero's skin read (`skin`, by its index: its skins are big, and a fight has only the one picked; without it, every
   * one), once however often it's asked for, with what its fight needs of it besides: its props, its skills' pictures
   * (so a skill is never drawn without its own) and the skin's picture cut for its card and the meter. A skin that
   * isn't on this computer is left out (none: none read).
   */
  function read(hero: HeroDef, skin?: number): Promise<Entrant[]> {
    const key = skin === undefined ? hero.id : `${hero.id}:${skin}`;
    let reading = reads.get(key);
    if (!reading) {
      const { assets } = lookOf(hero.id);
      const pictures = hero.abilities.map((ability) => {
        const image = artPicture(ability.art);
        if (!image) return undefined;
        const picture = new Image();
        picture.src = image;
        return picture.decode().catch(() => undefined);
      });
      reading = Promise.all([loadHeroes([hero], { skin }).catch(unread), props.read(assets), Promise.all(pictures)]).then(async ([entrants]) => {
        // Its effects and sounds next (once its body is in: it can't fight without that, but can without these), so the fight begins with them.
        kr.read(heroEffects(assets));
        readSounds({ hero: assets });
        await Promise.all(
          entrants.map(async ({ skin }) => {
            const { portrait } = skin;
            // Its card's picture: the game's own battle portrait of it, where it has one (read before the fight shows it).
            const battle = battlePicture(assets, skin);
            const fought = battle && (await readPortrait(battle)) ? battle : null;
            if (fought) battles.add(fought);
            const icon = iconPicture(assets, skin);
            // (Its own picture read once for both cuts, where either is still wanted: the built WebP, a fifth of the PNG's size.)
            const picture = portrait && !(fought && icon) ? await readPortrait(built(portraitPicture(assets, portrait))) : null;
            faces.set(skin, fought ?? (picture && portrait ? cutFace(picture, portrait) : null));
            // (The meter's close-up: the game's own icon of it, where it has one.)
            heads.set(skin, icon ?? (picture && portrait ? cutHead(picture, portrait) : null));
          }),
        );
        pool.push(...entrants);
        return entrants;
      });
      reads.set(key, reading);
    }
    return reading;
  }
  const at = new Vector3();
  const pictureOf = (entrant: Entrant, view: FightView, who: number): string => {
    const face = faces.get(entrant.skin) ?? stage.portrait(entrant.hero.root, view.head(who, at), HERO_TURN - 0.45);
    faces.set(entrant.skin, face);
    return face;
  };
  const skinOf = (entrant: Entrant): number => Math.max(0, lookOf(entrant.def.id).assets.skins.indexOf(entrant.skin));

  const bossBar = makeBossBar(document.getElementById('boss') as HTMLElement, def.name, def.stats.deals);
  const numbers = makeNumbers(numbersAt);
  let game: Game | null = null;
  /** The room's way out (in a room: set below). */
  let leave = (): void => navigate('/', { back: true });

  // Top right: the raid's time left, and the way out of it.
  const timer = makeTimer(document.getElementById('timer') as HTMLElement, () => leave());

  // As a fight is over: the row of this player's heroes before a sheet of light, seen close (the page's HUD put away),
  // the result over them; and each of those taken back as the result is (or another fight begins).
  /** The first phase's banner, to come once the battle's has played (PHASE_AFTER seconds). */
  let phaseBanner = 0;
  const curtain = makeCurtain(stage.scene);
  const resultAt = document.getElementById('result') as HTMLElement;
  let afterSting = 0;
  function stageEnd(playing: Game, won: boolean): void {
    const at = new Vector3(playing.view.pan, 0, ROW_Z);
    // (Its first four on the field: the main team; in a room, its own.)
    playing.view.celebrate(playing.mine.filter((i) => playing.view.shown(i)).slice(0, 4), won, at);
    curtain.show(won, at);
    stage.focus({ at: new Vector3(at.x, ROW_LOOK, at.z), high: ROW_HIGH });
    document.body.classList.add('tm-ended');
    resultAt.classList.add('staged', won ? 'won' : 'lost');
    playSound(won ? 'victory' : 'lose');
    clearTimeout(afterSting);
    afterSting = window.setTimeout(() => playSound(won ? 'victoryMusic' : 'loseMusic'), STING * 1000);
  }
  /** What each hero did in the fight on the page, for its result's Battle Stats (`whose`: in a room, each one's tag and whether it is this player's; else all theirs). */
  function statsOf(playing: Game | null, whose: (i: number) => Pick<ResultStat, 'tag' | 'mine'> = () => ({ mine: true })): ResultStat[] {
    if (!playing) return [];
    return playing.sim.fighters.map((fighter, i) => ({
      name: fighter.name,
      face: playing.faces[i] ?? '',
      ...whose(i),
      dealt: fighter.dealt,
      healed: fighter.healed,
      mitigated: fighter.mitigated,
      taken: fighter.taken,
      shielded: fighter.shielded,
    }));
  }
  function unstage(): void {
    clearTimeout(afterSting);
    curtain.hide();
    stage.focus(null);
    document.body.classList.remove('tm-ended');
    resultAt.classList.remove('staged', 'won', 'lost', 'rewarding');
  }
  const hideResults = results.hide;
  results.hide = () => {
    hideResults();
    unstage();
  };

  /**
   * Puts a fight on the page (in place of the one there was): `entries` are its heroes' bodies, in the sim's order. `again`:
   * the same fight run again from the bot's (the page back, or parted from it), so no fanfare as it begins.
   */
  function play(sim: Sim, entries: readonly Entrant[], controls: Controls, lock: Lock | null, again = false): Game {
    unstage();
    game?.view.clear();
    // (A raid of more than one wave: the map back on its first platform, wherever the last fight left it.)
    moveOn(0);
    party.replaceChildren();
    overheads.replaceChildren();
    meterAt.replaceChildren();
    numbers.clear();
    const bodies: Hero[] = entries.map((entrant) => entrant.hero);
    const view = makeFightView({ scene: stage.scene, sim, bodies, boss, bossLook: bossView!.look, bossFx: bossView!.fx, effects, kr, magic, props, banners, minions, moveOn });
    if (!again) {
      banners.play('start');
      playSound('battle');
    }
    // (A raid of more than one wave: its first phase's banner after it, as the game's encounter has it.)
    clearTimeout(phaseBanner);
    if (sim.waves > 1 && !again) phaseBanner = window.setTimeout(() => banners.play('stage1'), PHASE_AFTER * 1000);
    // Each hero, for its card and the meter: its own picture, or with none a picture of its head and shoulders as it stands.
    const pictures = entries.map((entrant, i) => pictureOf(entrant, view, i));
    const cards = sim.fighters.map((fighter, i) => {
      if (!controls.mine(i)) return null;
      const { def: hero } = fighter;
      // Its passive, its set's effect, its unique weapon's, and its gear's additional skills (squares on its card).
      const passives = [
        // (Its passive in King's Raid's words, as the heroes page shows it.)
        ...(hero.passive ? [hero.passive.words ? { ...hero.passive.shown, about: hero.passive.words } : hero.passive.shown] : []),
        ...(fighter.set ? [setBuff(fighter.set, hero.class)] : []),
        ...(fighter.artifact ? [artifactBuff(fighter.artifact)] : []),
        ...(fighter.unique ? [uniqueBuff(fighter.id, fighter.unique.tier)] : []),
        ...skillBuffs(fighter.skills),
      ];
      const face = pictures[i] as string;
      const card = makeCard(fighter.name, face, fighter.abilities, passives, SECTIONS, {
        toggle: () => controls.toggle?.(i),
        auto: () => controls.auto(i),
        use: (index) => controls.use(i, index),
      }, battles.has(face));
      return card;
    });
    // Along the bottom as the lineup had them (../prep/prep.ts): the nearest the boss on the right, so the furthest back first.
    const shown = sim.fighters.map((fighter, i) => ({ def: fighter.def, card: cards[i] })).sort((a, b) => nearer(a.def, b.def)).reverse();
    for (const { card } of shown) if (card) party.append(card.root);
    const bars = sim.fighters.map((_, i) => makeOverhead(overheads, controls.ally?.(i) ?? false));
    // Each minion's health bar over its head (red), made as it comes onto the field; and the boss's wind-up, over its.
    const foeBars = new Map<number, Overhead>();
    const castBar = makeCastBar(overheads);
    /** Every hero of this player's on Auto. */
    const allAuto = (): boolean => sim.fighters.every((fighter, i) => !controls.mine(i) || (controls.ahead?.auto(i) ?? fighter.auto));
    const faces = sim.fighters.map((_, i) => heads.get((entries[i] as Entrant).skin) ?? (pictures[i] as string));
    const meter = makeMeter(
      meterAt,
      sim.fighters.map((fighter, i) => ({ name: fighter.name, face: faces[i] as string })),
      () => controls.allAuto(),
    );

    return {
      sim,
      view,
      mine: sim.fighters.map((_, i) => i).filter((i) => controls.mine(i)),
      faces,
      lock,
      owed: 0,
      draw() {
        const charging = view.charging;
        if (charging && !sim.boss.away) {
          const spot = stage.project(view.bossHead(at));
          castBar.draw(spot.x, spot.y, charging.name, charging.share);
        } else castBar.hide();
        for (const foe of sim.foes) {
          if (foe === sim.boss) continue;
          let bar = foeBars.get(foe.index);
          if (!bar && !foe.away) {
            bar = makeOverhead(overheads, false, true);
            foeBars.set(foe.index, bar);
          }
          const head = !foe.away && foe.hp > 0 ? view.foeHead(foe.index, at) : null;
          if (bar && head) {
            const spot = stage.project(head);
            bar.draw(spot.x, spot.y, foe.hp / foe.maxHp, 0, []);
          } else bar?.hide();
        }
        sim.fighters.forEach((fighter, i) => {
          const { part } = fighter;
          const on = sim.field.includes(fighter);
          // What its own skills have given it, then what another's (or the boss's) have left on it alone, then what is on every hero. (One for the rest of the fight shows how many are stacked in it.)
          const effects = [...(part.buffs?.() ?? []), ...[...fighter.statuses, ...sim.party].map((status) => ({ ...status.shown, left: Number.isFinite(status.left) ? status.left : undefined, count: status.count ?? status.shown.count }))];
          const bar = bars[i] as (typeof bars)[number];
          // The health bar over each hero on the field: over its health there, as on its card, its passive, then the rest.
          if (on && view.shown(i) && fighter.hp > 0) {
            view.place(i, at).y += SCALE * 1.7 + 0.5;
            const spot = stage.project(at);
            bar.draw(spot.x, spot.y, fighter.hp / fighter.stats.hp, fighter.shield, fighter.def.passive ? [fighter.def.passive.shown, ...effects] : effects);
          } else bar.hide();
          cards[i]?.draw({
            picked: on,
            hp: fighter.hp,
            maxHp: fighter.stats.hp,
            mana: fighter.mana / SECTION,
            maxMana: SECTIONS,
            auto: controls.ahead?.auto(i) ?? fighter.auto,
            cooldowns: fighter.cooldowns,
            slots: fighter.def.abilities.map((_, index) => sim.slot(fighter, index)),
            reserved: controls.ahead ? controls.ahead.reserved(i) : fighter.reserved,
            casting: fighter.doing?.skill ?? null,
            awake: part.lit?.() ?? false,
            effects,
          });
        });
        meter.draw(allAuto(), sim.fighters.map((fighter) => ({ on: sim.field.includes(fighter), down: sim.field.includes(fighter) && fighter.hp <= 0, dealt: fighter.dealt, healed: fighter.healed + fighter.shielded })), sim.elapsed);
      },
    };
  }

  // ---- Trying things out (no link) ----

  /** Every skin that could be read, the ones on the field last time on it again. */
  let actions: ReturnType<typeof makeActions> | null = null;
  /** The skins as they look with their heroes' unique weapons, read as Unique weapons is turned on for the heroes in the fight then (the ones that look the same: as they are). */
  let wielders: Entrant[] | null = null;
  /** The skins on the field last time (their names), as this browser kept them: none in a private window, or with nothing in it that can be read. */
  function keptField(): string[] {
    try {
      const list: unknown = JSON.parse(localStorage.getItem(FIELD_KEY) ?? '[]');
      return Array.isArray(list) ? list.filter((name): name is string => typeof name === 'string') : [];
    } catch {
      return [];
    }
  }
  function practise(entrants: readonly Entrant[]): void {
    const wielding = uniqueButton.getAttribute('aria-pressed') === 'true' && wielders !== null;
    const entries = wielding ? entrants.map((entrant) => wielders?.find((one) => one.def === entrant.def && one.skin === entrant.skin) ?? entrant) : entrants;
    const kept = keptField();
    const first = kept.map((name) => entrants.findIndex((entrant) => entrant.skin.name === name)).filter((i) => i >= 0);
    const sim = makeSim({ boss: tried, heroes: entries.map((entrant) => ({ def: entrant.def, skin: skinOf(entrant), uw: wielding ? UNIQUE_TRIED : null })), seed: Math.floor(Math.random() * 2 ** 32), stage: Number(stagePicker.value) || stageNumber, raid: false, first, deathless: deathlessButton.getAttribute('aria-pressed') === 'true' });
    const input = (what: Input): void => sim.input(what);
    game = play(sim, entries, {
      mine: () => true,
      use: (fighter, skill) => input({ kind: 'skill', fighter, skill }),
      auto: (fighter) => input({ kind: 'auto', fighter }),
      allAuto: () => input({ kind: 'all-auto' }),
      toggle(fighter) {
        input({ kind: 'toggle', fighter });
        // (Remembered once the sim has moved it on.)
        requestAnimationFrame(() => {
          try {
            localStorage.setItem(FIELD_KEY, JSON.stringify(sim.field.map((on) => on.name)));
          } catch {
            // Not remembered, but changed for now.
          }
        });
      },
    }, null);
    actions?.remove();
    actions = makeActions(actionsRow, bossAutoButton, def.attacks, { use: (attack) => input({ kind: 'boss', attack }), toggle: () => input({ kind: 'boss-auto' }) });
    hint.textContent = 'Trying things out: each hero on the field attacks by itself; use its skills from its card (or its Auto), and set the boss attacking. The hero on a card puts it on the field, or takes it off (up to 9 at once); four cards show at a time, as in a raid: scroll them along (or turn the wheel over them) for the rest. With Deathless on, no one falls: a hero or the boss brought down is whole again, and the raid’s time stands still. With it off, heroes that fall stay down.';
  }

  /**
   * Trying things out: the heroes on the field last time (else the first) read first, and the fight begun with them;
   * every other hero read after, and the fight begun again with them all (each skin has a card), the field kept.
   */
  async function practice(): Promise<void> {
    const kept = keptField();
    const fielded = HEROES.filter((hero) => lookOf(hero.id).assets.skins.some((skin) => kept.includes(skin.name)));
    let entrants = (await Promise.all((fielded.length > 0 ? fielded : HEROES.slice(0, 1)).map((hero) => read(hero)))).flat();
    // (None of them could be read: everyone, waited for.)
    let everyone = entrants.length > 0 ? null : (entrants = (await Promise.all(HEROES.map((hero) => read(hero)))).flat());
    if (entrants.length === 0) throw new Error('None of the heroes could be read');
    /** Unique weapons: those of the heroes in the fight read, where they haven't been. */
    const wield = async (): Promise<void> => {
      const missing = [...new Set(entrants.map((entrant) => entrant.def))].filter((hero) => !wielders?.some((one) => one.def === hero));
      if (missing.length === 0) return;
      uniqueButton.disabled = true;
      wielders = [...(wielders ?? []), ...(await loadHeroes(missing, { unique: true }).catch(unread))];
      uniqueButton.disabled = false;
    };
    actionsRow.hidden = false;
    for (let n = 1; n <= stagesOf(tried); n++) stagePicker.append(new Option(String(n), String(n), false, n === stageNumber));
    deathlessButton.hidden = false;
    deathlessButton.addEventListener('click', () => game?.sim.input({ kind: 'deathless' }));
    // Unique weapons: the fight begun again, every hero wielding its own (their models read the first time).
    uniqueButton.hidden = false;
    uniqueButton.addEventListener('click', async () => {
      const on = uniqueButton.getAttribute('aria-pressed') !== 'true';
      uniqueButton.setAttribute('aria-pressed', String(on));
      if (on) await wield();
      practise(entrants);
    });
    // As in a raid, four cards along the bottom at a time, the rest scrolled to: the wheel scrolls them sideways too, a
    // card at a time (so many of a trackpad's little turns, or one of a wheel's, to a card).
    party.classList.add('browse');
    let turned = 0;
    party.addEventListener(
      'wheel',
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        turned += event.deltaY;
        if (Math.abs(turned) < WHEEL_STEP) return;
        const [first, second] = party.children as unknown as HTMLElement[];
        const card = first && second ? second.offsetLeft - first.offsetLeft : party.clientWidth / 4;
        party.scrollBy({ left: Math.sign(turned) * card, behavior: 'smooth' });
        turned = 0;
      },
      { passive: false },
    );
    stagePicker.addEventListener('change', () => {
      game?.sim.input({ kind: 'stage', stage: Number(stagePicker.value) });
      const address = new URL(location.href);
      address.searchParams.set('stage', stagePicker.value);
      history.replaceState(null, '', address);
    });
    practise(entrants);
    setConn('Preview', 'ok');
    // The rest, read meanwhile: the fight begun again with everyone (as Unique weapons has it).
    if (!everyone)
      void Promise.all(HEROES.map((hero) => read(hero))).then(async (all) => {
        everyone = all.flat();
        if (everyone.length <= entrants.length) return;
        entrants = everyone;
        if (uniqueButton.getAttribute('aria-pressed') === 'true') await wield();
        practise(entrants);
      });
    // Over: the result, and again.
    onOver = (sim) =>
      results.show({
        title: sim.result === 'won' ? 'Victory' : 'Defeat',
        text: sim.result === 'won' ? `${def.name} is beaten.` : 'Your heroes fell.',
        points: 0,
        mine: [],
        others: [],
        stats: statsOf(game),
        actions: [
          {
            label: 'Again',
            icon: 'again',
            main: true,
            run: () => {
              results.hide();
              practise(entrants);
            },
          },
          { label: 'Games', icon: 'games', run: () => leave() },
        ],
      });
  }

  // ---- A room (the link's server) ----

  function room(address: string): void {
    actionsRow.hidden = true;
    // The boss's effects, sounds and music, and every fight's signs, read while everyone gets ready (the heroes' as they're picked: read()).
    kr.read([...bossEffects(bossView!.look.assets), ...SIGN_EFFECTS]);
    readSounds({ boss: bossView!.look.assets });
    hint.textContent = `Each player uses their own heroes’ skills from their cards (or Auto, top left); everyone’s heroes are on the field (single player, the Sub Team fights on Auto, with no cards). Heroes that fall stay down: beat ${def.name} before its rage wipes the party.${DRAGON ? ' Your heroes’ stuns wear its CC Gauge down: empty, it is knocked down, and takes more damage.' : ''}`;
    let socket: GameSocket<ClientMessage> | null = null;
    let state: RoomState | null = null;
    let lock: Lock | null = null;
    let shownOver: OverView | null = null;
    const send = (message: ClientMessage): boolean => socket?.send(message) ?? false;

    // This page's run of the fight out of step with the bot's: Reconnecting… over the field while it is given the fight again.
    const syncing = el('p', 'tm-syncing', 'Reconnecting…');
    syncing.setAttribute('role', 'status');
    syncing.hidden = true;
    repeatStop.after(syncing);
    /** How many times this page has asked for each fight again (by its number). */
    const resyncs = new Map<number, number>();
    let resyncTimer = 0;
    /**
     * This page's run of fight `at` is out of step with the bot's (the bot's is the one that counts): it asks for it again,
     * to run it from the start to where the bot's is (catchUp). Parted (`second`: where), the bot is told so; otherwise (it got
     * no further, or ended otherwise than the bot's) the connection is made again, on which the bot gives it the whole fight.
     * The fight not come again in RESYNC_WAIT, asked again; asked MOST_RESYNCS times, it is let be (`lost`).
     */
    function resync(at: Lock, second?: number): void {
      if (at.resyncing || at.lost || lock !== at) return;
      const times = (resyncs.get(at.start.no) ?? 0) + 1;
      resyncs.set(at.start.no, times);
      if (times > MOST_RESYNCS) {
        at.lost = true;
        syncing.hidden = true;
        console.warn(`This page's fight is still out of step with the bot's after running it again from the bot's ${MOST_RESYNCS} times: what it draws may not be what happens.`);
        return;
      }
      at.resyncing = true;
      syncing.hidden = false;
      if (second !== undefined) send({ t: 'parted', no: at.start.no, second });
      else socket?.reconnect();
      clearTimeout(resyncTimer);
      resyncTimer = window.setTimeout(() => {
        if (lock !== at || !at.resyncing) return;
        at.resyncing = false;
        resync(at);
      }, RESYNC_WAIT * 1000);
    }
    /**
     * Fight `at` given again from the bot's: straight to where the bot's is (drawing only what stands on the field), once its
     * presses have come. Reconnecting… stays up until it is seen in step with the bot's going on from there (synced).
     */
    function catchUp(at: Lock): void {
      if (!at.catchUp || at.upTo === 0 || game?.lock !== at) return;
      at.catchUp = false;
      while (game.sim.tick < at.upTo - LAG && !game.sim.result) stepRoom(game.sim, at);
      game.view.skip();
      game.owed = 0;
      at.confirmAfter = game.sim.sums.length;
      at.confirming = true;
    }
    /** Fight `at`, given again, in step with the bot's past where it caught up (a checksum the bot's, or ended as the bot's did): Reconnecting… goes. */
    function synced(at: Lock): void {
      if (!at.confirming || at.resyncing) return;
      at.confirming = false;
      if (lock === at) syncing.hidden = true;
    }
    resyncRoom = resync;
    syncedRoom = synced;
    const name = (id: string): string => state?.players.find((player) => player.id === id)?.name ?? 'Someone';

    const prep = makePrep({
      pick(hero, sub) {
        // In the outfit it wears: the bot's word (its skin in the lineup, read as the lineup comes: below).
        send({ t: 'pick', hero, skin: 0, ...(sub && { sub }) });
      },
      unpick: (hero) => send({ t: 'unpick', hero }),
      ready: (on) => send({ t: 'ready', on }),
      stage: (n) => send({ t: 'stage', stage: n }),
      mode: (mode) => send({ t: 'mode', mode }),
      begin: (force) => send({ t: 'begin', ...(force && { force }) }),
      repeat: (on) => setRepeat(on),
      // Another dragon: the raid taken against it (the page goes once the bot says so), or this page again alone, in a
      // room of their own against it (single player) or out of the raid into a new one.
      boss: (id, bring) => {
        if (id === def.id) return;
        if (bring) {
          send({ t: 'boss', boss: id });
          return;
        }
        if (state?.solo) return goToBoss(id);
        send({ t: 'part' });
        socket?.finish();
        goToBoss(id, 'new');
      },
    }, def);
    const chat = chatBox({ mount: prep.chat, send, you: () => state?.you ?? null });
    // Manage: the heroes page over the room, not the site's (which would take them out of it). A button in place of
    // the link: the page's links are caught before anything on them hears the click (../shared/transition/). Closed, the
    // bot reads their heroes again, so getting ready shows them as they are now (a hero transcended in it).
    const manage = managePopup(document.getElementById('app') as HTMLElement, linkToken, address, () => void send({ t: 'heroes' }));
    const manageLink = document.querySelector('.tm-prep-manage');
    if (manageLink) {
      const button = el('button', manageLink.className, manageLink.textContent ?? 'Manage');
      button.type = 'button';
      button.addEventListener('click', () => manage.open());
      manageLink.replaceWith(button);
    }

    // The way out: mid-fight, asked first (../hud/leave.ts), then the bot told they've left it for good (`quit`: they
    // forfeit what it gives; single player, it is lost; with others, their heroes fight on and they are out of the room,
    // so this page stops coming back to it) and their Defeat shown, from which they go. Otherwise they just go.
    /** They left the fight going on (its result, once it ends, isn't shown them); and (single player) once it is over, back to getting ready. */
    let left = false;
    let backAfter = false;
    const games = (): void => navigate('/', { back: true });
    const leaving = leavePopup(document.getElementById('app') as HTMLElement, () => {
      if (state?.phase !== 'fight') {
        games();
        return null;
      }
      if (!send({ t: 'quit' })) return 'Not connected to the raid right now. Try again in a moment.';
      left = true;
      drawRepeat();
      if (!state.solo) socket?.finish();
      leaving.close();
      showLeft(state.solo);
      return null;
    });
    leave = () => {
      if (state?.phase === 'fight' && !game?.sim.result && !left) return leaving.open(state.solo);
      games();
    };

    // Auto Repeat (ticked on getting ready): a boss beaten, in for the next fight straight from the result (Run Again,
    // REPEAT_WAIT after it is shown). Over the fight and its result while it is on, Stop Repeat Battle turns it off; not
    // over a defeat, which doesn't go again (Run Again is pressed), so the button doesn't read as it carrying on.
    let repeat = store.get(localStorage, REPEAT_KEY) === 'on';
    let repeating: number | undefined;
    function setRepeat(on: boolean): void {
      repeat = on;
      store.set(localStorage, REPEAT_KEY, on ? 'on' : null);
      prep.repeat(on);
      if (!on) clearTimeout(repeating);
      drawRepeat();
      if (state?.phase === 'over' && shownOver && !left) results.actions(overActions());
    }
    function drawRepeat(): void {
      repeatStop.hidden = !repeat || left || state === null || state.phase === 'prep' || (state.phase === 'over' && state.over?.result !== 'won');
    }
    repeatStop.addEventListener('click', () => setRepeat(false));
    prep.repeat(repeat);

    /** Their Defeat, having left: single player, back to getting ready (once the bot has ended the fight) or to the games; with others, to the games. */
    function showLeft(solo: boolean): void {
      results.show({
        title: 'Defeat',
        text: solo ? 'You left the battle, so it was lost.' : 'You left the raid. Your heroes fight on with the party on Auto, but you forfeit its rewards.',
        points: 0,
        mine: [],
        others: [],
        actions: solo
          ? [
              {
                label: 'Raid Prep',
                icon: 'prep',
                main: true,
                run: () => {
                  if (state?.phase === 'over') send({ t: 'back' });
                  else backAfter = true;
                },
              },
              { label: 'Games', icon: 'games', run: games },
            ]
          : [{ label: 'Games', icon: 'games', main: true, run: games }],
      });
    }

    /** The skins read as they look with their heroes' unique weapons (whatever came of it), by hero and skin. */
    const wieldersRead = new Map<string, Promise<void>>();
    /** A hero's skin read as it looks with its unique weapon, once (where that looks otherwise: none, where it doesn't). */
    const wield = (def: HeroDef, skin: number): Promise<void> => {
      const key = `${def.id}:${skin}`;
      let reading = wieldersRead.get(key);
      if (!reading) {
        reading = loadHeroes([def], { unique: true, skin }).then((more) => void pool.push(...more), () => undefined);
        wieldersRead.set(key, reading);
      }
      return reading;
    };

    /**
     * Bodies for a fight's heroes: one each, in its skin where this computer has it (two players' Kirze each need their own),
     * and with its unique weapon in its hands when it wields it (where that looks otherwise: read the first time it is needed).
     */
    async function bodiesFor(heroes: FightStart['heroes']): Promise<Entrant[] | null> {
      const defs = heroes.map((hero) => HEROES.find((one) => one.id === hero.id));
      // Every hero read in its skin (those in the lineup were, as they were picked), and as it looks wielding its unique weapon where it does, all at once.
      await Promise.all(heroes.map((hero, i) => defs[i] && Promise.all([read(defs[i], hero.skin), typeof hero.uw === 'number' && wield(defs[i], hero.skin)])));
      const used = new Set<Entrant>();
      const bodies: Entrant[] = [];
      for (const [i, hero] of heroes.entries()) {
        const def = defs[i];
        if (!def) return null;
        const wielding = typeof hero.uw === 'number';
        const fits = (one: Entrant): boolean => one.def.id === hero.id && !used.has(one);
        const looks = (one: Entrant): boolean => fits(one) && one.unique === wielding;
        let body = pool.find((one) => looks(one) && skinOf(one) === hero.skin) ?? pool.find((one) => fits(one) && skinOf(one) === hero.skin) ?? pool.find(looks) ?? pool.find(fits);
        if (!body) {
          // Another of it (two players' Kirze), or its skin isn't on this computer: that skin read again, or (with none) any of its.
          const again = async (skin?: number): Promise<Entrant[]> => [
            ...(await loadHeroes([def], { skin }).catch(unread)),
            ...(wielding ? await loadHeroes([def], { unique: true, skin }).catch(unread) : []),
          ];
          let more = await again(hero.skin);
          if (more.length === 0) more = await again();
          pool.push(...more);
          body = more.find((one) => one.unique === wielding && skinOf(one) === hero.skin) ?? more.find((one) => skinOf(one) === hero.skin) ?? more[0];
        }
        if (!body) return null;
        used.add(body);
        bodies.push(body);
      }
      return bodies;
    }

    async function fight(start: FightStart): Promise<void> {
      // (Given again a fight this page has drawn to its end already, back as its result is up: it stays as it is.)
      if (shownOver?.no === start.no || (game?.lock?.start.no === start.no && (overShown === game.sim || ending?.sim === game.sim))) return;
      // The same fight again, from the bot's (this page back to it, or its run out of step with the bot's): run again from the
      // start, straight to where the bot's is.
      const again = lock?.start.no === start.no;
      const mine = new Lock(start);
      mine.catchUp = again;
      lock = mine;
      clearTimeout(resyncTimer);
      if (!again) syncing.hidden = true;
      shownOver = null;
      results.hide();
      const bodies = await bodiesFor(start.heroes);
      if (lock !== mine) return;
      if (!bodies) return void showMessage('The models are missing', 'A hero in this fight isn’t on this computer.');
      const sim = makeSim({ boss: bossIn(def, start.mode), heroes: start.heroes.map((hero, i) => ({ def: (bodies[i] as Entrant).def, skin: hero.skin, gear: hero.gear, set: hero.set, uw: hero.uw ?? null, ut: hero.ut ?? null, artifact: hero.artifact ?? null, skills: hero.skills, perks: hero.perks, sub: hero.sub === true })), seed: start.seed, stage: start.stage, raid: true, solo: start.solo });
      const you = state?.you;
      // (Not the Sub Team's: they fight on Auto, with no cards.)
      const ours = (i: number): boolean => start.heroes[i]?.owner === you && start.heroes[i]?.sub !== true;
      const ahead = new Ahead(sim);
      game = play(sim, bodies, {
        mine: ours,
        ally: (i) => start.heroes[i]?.owner !== you,
        use(fighter, skill) {
          ahead.press(fighter, skill);
          send({ t: 'press', fighter, skill });
        },
        auto(fighter) {
          ahead.toggle(fighter);
          send({ t: 'auto', fighter });
        },
        allAuto() {
          ahead.toggleAll(start.heroes.flatMap((_, i) => (ours(i) ? [i] : [])));
          send({ t: 'auto-all' });
        },
        ahead,
      }, mine, again);
      catchUp(mine);
      // Joined a fight long under way (or back to it after the page was away): straight to where it is (drawing only what stands on the field).
      if (mine.upTo - sim.tick > JUMP) {
        while (sim.tick < mine.upTo - LAG && !sim.result) stepRoom(sim, mine);
        game.view.skip();
      }
    }

    /** One step of a room's fight, with what was pressed before it; and its checksum, against the bot's. */
    function stepRoom(sim: Sim, at: Lock): void {
      while (at.queue.length > 0 && (at.queue[0] as TurnInput).tick <= sim.tick) {
        const { tick: _tick, ...press } = at.queue.shift() as TurnInput;
        sim.input(press as Input);
      }
      sim.step();
      for (; at.checked < sim.sums.length; at.checked++) {
        const theirs = at.sums.get(at.checked + 1);
        if (theirs === undefined) continue;
        if (theirs === sim.sums[at.checked]) {
          if (at.checked >= at.confirmAfter) synced(at);
        } else if (!at.parted) {
          at.parted = true;
          // The bot's is the one that counts: it gives this page the fight again (its start and every press so far), to run again
          // from the start up to where the bot's is.
          console.warn(`This page's fight parted from the bot's at second ${at.checked + 1}: running it again from the bot’s.`);
          resync(at, at.checked + 1);
        }
      }
    }
    stepLock = stepRoom;

    function receive(message: ServerMessage): void {
      switch (message.t) {
        case 'error': {
          socket?.finish();
          const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
          showMessage(title, text);
          setConn('Disconnected', 'bad');
          return;
        }
        case 'room': {
          state = message.state;
          // A raid just created (or found): its id in the address, so a reload comes back to it.
          if (state.room && state.room !== wantedRoom) {
            wantedRoom = state.room;
            const address = new URL(location.href);
            address.searchParams.set('room', state.room);
            history.replaceState(history.state, '', address);
          }
          if (state.version !== SIM_VERSION) {
            socket?.finish();
            showMessage('This page is out of date', 'The raid has changed since this page was opened. Reload it to play.');
            return;
          }
          // In another boss's room than this page's (one this raid hasn't): this page again, against that one.
          if (state.boss.id !== def.id) {
            socket?.finish();
            return goToBoss(state.boss.id);
          }
          // The lineup's heroes read meanwhile, each in its skin (once), so they're in when the fight begins.
          for (const pick of state.lineup) {
            const hero = HEROES.find((one) => one.id === pick.hero);
            if (hero) void read(hero, pick.skin);
          }
          if (state.phase === 'over' && backAfter) {
            backAfter = false;
            send({ t: 'back' });
          }
          if (state.phase === 'prep') {
            left = false;
            backAfter = false;
            lock = null;
            syncing.hidden = true;
            game?.view.clear();
            game = null;
            party.replaceChildren();
            overheads.replaceChildren();
            meterAt.replaceChildren();
            results.hide();
            prep.show(state);
          } else {
            prep.hide();
            // Their gear is taken as the fight begins: no more changing it.
            manage.close();
          }
          // (The field isn't drawn under getting ready: it can't be seen, and a phone has the heroes being read meanwhile.)
          stage.cover(state.phase === 'prep');
          if (state.phase !== 'fight') leaving.close();
          // (Over with no fight on the page, opened as the result is up: the bot gives it the fight, to draw it to its end and
          // what each hero did; should that not come, the result as it is.)
          if (state.phase === 'over' && state.over && !game) {
            const over = state.over;
            window.setTimeout(() => {
              if (!game && state?.over === over) showOver(over);
            }, NO_FIGHT_WAIT * 1000);
          }
          // Who is in for running it again, as it changes.
          if (state.phase === 'over' && shownOver && !left) results.actions(overActions());
          drawRepeat();
          return;
        }
        case 'fight':
          void fight(message.fight);
          return;
        case 'turn': {
          if (!lock || lock.start.no !== message.no) return;
          lock.queue.push(...message.inputs);
          lock.upTo = Math.max(lock.upTo, message.upTo);
          for (const [second, sum] of message.sums) lock.sums.set(second, sum);
          catchUp(lock);
          return;
        }
        case 'answer':
          prep.note(ANSWERS[message.code] ?? ANSWERS.failed);
          setTimeout(() => prep.note(null), 4000);
          return;
        case 'chat':
        case 'chats':
          chat.receive(message);
          return;
      }
    }

    /** What a fight over gave everyone, once this page has drawn it to its end. */
    function showOver(over: OverView): void {
      if (shownOver === over || left) return;
      shownOver = over;
      const you = state?.you ?? '';
      const mine = over.drops[you] ?? [];
      const paid = over.points[you] ?? 0;
      const essences = over.essences?.[you] ?? {};
      const gems = over.gems?.[you] ?? 0;
      const stones = over.stones?.[you];
      const crystals = over.crystals?.[you];
      const others = Object.entries(over.drops).flatMap(([who, drops]) => (who !== you && drops.length > 0 ? [{ who: name(who), drops }] : []));
      const text =
        over.result === 'won'
          ? mine.length > 0 || paid > 0 || gems > 0 || stones !== undefined || crystals !== undefined
            ? DRAGON
              ? `Found in ${def.name}’s lair:`
              : 'Found in the swamp:'
            : 'Nothing was found this time.'
          : 'The party fell. Gear your heroes up on the Heroes page and try again.';
      results.show({
        title: over.result === 'won' ? 'Victory' : 'Defeat',
        text,
        points: paid,
        essences,
        gems,
        ...(stones && { stones }),
        ...(crystals && { crystals }),
        firstClears: over.firstClears?.[you] ?? 0,
        raid: DRAGON ? 'dragon' : 'technomagic',
        mine,
        others,
        stats: statsOf(game, (i) => {
          const owner = game?.lock?.start.heroes[i]?.owner;
          const number = state?.solo ? undefined : state?.players.find((player) => player.id === owner)?.number;
          return { ...(number !== undefined && { tag: `${number}P` }), mine: owner === you };
        }),
        ...((game?.short || game?.lock?.lost) && { statsNote: 'This page lost track of the fight, so these may not be all of it.' }),
        actions: overActions(),
      });
      if (over.result !== 'won' || !repeat) return;
      clearTimeout(repeating);
      repeating = window.setTimeout(() => {
        const me = state?.players.find((player) => player.id === state?.you);
        if (repeat && state?.phase === 'over' && shownOver === over && !left && !me?.ready) send({ t: 'again' });
      }, REPEAT_WAIT * 1000);
    }

    /**
     * The ways on from a fight over. Run Again says this player is in for the next fight, which the bot starts once everyone
     * is, straight from here (with others, how many are beside it); in, they wait for the rest, and the host can force it.
     */
    function overActions(): ResultAction[] {
      const players = state?.players ?? [];
      const me = players.find((player) => player.id === state?.you);
      const note = players.length > 1 ? `${players.filter((player) => player.ready).length}/${players.length} Ready` : repeat && shownOver?.result === 'won' ? 'Auto Repeat' : undefined;
      const again: ResultAction = !me?.ready
        ? { label: 'Run Again', icon: 'again', main: true, note, run: () => send({ t: 'again' }) }
        : me.host
          ? { label: 'Force Start', icon: 'again', note, title: 'Start the next fight without waiting for everyone (whoever has no hero in sits it out)', run: () => send({ t: 'begin', force: true }) }
          : { label: 'Waiting', icon: 'again', note, disabled: true, title: 'You’re in: the next fight starts once everyone is', run: () => {} };
      return [again, { label: 'Raid Prep', icon: 'prep', run: () => send({ t: 'back' }) }, { label: 'Games', icon: 'games', run: () => leave() }];
    }
    onOver = () => {
      if (state?.over) showOver(state.over);
    };
    overWaiting = () => (state?.phase === 'over' && state.over ? state.over : null);

    // The raid the address names (?room=), one to create (`new`), or (none) an open one against the boss.
    let wantedRoom = new URLSearchParams(location.search).get('room');
    const where = (): Pick<Extract<ClientMessage, { t: 'hello' }>, 'room' | 'create'> => (single || !wantedRoom ? {} : wantedRoom === 'new' ? { create: true } : { room: wantedRoom });
    // (In a fight, the bot says what was pressed every tenth of a second: quiet for long, the connection is dead, a phone back
    // from another app most often, and it is made again, the fight taken up again from the bot's.)
    socket = gameSocket<ServerMessage, ClientMessage>({
      server: address,
      hello: () => ({ t: 'hello', token: linkToken(), ...(single && { single }), boss: def.id, ...where() }),
      receive,
      steady: () => state?.phase === 'fight' && game !== null && game.sim.result === null,
    });
    startLive({ mount: barSlot(), api: apiFromSocket(address), auth: () => `Game ${linkToken()}`, newTab: true });
  }

  /** A room's fight, a step on (set by room()); the fight is over (shows the result); in a room, the result waiting to be shown. */
  let stepLock: ((sim: Sim, lock: Lock) => void) | null = null;
  /** A room's fight out of step with the bot's: given again from the bot's, to run to where it is (set by room()). */
  let resyncRoom: (lock: Lock) => void = () => {};
  /** That fight, given again, seen in step with the bot's: Reconnecting… goes (set by room()). */
  let syncedRoom: (lock: Lock) => void = () => {};
  let onOver: (sim: Sim) => void = () => {};
  let overWaiting: () => OverView | null = () => null;
  let overShown: Sim | null = null;
  /** The fight over, before what it gave is shown: since when (the frame's time: from when the boss was at 0%), and the boss's health as it ended. */
  let ending: { sim: Sim; at: number; from: number } | null = null;
  /** In a room, the result waiting while this page's fight goes no further, short of the bot's end: since when (the frame's time), and at which step. */
  let stuck: { sim: Sim; tick: number; at: number } | null = null;

  if (token && server) room(server);
  else await practice();

  stage.start((now, dt, gap) => {
    banners.update(gap);
    const playing = game;
    if (!playing) {
      stage.dim(0, []);
      stage.pan(0);
      return;
    }
    const { sim, view, lock } = playing;
    if (lock && stepLock) {
      // A room's: on with the bot, a few steps behind it, hurrying when it has fallen further.
      playing.owed += dt;
      let steps = Math.floor(playing.owed / TICK);
      playing.owed -= steps * TICK;
      const behind = lock.upTo - sim.tick;
      if (behind > JUMP) {
        // Far behind (the page was away, a phone on another app): straight to where it is, drawing only what stands on the field.
        while (sim.tick < lock.upTo - LAG && !sim.result) stepLock(sim, lock);
        view.skip();
        playing.owed = 0;
      } else {
        if (behind > HURRY) steps = Math.max(steps, behind - LAG);
        steps = Math.min(steps, behind);
        for (let i = 0; i < steps && !sim.result; i++) stepLock(sim, lock);
        if (sim.tick >= lock.upTo) playing.owed = Math.min(playing.owed, TICK);
      }
    } else {
      // Trying things out: as many steps as the time drawn calls for.
      playing.owed = Math.min(playing.owed + dt, TICK * CATCH_UP);
      while (playing.owed >= TICK && !sim.result) {
        sim.step();
        playing.owed -= TICK;
      }
    }
    view.update(now, dt);
    stage.pan(view.pan);
    stage.dim(view.dark, view.lit ? [view.lit, bright] : [bright]);
    actions?.draw(sim.bossAuto);
    if (!lock) attr(deathlessButton, 'aria-pressed', String(sim.deathless));
    playing.draw();

    // What each blow took and each heal gave, coming off whom it was (a frame's of a kind on one body, as one).
    for (const popup of together(view.numbers.splice(0))) {
      const spot = stage.project(popup.at);
      numbers.show(spot.x, spot.y, popup);
    }

    // The boss's health, and what is the matter with it.
    bossBar.draw(sim.boss.hp / sim.boss.maxHp, sim.marks(), sim.gauge());
    timer.draw(sim.left, sim.wave, sim.waves);
    // Over (in a room: once the bot has said what it gave, and this page has drawn the fight to the step the bot's ended at,
    // as the bot's ended: the bot's word is the one). Won, the boss is beaten for a moment (OVER_WAIT) before what it gave is
    // shown; lost, the party fallen for as long.
    // (In a room, this page's run of that fight out of step with the bot's, getting no further short of the bot's end for
    // STUCK seconds or ended otherwise, is given the fight again from the bot's and run to where it is: resyncRoom. Only once
    // it has been given it MOST_RESYNCS times (lost) is it ended where it is, the boss drained to 0% should the bot's have won.)
    const over = lock ? overWaiting() : null;
    let ended = sim.result !== null;
    if (lock) {
      const ours = over !== null && over.no === lock.start.no;
      const atEnd = ours && (sim.result !== null || sim.tick >= over.upTo);
      const held = ours && !atEnd && sim.tick >= lock.upTo;
      if (!held) stuck = null;
      else if (stuck?.sim !== sim || stuck.tick !== sim.tick) stuck = { sim, tick: sim.tick, at: now };
      const stalled = stuck !== null && now - stuck.at >= STUCK;
      const otherwise = atEnd && sim.result !== over.result;
      if ((stalled || otherwise) && !lock.lost) resyncRoom(lock);
      ended = (atEnd && (!otherwise || lock.lost)) || (stalled && lock.lost);
      if (atEnd && !otherwise) syncedRoom(lock);
    }
    if (overShown !== sim && ended) {
      if (ending?.sim !== sim) {
        ending = { sim, at: now, from: sim.boss.hp };
        // (Ended otherwise than the bot's, or not at all: what this page drew isn't all of the fight.)
        if (lock && sim.result !== over?.result) playing.short = true;
      }
      const won = lock ? over?.result === 'won' : sim.result === 'won';
      if (won && sim.boss.hp > 0) {
        sim.boss.hp = Math.max(0, sim.boss.hp - (ending.from * dt) / DRAIN);
        ending.at = now;
        // (Down it goes, as it does when this page's fight beats it.)
        if (sim.boss.hp <= 0) sim.events.push({ kind: 'boss-daze', seconds: OVER_WAIT + 1, down: true });
      } else if (now - ending.at >= OVER_WAIT) {
        overShown = sim;
        stageEnd(playing, won);
        onOver(sim);
      }
    }
  });
}

/**
 * A room's fight as the bot tells it: which, up to which step, and what was pressed at which step (and its checksums, by second);
 * its checksums compared so far, and whether one parted from the bot's (said once). `catchUp`: given again from the bot's (out of
 * step with it), run straight to where the bot's is once its presses come; `confirming`: so run, Reconnecting… up until a
 * checksum past the seconds it caught up through (`confirmAfter`) is the bot's; `resyncing`: out of step, waiting for it to
 * come again; `lost`: asked for again MOST_RESYNCS times, let be.
 */
class Lock {
  upTo = 0;
  queue: TurnInput[] = [];
  sums = new Map<number, number>();
  checked = 0;
  parted = false;
  catchUp = false;
  confirming = false;
  confirmAfter = 0;
  resyncing = false;
  lost = false;
  constructor(readonly start: FightStart) {}
}

start().catch((error: unknown) => {
  console.error(error);
  setConn('No models', 'bad');
  showMessage('The models are missing', 'This page shows models kept on your own computer. Copy them in with "node scripts/kr-assets.mjs" and open it from "yarn dev".');
});
