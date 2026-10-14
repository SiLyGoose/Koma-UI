import '../shared/style.css';
import '../shared/ui/button/button.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { setMuted } from '../shared/audio';
import { gameSocket, server, showMessage, token, watching, type GameSocket } from '../shared/game';
import { apiFromSocket, chatBox, startLive } from '../shared/ui';
import { navigate } from '../shared/transition';
import { Vector3 } from 'three';
import { portraitPicture } from './assets';
import { bossNamed } from './bosses';
import { BOSS_VIEWS } from './bosses/models';
import { makeStage } from './engine/stage';
import { makeFightView, type FightView } from './fight/view';
import { loadEffects } from './fx/effects';
import { makeMagic } from './fx/magic';
import { HEROES } from './heroes';
import { SCALE, type Hero } from './heroes/body/hero';
import { nearer } from './heroes/kit';
import { loadHeroes, type Entrant } from './heroes/load';
import { makeActions } from './hud/actions';
import { makeBossBar } from './hud/boss-bar';
import { makeCard } from './hud/card';
import { makeMeter } from './hud/meter';
import { makeNumbers } from './hud/numbers';
import { makeOverhead } from './hud/overhead';
import { cutFace, cutHead } from './hud/portrait';
import { makeTimer } from './hud/timer';
import { makePrep } from './prep/prep';
import type { AnswerCode, ClientMessage, ErrorCode, FightStart, OverView, RoomState, ServerMessage, TurnInput } from './protocol';
import { HERO_TURN, makeSim, SECTION, SECTIONS, SIM_VERSION, STAGES, TICK, type Input, type Sim } from './sim';
import './technomagic.css';

/*
 * The TechnoMagic Raid: a boss fight seen from the side, the heroes on the left and the boss on the
 * right. The fight itself is the sim's (sim/: worked out a step at a time, thirty a second, nothing drawn);
 * this page draws it (fight/view.ts) and tells it what the players do.
 *
 * Opened from Discord or the front page (the link carries the player's token and the bot's WebSocket, after
 * the #), it is the server's room, played together as in King's Raid (protocol.ts). Getting ready (prep/):
 * everyone puts heroes of theirs into the lineup and the host starts the fight. The fight is run by the bot,
 * and this page runs the same one from the same seed with everyone's presses as the bot relays them, never
 * going past the step the bot has reached (a step or two behind it, so it never has to wait). Each player
 * has a card for each of their own heroes along the bottom of the field (its health and mana, its three
 * skills, its Auto); everyone's heroes are on the field. The bot says how it ended, and what each found.
 *
 * Opened with no link (`yarn dev`), it is a field for trying things out, with nothing kept: every hero's
 * skins have a card, the hero on a card puts it on the field or takes it off, the buttons under the field
 * set the boss attacking (or Boss auto), and the raid's stage (?stage=) is picked there. ?boss= picks the boss.
 *
 * Its parts: assets/ names the files (by hero, boss and effect); engine/ loads the models, poses their
 * bones and draws the field; heroes/ and bosses/ are who stands on it, a folder each; combat/ is how a
 * blow is worked out and sim/ the fight itself; fight/ draws it and fx/ what is drawn for a hit and a skill;
 * hud/ is what is shown over the field; prep/ getting ready in a room; styles/ how the page looks.
 */

/** Which heroes were on the field last when trying things out (their names, as a list), kept by this browser. */
const FIELD_KEY = 'technomagic-field';
/** Steps the sim may catch up in one frame (after the tab was away) when trying things out. */
const CATCH_UP = 8;
/**
 * In a room: how far behind the bot this page may fall before it hurries to catch up (to LAG steps behind),
 * and, joining a fight long under way, jumps there.
 */
const LAG = 4;
const HURRY = 10;
const JUMP = 90;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open the TechnoMagic Raid again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'The raid is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  full: ['The room is full', 'As many people as can are already in this server’s room. Try again once a fight is over.'],
};

const ANSWERS: Record<AnswerCode, string> = {
  closed: 'That can’t be done right now.',
  only_host: 'Only the host can do that.',
  not_owned: 'That hero isn’t yours.',
  picked: 'That hero is in already.',
  limit: 'You have as many heroes in as you can bring.',
  full: 'The lineup is full.',
  not_ready: 'Everyone has to be ready first.',
  no_heroes: 'Everyone needs a hero in first.',
  failed: 'That didn’t work. Try again.',
};

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const party = document.getElementById('party') as HTMLElement;
const overheads = document.getElementById('overheads') as HTMLElement;
const numbersAt = document.getElementById('numbers') as HTMLElement;
const meterAt = document.getElementById('meter') as HTMLElement;
const actionsRow = document.getElementById('actions') as HTMLElement;
const bossAutoButton = document.getElementById('auto') as HTMLButtonElement;
const stagePicker = document.getElementById('stage-pick') as HTMLSelectElement;
const hint = document.getElementById('hint') as HTMLElement;
const result = document.getElementById('result') as HTMLElement;

