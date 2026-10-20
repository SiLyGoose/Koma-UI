import { GEM_EMOJI } from '../forge/anvil/gem';
import { ESSENCE_NAME, essencePicture, type EssenceId } from '../heroes/transcend';
import { art, el, hoverSound, rich, tierMark, tmMarks } from '../shared/items';
import { API } from '../shared/ui';
import { coin, points } from '../shared/util';
import { go } from '../site/nav';
import { currentMe, currentServer } from '../site/session';
import { DRAGON_LIST, raidCard, TM_LIST } from '../shared/raids';
import { raidRewards } from '../shared/raid-rewards/raid-rewards';
import { DRAGONS, isDragon, TM_BOSSES } from '../technomagic/sim/bosses';
import { scaleAt, stagesOf, type BossDef } from '../technomagic/sim/bosses/boss';
import { RAID_TIME } from '../technomagic/sim/rules';
import { bossById, raidBossById, type DatabankContext } from './context';
import { RECOMMENDED } from './recommended';
import { className, FACE, heroCut } from '../shared/heroes';
import { HEROES } from '../technomagic/sim/heroes';
import type { DatabankBoss, DatabankItem, DatabankRewards, RaidLevel } from './types';

/*
 * The enemies: a card for each down the side, and the one picked beside them on parchment. A Weekly Boss as `raid stats`
 * tells it: its picture, the difficulty level to see it at (what that does to its HP and damage, what a win at it drops,
 * and how far the server has unlocked them), its moves, its phases and what beating it gives; logged in, this week's boss
 * in the server picked is marked. The TechnoMagic Raid's bosses and the Dragon Raid's dragons as the raid has them (its
 * sim's): King's Raid's portrait, what it does, the stage to see it at (its HP, with others and alone, its DEF and level),
 * its attacks and what a win gives.
 */

/** A multiplier, like "1.5×". */
const times = (multiplier: number): string => `${Math.round(multiplier * 100) / 100}×`;

/** A share (0 to 1) as a percentage, like "30%". */
const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** What a win at a level drops for each raider, like "1× T4 + 2× T3". */
const dropsText = (level: RaidLevel): string => level.drops.map((drop) => `${drop.count}× T${drop.stars}`).join(' + ') || 'Nothing';

/** komaTokens, as the bot writes them (its constants/core.ts TOKEN_EMOJI). */
const TOKEN_EMOJI = '<:zeiutoken:1552921364489572362>';

/** What a win pays each raider, a row each: the amount, its picture, and what it is (any it pays none of left out). */
function rewardList(paid: DatabankRewards): HTMLElement {
  const list = el('ul', 'detail-effects db-rewards');
  const row = (amount: number, picture: Node, name: string): void => {
    if (amount > 0) list.appendChild(el('li')).append(el('strong', '', points(amount)), ' ', picture, ` ${name}`);
  };
  row(paid.points, coin('emoji', 'zeiucoins'), 'zeiucoins');
  row(paid.tokens, rich(TOKEN_EMOJI), 'komaTokens');
  row(paid.gems, rich(GEM_EMOJI), 'komaGems');
  for (const [id, amount] of Object.entries(paid.essences) as [EssenceId, number][]) {
    const picture = el('img', 'emoji');
    picture.src = essencePicture(id);
    picture.alt = '';
    row(amount, picture, `${ESSENCE_NAME[id]} essence`);
  }
  return list;
}

/** The boss's HP against a party of `raiders` at a level (the bot's lib/events/raid.ts bossHpFor). */
function hpFor(boss: DatabankBoss, raiders: number, level: RaidLevel): number {
  const counted = Math.max(raiders, boss.hp.minRaiders);
  return Math.max(1, Math.round(boss.hp.perRaider * (counted - boss.hp.overhead) * level.hp + gearHp(boss, level) * counted));
}

/** The HP the boss has on top for every raider at a level: its share of the boss's gear HP (none at level 1, all of it from the levels that need raid gear). */
const gearHp = (boss: DatabankBoss, level: RaidLevel): number => Math.round((boss.hp.gear ?? 0) * (level.wall ?? (level.gear ? 1 : 0)));

