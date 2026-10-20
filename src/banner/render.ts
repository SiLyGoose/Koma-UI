import { coin, points } from '../shared/util';
import { art, el, kindName, rich, tierMark, utMarks, utTier, uwMarks, uwTier } from '../shared/items';
import { working } from '../shared/ui';
import { timeLeft, type Banner, type Featured } from './banners';
import { canAfford, price, type BannerContext } from './context';
import type { BannerView, GuaranteeChoice, PullRecord, Stars } from './types';

/** komaTokens, as the bot writes them (its constants/core.ts TOKEN_EMOJI). */
const TOKEN_EMOJI = '<:zeiutoken:1552921364489572362>';

const TIERS: readonly Stars[] = [4, 3, 2, 1];

const percent = (share: number): string => {
  const p = share * 100;
  return `${p >= 10 || p === 0 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)}%`;
};

/** A price: komaTokens, then zeiucoins (just the coins when it takes no tokens). */
function costLine(box: HTMLElement, cost: { tokens: number; points: number }): void {
  box.textContent = '';
  if (cost.tokens > 0) {
    const tokens = el('span', 'banner-cost-part');
    tokens.append(rich(TOKEN_EMOJI), el('span', '', `×${cost.tokens}`));
    box.append(tokens);
  }
  if (cost.points > 0 || cost.tokens === 0) {
    const coins = el('span', 'banner-cost-part');
    coins.append(coin('banner-coin', 'zeiucoins'), el('span', '', points(cost.points)));
    box.append(coins);
  }
}

/** A featured item: its picture on a card, and its name plate with its stars (and UP!); a unique weapon, its marks and tier in their place. */
function featured(box: HTMLElement, item: Featured, etc: boolean): void {
  const face = el('span', 'item banner-featured-card');
  face.dataset.stars = String(item.stars);
  if (item.uniqueWeapon) face.append(art(item.itemId, item.slot), ...uwMarks(item.uniqueWeapon));
  else if (item.uniqueTreasure) face.append(art(item.itemId, item.slot), ...utMarks(item.uniqueTreasure.hero));
  else face.append(art(item.itemId, item.slot), el('span', 'item-curl'));
  const plate = el('figcaption', 'banner-plate');
  plate.dataset.stars = String(item.stars);
  const name = el('span', 'banner-plate-name', item.name);
  if (etc) name.append(el('small', '', ' etc.'));
  plate.append(el('span', 'banner-up', 'UP!'), name, item.uniqueWeapon ? uwTier() : item.uniqueTreasure ? utTier() : tierMark(item.stars));
  box.replaceChildren(face, plate);
}

/** The tabs along the top: one for each banner (its name, and its first featured item's picture fading in from the right), the one showing picked. */
function renderTabs(ctx: BannerContext): void {
  const { ui } = ctx;
  ui.tabs.textContent = '';
  for (const banner of ctx.banners) {
    const tab = el('button', 'banner-tab');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(banner === ctx.banner));
    tab.setAttribute('aria-label', `${banner.name.join(' ')} (${banner.kind})`);
    tab.dataset.banner = banner.id;
    const lead = banner.featured[0];
    tab.append(art(lead.itemId, lead.slot), el('span', 'banner-tab-label', banner.tab));
    ui.tabs.append(tab);
  }
}

/** What picking none means on a banner: any of their own treasures (standard), any featured item (limited), or no guarantee. */
function noneLabel(banner: Banner['id'], choices: readonly GuaranteeChoice[]): string {
  if (banner === 'limited') return 'Any of them';
  return banner === 'standard' && choices.some((choice) => choice.mine) ? 'Any of your own' : 'None';
}

/**
 * The pick's options: each item the guarantee can give (its picture, name and tier: a unique weapon's or treasure's
 * own; their own treasures said so), the one picked checked, under what picking none means (on the limited banner
 * only when there's more than one to pick from: one alone is the one it gives).
 */