soundButton('technomagic-muted', setMuted);

/** What pressing a card does (trying things out: the sim directly; in a room: told to the bot), and whose cards are shown. */
interface Controls {
  mine(fighter: number): boolean;
  use(fighter: number, skill: number): void;
  auto(fighter: number): void;
  allAuto(): void;
  toggle?(fighter: number): void;
}

/** The fight on the page: its sim, how it is drawn, and what is shown over it. */
interface Game {
  sim: Sim;
  view: FightView;
  /** A room's (null: trying things out). */
  lock: Lock | null;
  /** Seconds not yet stepped. */
  owed: number;
  draw(): void;
}

async function start(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const def = bossNamed(params.get('boss'));
  const bossView = BOSS_VIEWS[def.id];
  if (!bossView) throw new Error(`${def.name} has no body`);
  const stageNumber = Math.min(STAGES, Math.max(1, Math.floor(Number(params.get('stage'))) || 1));
  const stage = makeStage(canvas);
  // Whatever there is to read, at once. A skin that isn't on this computer is left out: the page goes on without it.
  const [boss, entrants, effects] = await Promise.all([bossView.load(stage.scene), loadHeroes(HEROES), loadEffects(stage.scene)]);
  const magic = makeMagic(stage.scene);
  // The skills' pictures, read before the cards are made, so a skill is never drawn without its own (one that isn't on this computer is left out).
  await Promise.all(
    HEROES.flatMap((hero) => hero.abilities).map((ability) => {
      if (!ability.image) return undefined;
      const picture = new Image();
      picture.src = ability.image;
      return picture.decode().catch(() => undefined);
    }),
  );
  // The skins' own pictures for their cards (one that can't be read is left out: it is pictured as it stands, once it does).
  const faces = new Map(await Promise.all(entrants.map(async ({ def: hero, skin }) => [skin, skin.portrait ? await cutFace(portraitPicture(hero.assets, skin.portrait), skin.portrait.crop) : null] as const)));
  // And for the meter, their faces close up (one with none is the card's picture there too).
  const heads = new Map(await Promise.all(entrants.map(async ({ def: hero, skin }) => [skin, skin.portrait ? await cutHead(portraitPicture(hero.assets, skin.portrait), skin.portrait) : null] as const)));
  const at = new Vector3();
  const pictureOf = (entrant: Entrant, view: FightView, who: number): string => {
    const face = faces.get(entrant.skin) ?? stage.portrait(entrant.hero.root, view.head(who, at), HERO_TURN - 0.45);
    faces.set(entrant.skin, face);
    return face;
  };
  const skinOf = (entrant: Entrant): number => Math.max(0, entrant.def.assets.skins.indexOf(entrant.skin));

  const bossBar = makeBossBar(document.getElementById('boss') as HTMLElement, def.name, def.stats.deals);
  const numbers = makeNumbers(numbersAt);
  let game: Game | null = null;
  /** The room's way out (in a room: set below). */
  let leave = (): void => navigate('/', { back: true });

  // Top right: the raid's time left, and the way out of it.
  const timer = makeTimer(document.getElementById('timer') as HTMLElement, () => leave());

  /** Puts a fight on the page (in place of the one there was): `entries` are its heroes' bodies, in the sim's order. */
  function play(sim: Sim, entries: readonly Entrant[], controls: Controls, lock: Lock | null): Game {
    game?.view.clear();
    party.replaceChildren();
    overheads.replaceChildren();
    meterAt.replaceChildren();
    numbersAt.replaceChildren();
    const bodies: Hero[] = entries.map((entrant) => entrant.hero);
    const view = makeFightView({ scene: stage.scene, sim, bodies, boss, bossFx: bossView!.fx, effects, magic });
    // Each hero, for its card and the meter: its own picture, or with none a picture of its head and shoulders as it stands.
    const pictures = entries.map((entrant, i) => pictureOf(entrant, view, i));
    const cards = sim.fighters.map((fighter, i) => {
      if (!controls.mine(i)) return null;
      const { def: hero } = fighter;
      const card = makeCard(fighter.name, pictures[i] as string, hero.abilities, hero.passive ? [hero.passive.shown] : [], SECTIONS, {
        toggle: () => controls.toggle?.(i),
        auto: () => controls.auto(i),
        use: (index) => controls.use(i, index),
      });
      return card;
    });
    // Along the bottom as the lineup had them (../prep/prep.ts): the nearest the boss on the right, so the furthest back first.
    const shown = sim.fighters.map((fighter, i) => ({ def: fighter.def, card: cards[i] })).sort((a, b) => nearer(a.def, b.def)).reverse();
    for (const { card } of shown) if (card) party.append(card.root);
    const bars = sim.fighters.map(() => makeOverhead(overheads));
    /** Every hero of this player's on Auto. */
    const allAuto = (): boolean => sim.fighters.every((fighter, i) => !controls.mine(i) || fighter.auto);
    const meter = makeMeter(
      meterAt,
      sim.fighters.map((fighter, i) => ({ name: fighter.name, face: heads.get((entries[i] as Entrant).skin) ?? (pictures[i] as string) })),
      () => controls.allAuto(),
    );

    return {
      sim,
      view,
      lock,
      owed: 0,
      draw() {
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
            auto: fighter.auto,
            cooldowns: fighter.cooldowns,
            reserved: fighter.reserved,
            awake: part.lit?.() ?? false,
            effects,
          });
        });
        meter.draw(allAuto(), sim.fighters.map((fighter) => ({ on: sim.field.includes(fighter), dealt: fighter.dealt, healed: fighter.healed })), sim.elapsed);
      },
    };
  }

  /** The result of a fight over: won or lost, and what each player found. */
  function showResult(title: string, text: string, drops: { who: string; name: string; stars: number }[], again: string, onAgain: () => void): void {
    (result.querySelector('.message-title') as HTMLElement).textContent = title;
    (result.querySelector('.message-text') as HTMLElement).textContent = text;
    (result.querySelector('.tm-drops') as HTMLElement).replaceChildren(
      ...drops.map((drop) => {
        const item = document.createElement('li');
        item.dataset.stars = String(drop.stars);
        item.textContent = `${drop.who ? `${drop.who}: ` : ''}${'★'.repeat(drop.stars)} ${drop.name}`;
        return item;
      }),
    );
    const button = result.querySelector('[data-again]') as HTMLButtonElement;
    button.textContent = again;
    button.onclick = () => {
      result.hidden = true;
      onAgain();
    };
    result.hidden = false;
  }

  // ---- Trying things out (no link) ----

  /** Every skin that could be read, the ones on the field last time on it again. */
  let actions: ReturnType<typeof makeActions> | null = null;
  function practise(): void {
    let kept: string[] = [];
    try {
      const list: unknown = JSON.parse(localStorage.getItem(FIELD_KEY) ?? '[]');
      if (Array.isArray(list)) kept = list.filter((name): name is string => typeof name === 'string');
    } catch {
      // No storage (a private window), or nothing that can be read in it: the first hero.
    }
    const first = kept.map((name) => entrants.findIndex((entrant) => entrant.skin.name === name)).filter((i) => i >= 0);
    const sim = makeSim({ boss: def, heroes: entrants.map((entrant) => ({ def: entrant.def, skin: skinOf(entrant) })), seed: Math.floor(Math.random() * 2 ** 32), stage: Number(stagePicker.value) || stageNumber, raid: false, first });
    const input = (what: Input): void => sim.input(what);
    game = play(sim, entrants, {
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
    hint.textContent = 'Trying things out: each hero on the field attacks by itself; use its skills from its card (or its Auto), and set the boss attacking. The hero on a card puts it on the field, or takes it off (up to 9 at once). Heroes that fall stay down.';
  }

  function practice(): void {
    actionsRow.hidden = false;
    for (let n = 1; n <= STAGES; n++) stagePicker.append(new Option(String(n), String(n), false, n === stageNumber));
    stagePicker.addEventListener('change', () => {
      game?.sim.input({ kind: 'stage', stage: Number(stagePicker.value) });
      const address = new URL(location.href);
      address.searchParams.set('stage', stagePicker.value);
      history.replaceState(null, '', address);
    });
    practise();
    setConn('Preview', 'ok');
    // Over: the result, and again.
    onOver = (sim) => showResult(sim.result === 'won' ? 'Victory' : 'Defeat', sim.result === 'won' ? 'Galgoria is beaten.' : 'Your heroes fell.', [], 'Again', practise);
  }

  // ---- A room (the link's server) ----

  function room(link: string, address: string): void {
    actionsRow.hidden = true;
    hint.textContent = 'Each player uses their own heroes’ skills from their cards (or Auto, top left); everyone’s heroes are on the field. Heroes that fall stay down: beat Galgoria before its rage wipes the party.';
    let socket: GameSocket<ClientMessage> | null = null;
    let state: RoomState | null = null;
    let lock: Lock | null = null;
    let shownOver: OverView | null = null;
    const send = (message: ClientMessage): boolean => socket?.send(message) ?? false;
    const name = (id: string): string => state?.players.find((player) => player.id === id)?.name ?? 'Someone';

    const prep = makePrep({
      pick(hero) {
        // In the first of its skins this computer has (any, should it have none).
        const entrant = entrants.find((one) => one.def.id === hero);
        send({ t: 'pick', hero, skin: entrant ? skinOf(entrant) : 0 });
      },
      unpick: (hero) => send({ t: 'unpick', hero }),
      ready: (on) => send({ t: 'ready', on }),
      stage: (n) => send({ t: 'stage', stage: n }),
      begin: () => send({ t: 'begin' }),
    });
    const chat = chatBox({ mount: prep.chat, send, you: () => state?.you ?? null });

    // The way out: the host, mid-fight, gives the fight up; anyone else just goes (their heroes fight on, on Auto).
    leave = () => {
      const me = state?.players.find((player) => player.id === state?.you);
      if (state?.phase === 'fight' && me?.host && !game?.sim.result) {
        if (confirm('Give up the raid? It counts as lost for everyone.')) send({ t: 'give-up' });
        return;
      }
      navigate('/', { back: true });
    };

    /** Bodies for a fight's heroes: one each, in its skin where this computer has it (two players' Kirze each need their own). */
    const spare = [...entrants];
    async function bodiesFor(heroes: FightStart['heroes']): Promise<Entrant[] | null> {
      const used = new Set<Entrant>();
      const bodies: Entrant[] = [];
      for (const hero of heroes) {
        const fits = (one: Entrant): boolean => one.def.id === hero.id && !used.has(one);
        let body = spare.find((one) => fits(one) && skinOf(one) === hero.skin) ?? spare.find(fits);
        if (!body) {
          const def = HEROES.find((one) => one.id === hero.id);
          if (!def) return null;
          const more = await loadHeroes([def]).catch(() => [] as Entrant[]);
          spare.push(...more);
          body = more.find((one) => skinOf(one) === hero.skin) ?? more[0];
        }
        if (!body) return null;
        used.add(body);
        bodies.push(body);
      }
      return bodies;
    }

    async function fight(start: FightStart): Promise<void> {
      const mine = new Lock(start);
      lock = mine;
      shownOver = null;
      result.hidden = true;
      const bodies = await bodiesFor(start.heroes);
      if (lock !== mine) return;
      if (!bodies) return void showMessage('The models are missing', 'A hero in this fight isn’t on this computer.');
      const sim = makeSim({ boss: def, heroes: start.heroes.map((hero, i) => ({ def: (bodies[i] as Entrant).def, skin: hero.skin, gear: hero.gear })), seed: start.seed, stage: start.stage, raid: true, solo: start.solo });
      const you = state?.you;
      game = play(sim, bodies, {
        mine: (i) => start.heroes[i]?.owner === you,
        use: (fighter, skill) => send({ t: 'press', fighter, skill }),
        auto: (fighter) => send({ t: 'auto', fighter }),
        allAuto: () => send({ t: 'auto-all' }),
      }, mine);
      // Joined a fight long under way: straight to where it is (drawing only who is on the field).
      if (mine.upTo - sim.tick > JUMP) {
        while (sim.tick < mine.upTo - LAG && !sim.result) stepRoom(sim, mine);
        const standing = sim.events.filter((event) => event.kind === 'enter');
        sim.events.length = 0;
        sim.events.push(...standing);
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
        if (theirs !== undefined && theirs !== sim.sums[at.checked] && !at.parted) {
          at.parted = true;
          console.warn(`This page's fight parted from the bot's at second ${at.checked + 1}: what it draws may not be what happens.`);
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
          if (state.version !== SIM_VERSION) {
            socket?.finish();
            showMessage('This page is out of date', 'The raid has changed since this page was opened. Reload it to play.');
            return;
          }
          if (state.phase === 'prep') {
            lock = null;
            game?.view.clear();
            game = null;
            party.replaceChildren();
            overheads.replaceChildren();
            meterAt.replaceChildren();
            result.hidden = true;
            prep.show(state);
          } else prep.hide();
          if (state.phase === 'over' && state.over && !game) showOver(state.over);
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
      if (shownOver === over) return;
      shownOver = over;
      const you = state?.you ?? '';
      const drops = Object.entries(over.drops).flatMap(([who, items]) => items.map((item) => ({ who: who === you ? 'You' : name(who), name: item.name, stars: item.stars })));
      const rewarded = over.rewarded.includes(you);
      const text =
        over.result === 'won'
          ? drops.length > 0
            ? 'Found in the swamp:'
            : rewarded
              ? 'Nothing was found this time.'
              : 'No more runs today give you gear.'
          : 'The party fell. Gear your heroes up on the Heroes page and try again.';
      showResult(over.result === 'won' ? 'Victory' : 'Defeat', rewarded || over.result !== 'won' ? text : `${text} (No more runs today give you gear.)`, drops, 'Back to the room', () => send({ t: 'back' }));
    }
    onOver = () => {
      if (state?.over) showOver(state.over);
    };
    overWaiting = () => (state?.phase === 'over' && state.over ? state.over : null);

    socket = gameSocket<ServerMessage, ClientMessage>({ server: address, hello: () => ({ t: 'hello', token: link }), receive });
    startLive({ mount: barSlot(), api: apiFromSocket(address), auth: () => `Game ${link}`, newTab: true });
  }

  /** A room's fight, a step on (set by room()); the fight is over (shows the result); in a room, the result waiting to be shown. */
  let stepLock: ((sim: Sim, lock: Lock) => void) | null = null;
  let onOver: (sim: Sim) => void = () => {};
  let overWaiting: () => OverView | null = () => null;
  let overShown: Sim | null = null;

  if (watching) {
    setConn('Not watchable', 'bad');
    showMessage('The raid isn’t watched', 'Open the TechnoMagic Raid from the games page to join the room instead.');
    return;
  }
  if (token && server) room(token, server);
  else practice();

  stage.start((now, dt) => {
    const playing = game;
    if (!playing) return;
    const { sim, view, lock } = playing;
    if (lock && stepLock) {
      // A room's: on with the bot, a few steps behind it, hurrying when it has fallen further.
      playing.owed += dt;
      let steps = Math.floor(playing.owed / TICK);
      playing.owed -= steps * TICK;
      const behind = lock.upTo - sim.tick;
      if (behind > HURRY) steps = Math.max(steps, behind - LAG);
      steps = Math.min(steps, behind);
      for (let i = 0; i < steps && !sim.result; i++) stepLock(sim, lock);
      if (sim.tick >= lock.upTo) playing.owed = Math.min(playing.owed, TICK);
    } else {
      // Trying things out: as many steps as the time drawn calls for.
      playing.owed = Math.min(playing.owed + dt, TICK * CATCH_UP);
      while (playing.owed >= TICK && !sim.result) {
        sim.step();
        playing.owed -= TICK;
      }
    }
    view.update(now, dt);
    actions?.draw(sim.bossAuto);
    playing.draw();

    // What each blow took and each heal gave, coming off whom it was.
    for (const { amount, kind, at: from } of view.numbers.splice(0)) {
      const spot = stage.project(from);
      numbers.show(spot.x, spot.y, amount, kind);
    }

    // The boss's health, and what is the matter with it.
    bossBar.draw(sim.foe.hp / sim.foe.maxHp, sim.marks());
    timer.draw(sim.left);
    // Over (in a room: once the bot has said what it gave, and this page has drawn the fight to where it ended).
    if (overShown !== sim && sim.result && (!lock || overWaiting())) {
      overShown = sim;
      onOver(sim);
    }
  });
}

/** A room's fight as the bot tells it: which, up to which step, and what was pressed at which step (and its checksums, by second); its checksums compared so far, and whether one parted from the bot's (said once). */
class Lock {
  upTo = 0;
  queue: TurnInput[] = [];
  sums = new Map<number, number>();
  checked = 0;
  parted = false;
  constructor(readonly start: FightStart) {}
}

start().catch((error: unknown) => {
  console.error(error);
  setConn('No models', 'bad');
  showMessage('The models are missing', 'This page shows models kept on your own computer. Copy them in with "node scripts/kr-assets.mjs" and open it from "yarn dev".');
});