/** The server picked, by name (logged in). */
const serverName = (): string => currentMe()?.servers.find((server) => server.id === currentServer())?.name ?? 'your server';

const picture = (boss: DatabankBoss, className: string): HTMLImageElement => {
  const img = el('img', className);
  img.src = `${API ?? ''}${boss.picture}`;
  img.alt = '';
  img.draggable = false;
  return img;
};

/** A heading over one part of a sheet (the boss's, and a class's: ./classes.ts). */
export const label = (text: string): HTMLElement => el('p', 'db-label', text);

/** A number with what it is over it. */
function stat(name: string, value: string): HTMLElement {
  const box = el('div', 'db-stat');
  box.append(el('small', '', name), el('b', '', value));
  return box;
}

/** Lines of the bot's markdown, a row each. A blank line ends the rows: what follows is a note under them. */
export function lines(list: readonly string[]): HTMLElement[] {
  const gap = list.indexOf('');
  const rows = el('ul', 'detail-effects');
  for (const line of gap === -1 ? list : list.slice(0, gap)) rows.appendChild(el('li')).append(rich(line));
  const notes = (gap === -1 ? [] : list.slice(gap + 1)).filter((line) => line.trim() !== '');
  return [
    rows,
    ...notes.map((line) => {
      const note = el('p', 'db-boss-note');
      note.append(rich(line));
      return note;
    }),
  ];
}

export function renderBosses(ctx: DatabankContext): void {
  renderBossList(ctx);
  renderBoss(ctx);
}

/** A raid boss's portrait (King's Raid's: public/kr/bosses/<id>/portrait.webp). */
const portrait = (boss: BossDef, className: string): HTMLImageElement => {
  const img = el('img', className);
  img.src = `${import.meta.env.BASE_URL}kr/bosses/${boss.id}/portrait.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
};

/** Which raid an enemy is of, as its card's tag says it. */
const raidOf = (id: string): string => (isDragon(id) ? 'Dragon Raid' : raidBossById(id) ? 'TechnoMagic Raid' : 'Weekly Boss');

/** A card for each enemy (the Weekly Bosses, then the TechnoMagic Raid's bosses, then the Dragon Raid's dragons); picking one shows it. */
function renderBossList(ctx: DatabankContext): void {
  const { ui, databank, week } = ctx;
  const bosses = databank?.bosses ?? [];
  const card = (id: string, face: HTMLImageElement, name: string): HTMLButtonElement => {
    const button = el('button', 'db-boss-card');
    button.type = 'button';
    button.classList.toggle('picked', id === ctx.boss);
    button.setAttribute('aria-pressed', String(id === ctx.boss));
    button.append(face, el('span', 'db-boss-card-name', name), el('span', 'db-boss-card-kind', raidOf(id)));
    if (week?.boss === id) button.append(el('span', 'db-boss-card-week', 'This week'));
    button.addEventListener('click', () => {
      ctx.boss = id;
      renderBosses(ctx);
      // On narrow screens the enemy is under the cards: there, once picked.
      if (ui.bossInfo.getBoundingClientRect().top > window.innerHeight * 0.6) ui.bossInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return button;
  };
  ui.bossList.replaceChildren(
    ...bosses.map((boss) => card(boss.id, picture(boss, ''), `${boss.emoji} ${boss.name}`)),
    ...[...TM_BOSSES, ...DRAGONS].map((boss) => card(boss.id, portrait(boss, 'db-boss-portrait'), boss.name)),
  );
  // The one picked stays in sight where the cards scroll (sideways, on narrow screens), without moving the page.
  const picked = ui.bossList.querySelector('.picked');
  if (picked) {
    const box = ui.bossList.getBoundingClientRect();
    const at = picked.getBoundingClientRect();
    if (at.left < box.left || at.right > box.right) ui.bossList.scrollLeft += at.left - box.left - 4;
    if (at.top < box.top || at.bottom > box.bottom) ui.bossList.scrollTop += at.top - box.top - 4;
  }
  const thisWeek = bossById(ctx, week?.boss ?? null);
  const enemies = bosses.length + TM_BOSSES.length + DRAGONS.length;
  ui.bossCount.textContent = `${enemies} ${enemies === 1 ? 'enemy' : 'enemies'}${thisWeek ? ` · this week's boss in ${serverName()}: ${thisWeek.name}` : ''}`;
}

/** An item's card, as the items' list has them: it opens the item there (a raid item a boss drops, a class's item). */
export function itemCard(item: DatabankItem): HTMLButtonElement {
  const card = el('button', 'item db-item');
  card.type = 'button';
  card.dataset.stars = String(item.stars);
  card.setAttribute('aria-label', `${item.name}, ${item.stars} stars: see it in the items`);
  // (TechnoMagic gear has no stars, but its marks.)
  if (item.source === 'technomagic') card.append(art(item.id, item.slot, true), el('span', 'db-name', item.name), ...tmMarks(item.class));
  else card.append(tierMark(item.stars), art(item.id, item.slot, true), el('span', 'db-name', item.name), el('span', 'item-curl'));
  hoverSound(card, item.id);
  card.addEventListener('click', () => go(`/databank/items/#${encodeURIComponent(item.id)}`));
  return card;
}

