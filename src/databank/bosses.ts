import { art, el, hoverSound, rich, stars } from '../shared/items';
import { API } from '../shared/ui';
import { points } from '../shared/util';
import { go } from '../site/nav';
import { currentMe, currentServer } from '../site/session';
import { bossById, type DatabankContext } from './context';
import type { DatabankBoss, DatabankItem, RaidLevel } from './types';

/*
 * The raid bosses: a card for each down the side, and the one picked beside them on parchment, as
 * `raid stats` tells it: its picture, the difficulty level to see it at (what that does to its HP and
 * damage, what a win at it drops, and how far the server has unlocked them), its moves, its phases and
 * what beating it gives. Logged in, this week's boss in the server picked is marked.
 */

/** A multiplier, like "1.5×". */
const times = (multiplier: number): string => `${Math.round(multiplier * 100) / 100}×`;

/** A share (0 to 1) as a percentage, like "30%". */
const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** What a win at a level drops for each raider, like "1× 4★ + 2× 3★". */
const dropsText = (level: RaidLevel): string => level.drops.map((drop) => `${drop.count}× ${drop.stars}★`).join(' + ') || 'Nothing';

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

/** A heading over one part of the boss's sheet. */
const label = (text: string): HTMLElement => el('p', 'db-label', text);

/** A number with what it is over it. */
function stat(name: string, value: string): HTMLElement {
  const box = el('div', 'db-stat');
  box.append(el('small', '', name), el('b', '', value));
  return box;
}

/** Lines of the bot's markdown, a row each. A blank line ends the rows: what follows is a note under them. */
function lines(list: readonly string[]): HTMLElement[] {
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

/** A card for each boss; picking one shows it. */
function renderBossList(ctx: DatabankContext): void {
  const { ui, databank, week } = ctx;
  const bosses = databank?.bosses ?? [];
  ui.bossList.replaceChildren(
    ...bosses.map((boss) => {
      const card = el('button', 'db-boss-card');
      card.type = 'button';
      card.classList.toggle('picked', boss.id === ctx.boss);
      card.setAttribute('aria-pressed', String(boss.id === ctx.boss));
      card.append(picture(boss, ''), el('span', 'db-boss-card-name', `${boss.emoji} ${boss.name}`));
      if (week?.boss === boss.id) card.append(el('span', 'db-boss-card-week', 'This week'));
      card.addEventListener('click', () => {
        ctx.boss = boss.id;
        renderBosses(ctx);
        // On narrow screens the boss is under the cards: there, once picked.
        if (ui.bossInfo.getBoundingClientRect().top > window.innerHeight * 0.6) ui.bossInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return card;
    }),
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
  ui.bossCount.textContent = `${bosses.length} raid ${bosses.length === 1 ? 'boss' : 'bosses'}${thisWeek ? ` · this week in ${serverName()}: ${thisWeek.name}` : ''}`;
}

/** A raid item's card, as the items' list has them: it opens the item there. */
function dropCard(item: DatabankItem): HTMLButtonElement {
  const card = el('button', 'item db-item');
  card.type = 'button';
  card.dataset.stars = String(item.stars);
  card.setAttribute('aria-label', `${item.name}, ${item.stars} stars: see it in the items`);
  card.append(stars(item.stars), art(item.id, item.slot), el('span', 'db-name', item.name), el('span', 'item-curl'));
  hoverSound(card, item.id);
  card.addEventListener('click', () => go(`/databank/items/#${encodeURIComponent(item.id)}`));
  return card;
}

/** The boss picked, at the difficulty level picked. */
function renderBoss(ctx: DatabankContext): void {
  const { ui, databank, week } = ctx;
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
      } else if (l.gear) button.title = 'Needs raid gear';
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
      ...(wall > 0 && level.gear ? [el('p', 'detail-note', `🛡️ Lv ${level.level} needs raid gear: the HP it gains for every raider has climbed to ${points(wall)}, and from here the boss is built for parties in raid gear.`)] : []),
      label(`Boss HP by party at Lv ${level.level}`),
      hp,
      el('p', 'detail-note', `Its HP grows with every raider (a party of fewer than ${boss.hp.minRaiders} fights it as ${boss.hp.minRaiders}). It gets away, and the raid is lost, if it is still standing after ${raid.maxRounds} rounds.`),
      el('p', 'detail-note', unlock),
    );
  }

  ui.bossBody.append(label('Moves'));
  if (level && level.level > 1) ui.bossBody.append(el('p', 'db-boss-note', `Their damage at Lv 1, before its phases: Lv ${level.level} multiplies it by ${times(level.damage)}.`));
  ui.bossBody.append(...lines(boss.moves), label('Phases'), ...lines(boss.phases));

  const rewards = el('p', 'db-boss-text');
  rewards.append(rich(boss.rewards));
  ui.bossBody.append(label('Rewards'), rewards);
  // What a win can drop besides: raid items, of the tiers this level drops.
  const chance = databank.raidDropChance ?? 0;
  const perRaider = databank.raidDropChancePerRaider ?? 0;
  if (level && level.drops.length > 0 && (chance > 0 || perRaider > 0)) {
    const drops = el('p', 'db-boss-text');
    drops.append(rich(`The party also has a **${percent(chance)}** chance (+${percent(perRaider)} for each raider) that everyone finds **${dropsText(level)}** raid items at Lv ${level.level}, which can't be pulled from the gacha:`));
    const tiers = new Set(level.drops.map((drop) => drop.stars));
    const grid = el('div', 'db-drops');
    grid.append(...databank.items.filter((item) => item.source === 'raid' && tiers.has(item.stars)).map(dropCard));
    ui.bossBody.append(drops, grid);
  }
}