function renderPick(ctx: BannerContext, choices: readonly GuaranteeChoice[], picked: string | null): void {
  const { ui } = ctx;
  ui.pickList.textContent = '';
  if (!ctx.view) return;
  const id = ctx.banner.id;
  const lone = id === 'limited' && choices.length === 1;
  for (const choice of lone ? choices : [null, ...choices]) {
    const option = el('button', 'banner-pick');
    option.type = 'button';
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(lone || (choice?.itemId ?? null) === picked));
    option.dataset.item = choice?.itemId ?? '';
    option.dataset.stars = String(choice?.stars ?? ctx.view.topStars);
    option.disabled = ctx.busy !== null;
    const face = el('span', 'banner-path-art banner-pick-art');
    if (choice) {
      face.append(art(choice.itemId, choice.slot));
      const name = el('span', 'banner-pick-name', choice.name);
      if (choice.mine) name.append(el('small', 'banner-pick-mine', 'Yours'));
      option.append(face, name, choice.uniqueWeapon ? uwTier() : choice.uniqueTreasure ? utTier() : tierMark(choice.stars));
    } else {
      face.textContent = '?';
      option.append(face, el('span', 'banner-pick-name', noneLabel(id, choices)));
    }
    ui.pickList.append(option);
  }
}

/** The banners History can show the pulls of, in its order: every one, open now or not. */
const HISTORY_BANNERS: readonly { id: Banner['id']; name: string }[] = [
  { id: 'standard', name: 'Standard' },
  { id: 'hero', name: 'Hero Item' },
  { id: 'limited', name: 'Limited' },
];

/** When a pull was, as Star Rail's Warp Records write it ("2026-10-19 18:23:05"), the date and the time each kept whole. */
function pulledAt(ms: number): HTMLElement {
  const at = new Date(ms);
  const two = (n: number): string => String(n).padStart(2, '0');
  const cell = el('td', 'banner-history-time');
  cell.append(
    el('span', '', `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`),
    ' ',
    el('span', '', `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`),
  );
  return cell;
}

/** A pull's row: what kind of thing it is, its tier and its name in its tier's colour (given on top for nothing, saying so), and when. */
function historyRow(pull: PullRecord): HTMLElement {
  const row = el('tr', 'banner-history-row');
  row.dataset.stars = String(pull.stars);
  const kind = pull.grant === 'ticket' ? 'Ticket' : pull.grant === 'rune' ? 'Rune' : kindName(pull);
  // (Its tier first, so every row's is in the same place, its name beside it.)
  const name = el('td', 'banner-history-name');
  const line = el('div', 'banner-history-line');
  const words = el('span', 'banner-history-words');
  words.append(el('span', 'banner-history-item', pull.name));
  if (pull.bonus) words.append(el('small', 'banner-history-tag', 'Bonus'));
  if (pull.removed) words.append(el('small', 'banner-history-tag', 'Gone'));
  line.append(tierMark(pull.stars), words);
  name.append(line);
  row.append(el('td', 'banner-history-kind', kind), name, pulledAt(pull.at));
  return row;
}

/**
 * History as `ctx.history` has it: the banners to pick from (the one shown picked), a page of pulls (always as many rows
 * as a page holds, so the box keeps its size), what to say when there are none or they couldn't be had, and the page.
 */
export function renderHistory(ctx: BannerContext): void {
  const { ui, history } = ctx;
  ui.historyBanners.replaceChildren(
    ...HISTORY_BANNERS.map(({ id, name }) => {
      const option = el('button', 'banner-history-banner', name);
      option.type = 'button';
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', String(id === history.banner));
      option.dataset.banner = id;
      return option;
    }),
  );
  const { data, loading, error } = history;
  const pulls = data?.pulls ?? [];
  const rows = pulls.map(historyRow);
  for (let i = rows.length; i < (data?.perPage ?? 6); i++) {
    const blank = el('tr', 'banner-history-row blank');
    blank.append(el('td'), el('td'), el('td'));
    rows.push(blank);
  }
  ui.historyRows.replaceChildren(...rows);
  ui.historyRows.closest('table')?.setAttribute('aria-busy', String(loading));
  const note = error ?? (!data && loading ? 'Loading…' : data && data.total === 0 ? 'No pulls on this banner yet.' : null);
  ui.historyNote.hidden = note === null;
  ui.historyNote.textContent = note ?? '';
  ui.historyNote.classList.toggle('bad', error !== null);
  const pages = data?.pages ?? 1;
  ui.historyPage.textContent = `${history.page} / ${pages}`;
  ui.historyPrev.disabled = loading || history.page <= 1;
  ui.historyNext.disabled = loading || history.page >= pages;
}