/**
 * A hero recommended against a raid's boss, as King's Raid's own Raid Info has them (its small hero portrait, HeroPortraitSmall):
 * its icon in the gold square frame, its class's tag and the kind of damage it deals over its top left, a thumbs-up over its top
 * right for one King's Raid picked, and its name under it. It opens the hero in the databank's heroes. None for a hero the raid doesn't have.
 */
function recommendedCard(id: string, kr: boolean): HTMLElement[] {
  const hero = HEROES.find((one) => one.id === id);
  if (!hero) return [];
  const card = el('button', 'db-recommended-card');
  card.type = 'button';
  card.title = `${hero.name}${kr ? ': King’s Raid’s own pick' : ''}`;
  const square = el('span', 'db-recommended-square');
  const face = el('span', 'db-recommended-face', hero.name.slice(0, 1));
  void heroCut(hero.id, FACE, 120).then((src) => {
    if (!src) return;
    const img = el('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    face.replaceChildren(img);
  });
  const mark = (className: string, src: string, alt: string): HTMLImageElement => {
    const img = el('img', className);
    img.src = src;
    img.alt = alt;
    img.draggable = false;
    return img;
  };
  square.append(
    face,
    el('span', 'db-recommended-frame'),
    mark('db-recommended-class', `/kr/ui/class-${hero.class}.webp`, className(hero.class)),
    mark('db-recommended-deals', `/kr/ui/deals-${hero.stats.deals}.webp`, hero.stats.deals === 'magical' ? 'Magical' : 'Physical'),
  );
  if (kr) square.append(mark('db-recommended-kr', '/kr/ui/thumbs-up.webp', 'King’s Raid’s pick'));
  card.append(square, el('span', 'db-recommended-name', hero.name));
  card.addEventListener('click', () => go(`/databank/heroes/#${encodeURIComponent(hero.id)}`));
  return [card];
}

/** A raid's boss picked (the TechnoMagic Raid's, or a dragon), at the stage picked: as the raid has it. */
function renderRaidBoss(ctx: DatabankContext, boss: BossDef): void {
  const { ui } = ctx;
  ui.bossBody.textContent = '';
  ui.bossInfo.hidden = false;
  ui.bossInfo.setAttribute('aria-label', boss.name);
  const card = raidCard(boss.id);
  const dragon = isDragon(boss.id);
  const stages = stagesOf(boss);
  const stage = Math.min(stages, Math.max(1, ctx.bossStage));

  const head = el('div', 'db-boss-head');
  const title = el('div', 'detail-title');
  // (Its raid's name, and its own title in it when it has one: a dragon's, "Fire Dragon".)
  const raid = raidOf(boss.id);
  title.append(el('h3', '', boss.name), el('p', 'detail-meta db-kind', card && card.title !== raid ? `${card.title} · ${raid}` : raid));
  if (card) title.append(el('p', 'db-boss-week', `Fought in ${card.lair}.`));
  head.append(portrait(boss, 'db-boss-picture db-boss-portrait'), title);
  ui.bossBody.append(head);
  if (card) ui.bossBody.append(el('p', 'db-boss-text', card.about));

  // The stage picker, and what that stage makes of it: its health with others and alone, its defense and its level.
  const levels = el('div', 'db-levels');
  levels.setAttribute('aria-label', 'Stage');
  for (let s = 1; s <= stages; s++) {
    const button = el('button', 'action choice db-level', `Stage ${s}`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(s === stage));
    button.addEventListener('click', () => {
      ctx.bossStage = s;
      renderRaidBoss(ctx, boss);
    });
    levels.append(button);
  }
  const room = scaleAt(boss, stage, false);
  const solo = scaleAt(boss, stage, true);
  const health = el('div', 'db-stats');
  health.append(stat('HP, with others', points(Math.round(boss.stats.hp * room.hp))), stat('HP, single player', points(Math.round(boss.stats.hp * solo.hp))), stat('Level', String(room.level)));
  const defense = el('div', 'db-stats');
  defense.append(
    stat('P. DEF', points(Math.round(boss.stats.physical * (room.defense ?? 1)))),
    stat('M. DEF', points(Math.round(boss.stats.magical * (room.defense ?? 1)))),
    stat('Deals', boss.stats.deals === 'magical' ? 'Magical' : 'Physical'),
  );
  const time = boss.time ?? RAID_TIME;
  ui.bossBody.append(
    label('Stage'),
    levels,
    health,
    defense,
    el('p', 'detail-note', `Beat it within ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}, before its rage wipes the party. Heroes that fall stay down. Each stage opens once the one before it is beaten.`),
  );

  // Its attacks, a row each.
  const attacks = el('ul', 'detail-effects');
  for (const attack of boss.attacks) attacks.appendChild(el('li')).append(attack.label);
  ui.bossBody.append(label('Attacks'), attacks);

  // The heroes recommended against it (./recommended.ts): King's Raid's own picks first, then those the raid's sim found best.
  const recommended = RECOMMENDED[boss.id];
  if (recommended && recommended.heroes.length > 0) {
    const grid = el('div', 'db-recommended');
    grid.append(...recommended.heroes.flatMap((id) => recommendedCard(id, recommended.kr.includes(id))));
    const note = recommended.kr.length > 0 ? 'Thumbs up: King’s Raid’s own picks for its Hard Dragon Raid. The rest fared best against it in the raid’s simulated fights.' : 'The heroes that fared best against it in the raid’s simulated fights.';
    ui.bossBody.append(label('Recommended heroes'), grid, el('p', 'detail-note', note));
  }

  // What a win gives (as the raid's own Raid Info has it).
  if (card && card.rewards.length > 0) ui.bossBody.append(raidRewards(card.rewards, (dragon ? DRAGON_LIST : TM_LIST).rewardNote));
}

/** The enemy picked: a Weekly Boss at the difficulty level picked, or a raid's boss (renderRaidBoss). */
function renderBoss(ctx: DatabankContext): void {
  const { ui, databank, week } = ctx;
  const raidBoss = raidBossById(ctx.boss);
  if (raidBoss) return renderRaidBoss(ctx, raidBoss);
  const boss = bossById(ctx, ctx.boss);
  const raid = databank?.raid;
  ui.bossBody.textContent = '';
  ui.bossInfo.hidden = !boss;
  if (!boss || !databank || !raid) return;
  ui.bossInfo.setAttribute('aria-label', boss.name);
  const level = raid.levels.find((l) => l.level === ctx.bossLevel) ?? raid.levels[0];

  const head = el('div', 'db-boss-head');
  const title = el('div', 'detail-title');
  title.append(el('h3', '', boss.name), el('p', 'detail-meta db-kind', 'Raid Boss'));
  if (week?.boss === boss.id) {
    const until = new Date(week.resetsAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    title.append(el('p', 'db-boss-week', `This week's boss in ${serverName()}, until ${until}.`));
  }
  head.append(picture(boss, 'db-boss-picture'), title);
  ui.bossBody.append(head);

  if (level) {
    // The level picker: every level there is, the ones the server hasn't unlocked marked.
    const unlocked = week?.maxDifficulty ?? null;
    const top = raid.levels.length;
    const levels = el('div', 'db-levels');
    levels.setAttribute('aria-label', 'Difficulty level');
    for (const l of raid.levels) {
      const button = el('button', 'action choice db-level', `Lv ${l.level}`);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(l.level === level.level));
      if (unlocked !== null && l.level > unlocked) {
        button.classList.add('locked');
        button.title = 'Not unlocked in your server yet';
      }
      button.addEventListener('click', () => {
        ctx.bossLevel = l.level;
        renderBoss(ctx);
      });
      levels.append(button);
    }
    const numbers = el('div', 'db-stats');
    const wall = gearHp(boss, level);
    numbers.append(stat('Boss HP', wall > 0 ? `${times(level.hp)} +${points(wall)} a raider` : times(level.hp)), stat('Boss damage', times(level.damage)), stat('Drops, each raider', dropsText(level)));
    // Its HP grows with the party: a few sizes, from the smallest it counts.
    const sizes = [...new Set([boss.hp.minRaiders, 6, 8, 10])].filter((n) => n >= boss.hp.minRaiders);
    const hp = el('div', 'db-stats');
    hp.append(...sizes.map((n) => stat(`${n} raiders`, `${points(hpFor(boss, n, level))} HP`)));
    const unlock =
      unlocked === null
        ? 'A server can pick up to one level past the hardest it has beaten.'
        : unlocked >= top
          ? `${serverName()} has unlocked every level.`
          : `${serverName()} has unlocked up to Lv ${unlocked}. Beat Lv ${unlocked} to unlock Lv ${unlocked + 1}.`;
    ui.bossBody.append(
      label('Difficulty'),
      levels,
      numbers,
      label(`Boss HP by party at Lv ${level.level}`),
      hp,
      el('p', 'detail-note', `Its HP grows with every raider (a party of fewer than ${boss.hp.minRaiders} fights it as ${boss.hp.minRaiders}). It gets away, and the raid is lost, if it is still standing after ${raid.maxRounds} rounds.`),
      el('p', 'detail-note', unlock),
    );
  }

  ui.bossBody.append(label('Moves'));
  if (level && level.level > 1) ui.bossBody.append(el('p', 'db-boss-note', `Their damage at Lv 1, before its phases: Lv ${level.level} multiplies it by ${times(level.damage)}.`));
  ui.bossBody.append(...lines(boss.moves), label('Phases'), ...lines(boss.phases));

  // What a win at the level picked pays, a row each (an older bot's is a line saying level 1's).
  if (typeof boss.rewards === 'string') {
    const rewards = el('p', 'db-boss-text');
    rewards.append(rich(boss.rewards));
    ui.bossBody.append(label('Rewards'), rewards);
  } else {
    const paid = boss.rewards[level ? raid.levels.indexOf(level) : 0] ?? boss.rewards[0];
    if (paid) ui.bossBody.append(label(level ? `Rewards at Lv ${level.level}` : 'Rewards'), el('p', 'db-boss-text', 'Upon slaying, everyone who fought gets:'), rewardList(paid));
  }
  // What a win can drop besides: raid items, of the tiers this level drops.
  const chance = databank.raidDropChance ?? 0;
  const perRaider = databank.raidDropChancePerRaider ?? 0;
  if (level && level.drops.length > 0 && (chance > 0 || perRaider > 0)) {
    const drops = el('p', 'db-boss-text');
    drops.append(rich(`The party also has a **${percent(chance)}** chance (+${percent(perRaider)} for each raider) that everyone finds **${dropsText(level)}** raid items at Lv ${level.level}, which can't be pulled from the gacha:`));
    const tiers = new Set(level.drops.map((drop) => drop.stars));
    const grid = el('div', 'db-drops');
    grid.append(...databank.items.filter((item) => item.source === 'raid' && tiers.has(item.stars)).map(itemCard));
    ui.bossBody.append(drops, grid);
  }
}
