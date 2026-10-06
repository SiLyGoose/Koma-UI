import { coin } from '../shared/coin';
import { points } from '../shared/format';
import { art, el, rich, stars } from '../shared/items/items';
import { BANNERS, timeLeft, type Featured } from './banners';
import { canAfford, price, type BannerContext } from './context';
import type { Stars } from './types';

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

/** A featured item: its picture on a card, and its name plate with its stars (and UP!). */
function featured(box: HTMLElement, item: Featured, etc: boolean): void {
  const face = el('span', 'item banner-featured-card');
  face.dataset.stars = String(item.stars);
  face.append(art(item.itemId, item.slot), el('span', 'item-curl'));
  const plate = el('figcaption', 'banner-plate');
  plate.dataset.stars = String(item.stars);
  const name = el('span', 'banner-plate-name', item.name);
  if (etc) name.append(el('small', '', ' etc.'));
  plate.append(el('span', 'banner-up', 'UP!'), name, stars(item.stars));
  box.replaceChildren(face, plate);
}

/** The tabs along the top: one for each banner (its name, and its first featured item's picture fading in from the right), the one showing picked. */
function renderTabs(ctx: BannerContext): void {
  const { ui } = ctx;
  ui.tabs.textContent = '';
  for (const banner of BANNERS) {
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

  const top = `${view.topStars}★`;
  if (view.pity) {
    const { count, softStart, hardPity } = view.pity;
    ui.promise.textContent = `A ${top} unique treasure is guaranteed within ${points(hardPity)} pulls.`;
    ui.detailsPity.textContent = `Pity: every pull since your last ${top} item counts. From pull ${points(softStart)} your chance of a ${top} climbs with each pull, and pull ${points(hardPity)} is guaranteed to be one. You're at ${points(count)}.`;
  } else {
    ui.promise.textContent = `Unique treasures are ${top}. Each pull has a ${percent(view.rates[view.topStars] ?? 0)} chance at one.`;
    ui.detailsPity.textContent = 'Pity is off in this server: every pull has the same odds.';
  }
  // Their own treasure: 1/1 when their next unique treasure is guaranteed to be it (their last was
  // someone else's), 0/1 when it could be anyone's.
  const own = view.own ?? null;
  ui.path.hidden = !own;
  ui.guarantee.hidden = !own;
  if (own) {
    const on = view.guaranteed ? 1 : 0;
    ui.pathArt.replaceChildren(art(own.itemId, own.slot));
    ui.pathCount.replaceChildren(el('strong', '', String(on)), '/1');
    ui.pathRing.style.setProperty('--fill', String(on));
    ui.path.classList.toggle('on', on === 1);
    ui.path.title = view.guaranteed ? `Your next unique treasure is guaranteed to be ${own.name}.` : `Your next unique treasure could be anyone's. If it isn't ${own.name}, the one after is.`;
    ui.guarantee.textContent = `${own.name} is your own treasure. ${
      view.guaranteed
        ? "Your last unique treasure was someone else's, so your next one is guaranteed to be yours (1/1)."
        : "Your next unique treasure could be anyone's (0/1). If it isn't yours, the one after it is guaranteed to be."
    }`;
  }

  ui.rates.textContent = '';
  for (const tier of TIERS) {
    const row = el('li', 'banner-rate');
    row.dataset.stars = String(tier);
    row.append(stars(tier), el('strong', '', percent(view.rates[tier] ?? 0)));
    ui.rates.append(row);
  }

  ui.tenLabel.textContent = `Pull ×${view.multi}`;
  costLine(ui.oneCost, price(view, 1));
  costLine(ui.tenCost, price(view, view.multi));
  for (const [button, cost, pulls] of [
    [ui.one, ui.oneCost, 1],
    [ui.ten, ui.tenCost, view.multi],
  ] as const) {
    const ok = canAfford(view, pulls);
    button.disabled = ctx.busy || !ok;
    button.title = ok ? '' : "You can't afford that.";
    // As Genshin's: the price in red when it's more than they have.
    cost.classList.toggle('short', !ok);
  }
}