/** Draws the banner as `ctx.view` has it: the banner's card, their wallet and pity, the odds and what each button costs. */
export function render(ctx: BannerContext): void {
  const { ui, view, banner } = ctx;
  renderTabs(ctx);
  ui.banner.hidden = !view;
  if (!view) return;

  ui.tokens.replaceChildren(rich(TOKEN_EMOJI), el('span', '', points(view.tokens)));
  ui.balance.replaceChildren(coin('banner-coin', 'zeiucoins'), el('span', '', points(view.balance)));

  ui.kind.textContent = banner.kind;
  ui.name1.textContent = banner.name[0];
  ui.name2.textContent = banner.name[1];
  ui.blurb.textContent = banner.blurb;
  ui.time.textContent = timeLeft(banner);
  featured(ui.feature1, banner.featured[0], false);
  featured(ui.feature2, banner.featured[1], true);

  const top = `T${view.topStars}`;
  const limited = banner.id === 'limited';
  const hero = banner.id === 'hero';
  const featuredChance = percent(view.limited?.featuredChance ?? 0);
  const chance = percent(view.rates[view.topStars] ?? 0);
  // (The Hero Item banner's top tier: its unique weapons and its unique treasures, by its share of each.)
  const treasures = hero && (view.hero?.treasures?.length ?? 0) > 0;
  const heroTop = treasures ? 'unique weapon or unique treasure' : 'unique weapon';
  if (view.pity) {
    const { count, softStart, hardPity } = view.pity;
    ui.promise.textContent = limited
      ? `A ${top} item is guaranteed within ${points(hardPity)} pulls here, and ${featuredChance} of them are a featured one.`
      : hero
        ? `A ${heroTop} is guaranteed within ${points(hardPity)} pulls here, and every ${top} is one.`
        : `A ${top} unique treasure is guaranteed within ${points(hardPity)} pulls.`;
    const where = limited ? 'on a limited banner ' : hero ? 'on this banner ' : '';
    ui.detailsPity.textContent = `Pity: every pull ${where}since your last ${top} item ${limited ? 'from one ' : hero ? 'here ' : ''}counts. From pull ${points(softStart)} your chance of a ${top} climbs with each pull, and pull ${points(hardPity)} is guaranteed to be one. You're at ${points(count)}.`;
  } else {
    ui.promise.textContent = limited
      ? `Each pull has a ${chance} chance at a ${top} item, and ${featuredChance} of them are a featured one.`
      : hero
        ? `Every ${top} here is a ${heroTop}. Each pull has a ${chance} chance at one.`
        : `Unique treasures are ${top}. Each pull has a ${chance} chance at one.`;
    ui.detailsPity.textContent = 'Pity is off in this server: every pull has the same odds.';
  }
  // The guarantee's ring: the item it is for (the one they picked; else their own treasure, or the limited banner's first
  // featured item), 1/1 when their next top-tier item here is guaranteed to be it (their last one wasn't), 0/1 when it
  // could be anything. With none (nothing picked on the Hero Item banner, no treasure of their own on the standard
  // one), a "?" that asks for a pick. Either way the ring opens the pick.
  const choices = view.choices ?? [];
  const picked = choices.find((item) => item.itemId === view.pick) ?? null;
  const shown = picked ?? (limited ? banner.featured[0] : hero ? null : (view.own ?? null));
  const asks = !shown && choices.length > 0;
  ui.path.hidden = !shown && !asks;
  ui.guarantee.hidden = ui.path.hidden;
  if (shown || asks) {
    const on = shown && view.guaranteed ? 1 : 0;
    if (shown) ui.pathArt.replaceChildren(art(shown.itemId, shown.slot));
    else ui.pathArt.replaceChildren(el('span', 'banner-path-ask', '?'));
    ui.pathCount.replaceChildren(el('strong', '', String(on)), '/1');
    ui.pathRing.style.setProperty('--fill', String(on));
    ui.path.classList.toggle('on', on === 1);
    // (Their own treasure on the standard banner, picked or not: any of their own counts, as it always has.)
    const ownKind = !limited && !hero && (!picked || picked.mine === true);
    const one = picked ? ` ${picked.name}` : '';
    const name = shown?.name ?? '';
    const text = asks
      ? hero
        ? `Pick a unique weapon or unique treasure for the guarantee: once a ${top} here isn't it, your next one is guaranteed to be.`
        : `Pick an exclusive treasure for the guarantee: once a unique treasure isn't it, your next one is guaranteed to be.`
      : limited
        ? view.guaranteed
          ? `Your last ${top} from a limited banner wasn't a featured item, so your next one here is guaranteed to be${one} (1/1).`
          : `Your next ${top} here is a featured item ${featuredChance} of the time (0/1). If it isn't, the one after it is guaranteed to be${one}.`
        : ownKind
          ? `${name} is your own treasure. ${
              view.guaranteed
                ? "Your last unique treasure was someone else's, so your next one is guaranteed to be yours (1/1)."
                : "Your next unique treasure could be anyone's (0/1). If it isn't yours, the one after it is guaranteed to be."
            }`
          : view.guaranteed
            ? `Your last ${top} here wasn't ${name}, so your next one is guaranteed to be it (1/1).`
            : `Your next ${top} here could be anything (0/1). If it isn't ${name}, the one after it is guaranteed to be.`;
    ui.path.title = text;
    ui.path.setAttribute('aria-label', shown ? `Guaranteed item: ${shown.name}, ${on}/1` : 'Pick a guaranteed item');
    ui.guarantee.textContent = text;
    ui.pickText.textContent = !asks && choices.length > 1 ? `${text} Pick the one the guarantee gives you.` : text;
  }
  renderPick(ctx, choices, picked?.itemId ?? null);

  ui.rates.textContent = '';
  for (const tier of TIERS) {
    // (The Hero Item banner's top tier: a row for its unique weapons and one for its unique treasures.)
    if (treasures && tier === view.topStars) {
      const share = view.hero?.weaponShare ?? 1;
      for (const [tierMark, part] of [
        [uwTier(), share],
        [utTier(), 1 - share],
      ] as const) {
        const row = el('li', 'banner-rate');
        row.dataset.stars = String(tier);
        row.append(tierMark, el('strong', '', percent((view.rates[tier] ?? 0) * part)));
        ui.rates.append(row);
      }
      continue;
    }
    const row = el('li', 'banner-rate');
    row.dataset.stars = String(tier);
    row.append(tierMark(tier), el('strong', '', percent(view.rates[tier] ?? 0)));
    ui.rates.append(row);
  }

  ui.tenLabel.textContent = `Pull ×${view.multi}`;
  costLine(ui.oneCost, price(view, 1));
  costLine(ui.tenCost, price(view, view.multi));
  for (const [button, cost, pulls, action] of [
    [ui.one, ui.oneCost, 1, 'one'],
    [ui.ten, ui.tenCost, view.multi, 'ten'],
  ] as const) {
    const ok = canAfford(view, pulls);
    button.disabled = !ok;
    working(button, ctx.busy, action);
    button.title = ok ? '' : "You can't afford that.";
    // As Genshin's: the price in red when it's more than they have.
    cost.classList.toggle('short', !ok);
  }
}
