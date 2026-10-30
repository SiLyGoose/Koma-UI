import { askSale, itemDetailsClosed, itemIcons, itemPicked, pruneSale, saleOf, saleSaid, sellInTurns, TM_UNSORTED, wireSaleDialog, wireSearch } from '../shared/items';
import { HERO_CLASSES, HERO_SLOT_TYPE, noteWorn, type HeroCopy, type HeroSlot, type HeroesView } from '../shared/heroes';
import type { HeroesSold } from '../protocol/heroes';
import { RUNE_KEEP_PRICE, type RuneBroken } from '../protocol/runes';
import { fragmentCount } from '../shared/items/fragments';
import { busyWith, dropdown, fillServers } from '../shared/ui';
import { createContext, heroShown, mine, status, type HeroesContext, type HeroesHost, type HeroMember } from './context';
import { perkTip, render, renderPick, renderSearch, sellableShown, type HeroActions } from './render';
import { salvageRuleDialog } from './salvage-rule';
import { askLoadout, type LoadoutAsk } from './loadouts';
import { HERO_LOADOUTS } from '../protocol/heroes';

/** How long the search waits for typing to stop before the armory is drawn again. */
const SEARCH_MS = 120;
import { pointTips } from '../technomagic/hud/tip';
import '../technomagic/styles/tip.css';

/*
 * The heroes page (/heroes/): the TechnoMagic Raid's heroes (the bot's /api/heroes), laid out as the gear
 * page. Down the left every hero, theirs first (one that isn't theirs is greyed, with the way to the shop's
 * Heroes tab, ../hero-shop/). The one picked stands on the stage with its slots: two weapons on the
 * left, two armors on the right and its treasure under it, with its three sub treasure slots beside that (only its own
 * unique treasures go there, and only their options count). Beside it, the gear a hero can wear (the raid's,
 * and the TechnoMagic Raid's): picking a copy shows what it does on the hero and equips it (into the slot
 * last pressed, or the first free one of its kind; off any other hero it was on), locks it, and its Upgrade goes to
 * the forge with it on the anvil (as the gear page's); pressing a slot shows what fits in it. Under the armory, selling copies (pick them,
 * then confirm), as the gear page does; locking and selling are the site's only, not the raid's Manage popup's. The Stats tab has the hero's stats in the raid, with and without its gear; the Skills tab
 * its skills, in King's Raid's own words (./skills.ts); the Transcend tab its transcendence perks, which are
 * picked there (./transcend.ts: the TP they cost, out of what its level gives), and the Stats tab transcends it (T0 to
 * T5, for its class's hero essences and komaGems). A copy can be
 * on the member and on one of their heroes at once, but on one hero only. Logged-in members only, in the
 * server picked; ?hero= picks the hero shown. On the left over the hero, whose heroes are shown: theirs, or
 * those of someone else in the server who has heroes, to look at (nothing on them can be changed then).
 *
 * The page's view: the site's heroes page (./page.ts) mounts it with the site's login, and the TechnoMagic Raid's Manage
 * popup (../technomagic/manage/) with the raid's link (mountHeroes' `host`). Nothing here reads the site's login (which
 * would put the site's header on the page).
 */

/** The heroes page in `root` (its markup, ./heroes.html, already in it), asking the bot through `host`. */
export function mountHeroes(root: HTMLElement, host: HeroesHost): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root, host);
  const act = actions(ctx);
  const unwire = wire(ctx, act);
  return { drawn: start(ctx, act), unmount: unwire };
}

async function start(ctx: HeroesContext, act: HeroActions): Promise<void> {
  const { host } = ctx;
  if (!host.ready) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await host.loadMe();
  if (!res.ok) return failed(ctx, act, res, 'Could not load your servers.');
  if (!host.server()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = host.me();
  if (me) fillServers(ctx.ui.server, me.servers, host.server());
  await Promise.all([loadMembers(ctx), load(ctx, act)]);
}

/** Says why asking the bot didn't work (or, for a login that ran out, logs out); `said`: what a change says for its own errors. */
function failed(ctx: HeroesContext, act: HeroActions, res: { status: number; error: string }, what: string, said: Partial<Record<string, string>> = {}): void {
  if (res.status === 401) return ctx.host.logOut();
  // No answer to a change: it may have gone through, so load what's there.
  if (res.status === 0) return void load(ctx, act);
  status(
    ctx,
    said[res.error] ??
    (res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'not_owned'
        ? "That item isn't yours any more."
        : res.error === 'not_found'
          ? "That hero isn't yours yet."
          : res.error === 'wrong_hero'
            ? 'That is another hero’s own: only they can wear it.'
          : res.error === 'wrong_slot'
            ? 'That doesn’t go there: a unique weapon only goes in Weapon I, and only a hero’s own unique treasures go in its sub treasure slots.'
          : res.error === 'duplicate'
            ? 'This hero already wears a copy of that unique treasure: each of its four once.'
          : res.error === 'no_main_treasure'
            ? 'Only a unique treasure has sub treasures: put one of this hero’s unique treasures in its main treasure slot first.'
          : res.error === 'busy'
            ? 'Your heroes’ gear changed meanwhile. Try again.'
          : res.error === 'too_many_points'
            ? 'Not enough TP left for that perk.'
          : res.error === 'perk_locked'
            ? 'Transcend this hero further to pick that perk.'
          : res.error === 'too_poor'
            ? 'Not enough hero essences or komaGems to transcend this hero.'
          : res.error === 'maxed'
            ? 'This hero is as transcended as it gets.'
          : res.error === 'nothing_to_sell'
            ? 'None of those can be sold any more. Take another look and try again.'
            : res.status === 404
              ? 'Heroes aren’t on the bot yet.'
              : what),
    true,
  );
}

/** Loads (and draws) the heroes of whoever is shown. */
async function load(ctx: HeroesContext, act: HeroActions): Promise<void> {
  const server = ctx.host.server();
  if (!server) return;
  const loads = ++ctx.loads;
  const whose = ctx.viewing;
  const user = whose ? `&user=${encodeURIComponent(whose.userId)}` : '';
  const res = await ctx.host.api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}${user}`);
  // Someone else was picked meanwhile.
  if (loads !== ctx.loads) return;
  if (!res.ok) {
    // They left the server: off the list, and back to their own heroes.
    if (whose && res.status === 404) {
      ctx.members = ctx.members.filter((m) => m.userId !== whose.userId);
      ctx.viewing = null;
      fillMembers(ctx);
      await load(ctx, act);
      return status(ctx, `${whose.name} isn't in this server any more.`, true);
    }
    return failed(ctx, act, res, whose ? `Could not load ${whose.name}'s heroes.` : 'Could not load your heroes.');
  }
  show(ctx, act, res.data);
  status(ctx, null);
}

/** Who else in the server has heroes, for the picker on the left. One that can't be loaded leaves just their own. */
async function loadMembers(ctx: HeroesContext): Promise<void> {
  const server = ctx.host.server();
  if (!server) return;
  const res = await ctx.host.api<{ members: HeroMember[] }>(`/api/heroes/members?guild=${encodeURIComponent(server)}`);
  if (server !== ctx.host.server()) return;
  ctx.members = res.ok ? res.data.members : [];
  fillMembers(ctx);
}

/** The picker of whose heroes are shown: theirs first, then everyone else's with how many heroes they have. Hidden with nobody else to pick. */
function fillMembers(ctx: HeroesContext): void {
  const { member } = ctx.ui;
  member.textContent = '';
  const others = ctx.members.filter((m) => !m.you);
  member.hidden = others.length === 0;
  const add = (value: string, label: string, selected: boolean): void => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    member.append(option);
  };
  add('', 'Your heroes', ctx.viewing === null);
  for (const m of others) add(m.userId, `${m.name} (${m.heroes} hero${m.heroes === 1 ? '' : 'es'})`, ctx.viewing?.userId === m.userId);
}

/** Takes the bot's word on their heroes, keeping the hero shown (the address's, else their first, else the first). */
function show(ctx: HeroesContext, act: HeroActions, view: HeroesView): void {
  ctx.view = view;
  // (Their faces in the outfits they wear.)
  noteWorn(view);
  // (King's Raid's hero gear's pictures: its icons, as the bot says them.)
  for (const copy of view.copies) if (copy.icon) itemIcons.set(copy.itemId, copy.icon);
  const asked = new URLSearchParams(location.search).get('hero');
  const has = (id: string | null): boolean => view.heroes.some((hero) => hero.id === id);
  if (!has(ctx.hero)) {
    ctx.hero = has(asked) ? asked : (view.heroes.find((hero) => hero.owned) ?? view.heroes[0])?.id ?? null;
    // The armory shows what works on its class.
    ctx.cls = heroShown(ctx)?.class ?? 'all';
  }
  if (ctx.picked && !view.copies.some((copy) => copy.id === ctx.picked)) ctx.picked = null;
  render(ctx, act);
}

/** Sends a change to the bot (one at a time), and draws their heroes as it answers (null: it didn't go through). */
async function change<T extends HeroesView = HeroesView>(ctx: HeroesContext, act: HeroActions, key: string, path: string, body: Record<string, unknown>, what: string, said?: Partial<Record<string, string>>): Promise<T | null> {
  const server = ctx.host.server();
  // Only their own heroes are theirs to change.
  if (ctx.busy || !server || !mine(ctx)) return null;
  ctx.busy = busyWith(key);
  status(ctx, null);
  render(ctx, act);
  const res = await ctx.host.api<T>(path, { method: 'POST', body: JSON.stringify({ guild: server, ...body }) });
  ctx.busy = null;
  if (!res.ok) {
    render(ctx, act);
    failed(ctx, act, res, what, said);
    return null;
  }
  show(ctx, act, res.data);
  return res.data;
}

/** Starts or stops picking copies to sell. */
function pickToSell(ctx: HeroesContext, act: HeroActions, on: boolean): void {
  ctx.selling = on ? new Set() : null;
  ctx.sellLocked = false;
  ctx.picked = null;
  ctx.runes = false;
  if (on) ctx.tab = 'gear';
  render(ctx, act);
}

/** Sells what's picked (`salvage`: salvages it for komaDust), and says what it came to. */
async function sell(ctx: HeroesContext, act: HeroActions, salvage = false): Promise<void> {
  const { ids: copies, locked } = saleOf(ctx.view?.copies ?? [], ctx.selling, ctx.sellLocked);
  if (copies.length === 0) return;
  // (Locked ones only sell when it says so; a big sale in turns, the bot's at most SALE_TURN each.)
  const { sold, stopped } = await sellInTurns(copies, async (turn) => {
    const body = { copies: turn, ...(locked > 0 && { locked: true }), ...(salvage && { salvage }) };
    return (await change<HeroesSold>(ctx, act, salvage ? 'salvage' : 'sell', '/api/heroes/sell', body, `Could not ${salvage ? 'salvage' : 'sell'} those. Try again.`))?.sold ?? null;
  });
  // It paid zeiucoins or komaDust (or whatever the refusal was, the balance may be old): the header's balance follows.
  void ctx.host.loadMe(true);
  if (!sold) return;
  ctx.selling = null;
  ctx.sellLocked = false;
  render(ctx, act);
  saleSaid(ctx.ui.status, sold, stopped);
}

/** What the bot's refusals of a gear loadout change mean (protocol/heroes.ts HeroLoadoutError). */
const LOADOUT_SAID: Partial<Record<string, string>> = {
  locked: 'Buy that loadout first.',
  nothing_worn: 'This hero wears none of the gear a loadout keeps (Armor, Mantle, Accessory, Orb, Artifact).',
  empty: 'That loadout is empty.',
  wrong_class: 'Nothing in that loadout works on this hero.',
  too_long: `A loadout’s name is ${HERO_LOADOUTS.maxNameLength} characters at most.`,
  bad_name: 'A loadout’s name can only have letters, numbers, spaces and a little punctuation.',
  maxed: 'You have every loadout already.',
  too_poor: 'Not enough zeiucoins for another loadout.',
  busy: 'Your heroes’ gear changed meanwhile. Try again.',
};

function actions(ctx: HeroesContext): HeroActions {
  const act: HeroActions = {
    pickHero(id) {
      if (id === ctx.hero) return;
      // (The Loadouts panel keeps the loadout picked, as King's Raid's: to put it on this hero.)
      ctx.hero = id;
      // The armory shows what works on its class.
      ctx.cls = heroShown(ctx)?.class ?? 'all';
      ctx.picked = null;
      ctx.runes = false;
      ctx.target = null;
      ctx.perk = null;
      ctx.perkPage = null;
      const address = new URL(location.href);
      address.searchParams.set('hero', id);
      history.replaceState(history.state, '', address);
      render(ctx, act);
    },
    equip(copy: HeroCopy, slot: HeroSlot) {
      const hero = ctx.hero;
      if (!hero) return;
      void change(ctx, act, `equip:${copy.id}`, '/api/heroes/equip', { hero, slot, copy: copy.id }, 'Could not equip that. Try again.').then((done) => {
        if (done) ctx.target = null;
      });
    },
    unequip(slot: HeroSlot) {
      const hero = ctx.hero;
      if (hero) void change(ctx, act, `unequip:${slot}`, '/api/heroes/unequip', { hero, slot }, 'Could not take that off. Try again.');
    },
    perks(perks: string[], key: string) {
      const hero = ctx.hero;
      if (hero) void change(ctx, act, key, '/api/heroes/perks', { hero, perks }, 'Could not change the perks. Try again.');
    },
    transcend() {
      const hero = ctx.hero;
      if (hero) void change(ctx, act, 'transcend', '/api/heroes/transcend', { hero }, 'Could not transcend this hero. Try again.');
    },
    scroll() {
      const hero = ctx.hero;
      if (hero)
        void change(ctx, act, 'scroll', '/api/heroes/scroll', { hero }, 'Could not use a Transcendence Attribute Point. Try again.', {
          no_scroll: 'You have no Transcendence Attribute Points left: craft them from Boss Crystals in the Inventory’s Craft tab.',
          scrolls_maxed: 'This hero has all the TP these give.',
        });
    },
    perkPage(page: number) {
      const hero = ctx.hero;
      if (hero)
        void change(ctx, act, `perk-page:${page}`, '/api/heroes/perk-page', { hero, page }, 'Could not switch perk pages. Try again.', {
          locked: 'Activate that perk page first.',
          busy: 'This hero’s perk pages changed meanwhile. Try again.',
        });
    },
    buyPerkPage(page: number) {
      const hero = ctx.hero;
      if (!hero) return;
      void change(ctx, act, `perk-page:${page}`, '/api/heroes/perk-page/buy', { hero, page }, 'Could not activate that perk page. Try again.', {
        too_poor: 'Not enough zeiucoins for that perk page.',
        owned: 'This hero has that perk page already.',
        maxed: 'This hero has every perk page.',
        locked: 'Activate the perk pages before it first.',
        busy: 'This hero’s perk pages changed meanwhile. Try again.',
      }).then(() => void ctx.host.loadMe(true));
    },
    rune(copy: HeroCopy, socket: number, rune: string | null) {
      // (Taking one out, or swapping one in over it, keeps it for RUNE_KEEP_PRICE zeiucoins: the header's balance follows.)
      const paid = rune === null || copy.runes[socket] != null;
      void change(ctx, act, `rune:${copy.id}:${socket}`, '/api/heroes/rune', { copy: copy.id, socket, rune }, rune ? 'Could not put that rune in. Try again.' : 'Could not take that rune out. Try again.', {
        no_rune: rune ? 'You have none of that rune left.' : 'That socket is empty.',
        wrong_part: 'That rune doesn’t go in this piece.',
        too_poor: `Keeping a rune you take out costs ${RUNE_KEEP_PRICE} zeiucoins. Disassemble it instead for Rune Fragments.`,
      }).then(() => {
        if (paid) void ctx.host.loadMe(true);
      });
    },
    breakRune(copy: HeroCopy, socket: number) {
      const rune = copy.runes[socket];
      void change<RuneBroken>(ctx, act, `break:${copy.id}:${socket}`, '/api/runes/break', { copy: copy.id, socket }, 'Could not disassemble that rune. Try again.', { no_rune: 'That socket is empty.' }).then((done) => {
        if (done) status(ctx, `Disassembled ${rune?.name ?? 'the rune'} into ${fragmentCount(done.fragments)}.`);
      });
    },
    loadoutEquip(number: number) {
      const hero = ctx.hero;
      if (hero) void change(ctx, act, 'loadout-equip', '/api/heroes/loadout/equip', { hero, loadout: number }, 'Could not put that loadout on. Try again.', LOADOUT_SAID);
    },
    loadoutSave(number: number) {
      const hero = ctx.hero;
      if (hero) void change(ctx, act, 'loadout-save', '/api/heroes/loadout/save', { hero, loadout: number }, 'Could not save that loadout. Try again.', LOADOUT_SAID);
    },
    loadoutReset(number: number) {
      void change(ctx, act, 'loadout-reset', '/api/heroes/loadout/reset', { loadout: number }, 'Could not reset that loadout. Try again.', LOADOUT_SAID);
    },
    loadoutName(number: number, name: string) {
      void change(ctx, act, 'loadout-name', '/api/heroes/loadout/name', { loadout: number, name }, 'Could not rename that loadout. Try again.', LOADOUT_SAID);
    },
    loadoutBuy() {
      void change(ctx, act, 'loadout-buy', '/api/heroes/loadout/buy', {}, 'Could not buy another loadout. Try again.', LOADOUT_SAID).then((done) => {
        // (The one bought, picked; and the header's zeiucoins follow.)
        if (done?.loadouts) {
          ctx.loadout = done.loadouts.slots.length;
          render(ctx, act);
        }
        void ctx.host.loadMe(true);
      });
    },
    redraw() {
      render(ctx, act);
    },
    lock(copy: HeroCopy, locked: boolean) {
      void change(ctx, act, `lock:${copy.id}`, '/api/heroes/lock', { copy: copy.id, locked }, locked ? 'Could not lock that. Try again.' : 'Could not unlock that. Try again.', {
        not_found: "That item isn't yours any more.",
      });
    },
  };
  return act;
}

/** Hooks up everything that can be pressed. Returns what undoes it (the listeners outside the page's root). */
function wire(ctx: HeroesContext, act: HeroActions): () => void {
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    ctx.host.setServer(ui.server.value);
    ctx.picked = null;
    ctx.runes = false;
    ctx.target = null;
    ctx.selling = null;
    // Back to their own heroes, in the new server.
    ctx.viewing = null;
    ctx.members = [];
    fillMembers(ctx);
    void loadMembers(ctx);
    void load(ctx, act);
  });

  const memberPicker = dropdown(ui.member);
  ui.member.addEventListener('change', () => {
    ctx.viewing = ctx.members.find((m) => !m.you && m.userId === ui.member.value) ?? null;
    ctx.perkPage = null;
    ctx.picked = null;
    ctx.runes = false;
    ctx.target = null;
    ctx.selling = null;
    void load(ctx, act);
  });

  ui.filter.setClasses(HERO_CLASSES);
  ui.filter.onChange((choice) => {
    ctx.filter = choice.slot;
    ctx.stars = choice.stars;
    ctx.cls = choice.cls ?? 'all';
    ctx.sort = choice.sort ?? TM_UNSORTED;
    if (ctx.target && HERO_SLOT_TYPE[ctx.target] !== ctx.filter) ctx.target = null;
    render(ctx, act);
  });
  // The armory alone, once typing stops for a moment (not the whole page for every key).
  let typing: ReturnType<typeof setTimeout> | undefined;
  wireSearch(ui.search, (query) => {
    ctx.query = query;
    clearTimeout(typing);
    typing = setTimeout(() => renderSearch(ctx, act), SEARCH_MS);
  });

  // Loadouts (over the Weapon): its panel in place of the tab shown, picked on the loadout the hero wears; again, back to that tab.
  ui.loadoutsButton.addEventListener('click', () => {
    if (ctx.tab === 'loadouts') ctx.tab = ctx.tabBefore;
    else {
      ctx.tabBefore = ctx.tab;
      ctx.tab = 'loadouts';
      ctx.loadout = null;
      ctx.picked = null;
      ctx.runes = false;
      ctx.selling = null;
    }
    render(ctx, act);
  });
  // A loadout's name, sent as it's left (or Enter pressed) when it changed; Escape puts it back.
  ui.loadoutName.addEventListener('change', () => {
    const loadout = ctx.view?.loadouts?.slots.find((one) => one.number === ctx.loadout);
    if (loadout && ui.loadoutName.value.trim() !== (loadout.name ?? '')) act.loadoutName(loadout.number, ui.loadoutName.value);
  });
  ui.loadoutName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') ui.loadoutName.blur();
    if (event.key === 'Escape') {
      event.stopPropagation();
      ui.loadoutName.value = ctx.view?.loadouts?.slots.find((one) => one.number === ctx.loadout)?.name ?? '';
      ui.loadoutName.blur();
    }
  });
  ui.loadoutEquip.addEventListener('click', () => {
    if (ctx.loadout !== null && !ctx.busy) act.loadoutEquip(ctx.loadout);
  });
  ui.loadoutSave.addEventListener('click', () => {
    if (ctx.loadout !== null && !ctx.busy) askLoadout(ctx, 'save', ctx.loadout);
  });
  ui.loadoutReset.addEventListener('click', () => {
    if (ctx.loadout !== null && !ctx.busy) askLoadout(ctx, 'reset', ctx.loadout);
  });
  // Save, Reset or buying one, once asked (Cancel, or a click on the backdrop, closes it).
  ui.loadoutConfirm.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-loadout]');
    if (!button && event.target !== ui.loadoutConfirm) return;
    ui.loadoutConfirm.close();
    if (button?.dataset.loadout !== 'confirm') return;
    const number = Number(ui.loadoutConfirm.dataset.loadout);
    const ask = ui.loadoutConfirm.dataset.ask as LoadoutAsk;
    if (ask === 'save') act.loadoutSave(number);
    else if (ask === 'reset') act.loadoutReset(number);
    else act.loadoutBuy();
  });

  for (const tab of ui.views) {
    tab.addEventListener('click', () => {
      ctx.tab = tab.dataset.view as HeroesContext['tab'];
      ctx.runes = false;
      if (ctx.tab !== 'gear') {
        ctx.picked = null;
        ctx.selling = null;
      }
      render(ctx, act);
    });
  }

  // A slot shows what fits in it, with what's in it picked, and is where the next of its kind goes; again: back to everything.
  for (const button of ui.slots) {
    button.addEventListener('click', () => {
      const slot = button.dataset.slot as HeroSlot;
      const kind = HERO_SLOT_TYPE[slot];
      // A slot with something in it is an item (data-sfx="own"): its sound, once what's in it is picked (or not).
      if (button.dataset.sfx === 'own') {
        const before = ctx.picked;
        setTimeout(() => itemPicked(before, ctx.picked), 0);
      }
      ctx.tab = 'gear';
      ctx.runes = false;
      // While picking copies to sell, a slot only shows what fits in it.
      if (ctx.selling) {
        const again = ctx.target === slot && ctx.filter === kind;
        ctx.target = again ? null : slot;
        ctx.filter = again ? 'all' : kind;
        return render(ctx, act);
      }
      if (ctx.target === slot && ctx.filter === kind) {
        ctx.target = null;
        ctx.filter = 'all';
        ctx.picked = null;
      } else {
        ctx.target = slot;
        ctx.filter = kind;
        ctx.picked = heroShown(ctx)?.equipped[slot] ?? null;
      }
      render(ctx, act);
    });
  }

  ui.resetPerks.addEventListener('click', () => act.perks([], 'reset-perks'));
  // A perk pointed at: the raid's popup over it, saying what it does.
  pointTips(ui.perkRows, '.perk', (cell) => perkTip(ctx, cell));

  ui.unequipAll.addEventListener('click', () => {
    const hero = ctx.hero;
    if (hero) void change(ctx, act, 'unequip-all', '/api/heroes/unequip', { hero }, 'Could not take everything off. Try again.');
  });

  // Sell: to start picking copies, then (with some picked) to confirm the sale; Cancel stops picking.
  ui.sell.addEventListener('click', () => {
    if (!ctx.selling) return pickToSell(ctx, act, true);
    const { count, total, locked } = saleOf(ctx.view?.copies ?? [], ctx.selling, ctx.sellLocked);
    askSale(ui.sellConfirm, count, total, locked);
  });
  // Salvage: what's picked (hero gear, all of it) for komaDust, once confirmed.
  ui.salvage.addEventListener('click', () => {
    const { count, dust, stones, crystals, locked } = saleOf(ctx.view?.copies ?? [], ctx.selling, ctx.sellLocked);
    askSale(ui.sellConfirm, count, dust, locked, true, { stones, crystals });
  });
  ui.sellCancel.addEventListener('click', () => pickToSell(ctx, act, false));
  // Select shown: every copy the filter and search show that can be sold, picked (all of them picked already: unpicked).
  ui.sellShown.addEventListener('click', () => {
    const { selling } = ctx;
    if (!selling) return;
    const shown = sellableShown(ctx);
    if (shown.every((copy) => selling.has(copy.id))) {
      for (const copy of shown) selling.delete(copy.id);
      if (ctx.picked && !selling.has(ctx.picked)) ctx.picked = [...selling].at(-1) ?? null;
    } else for (const copy of shown) selling.add(copy.id);
    renderPick(ctx, act);
  });
  // Include locked: locked ones can be picked too (off: those picked are let go).
  ui.sellLocked.addEventListener('change', () => {
    ctx.sellLocked = ui.sellLocked.checked;
    if (ctx.selling && ctx.view) pruneSale(ctx.view.copies, ctx.selling, ctx.sellLocked);
    if (ctx.picked && ctx.selling && !ctx.selling.has(ctx.picked)) ctx.picked = [...ctx.selling].at(-1) ?? null;
    renderPick(ctx, act);
  });
  wireSaleDialog(ui.sellConfirm, (salvage) => void sell(ctx, act, salvage));
  // Using a Transcendence Attribute Point, asked by its + (Cancel, or a click on the backdrop, closes it).
  ui.tpConfirm.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tp]');
    if (!button && event.target !== ui.tpConfirm) return;
    ui.tpConfirm.close();
    if (button?.dataset.tp === 'confirm') act.scroll();
  });
  // Buying a perk page, asked by its + (Cancel, or a click on the backdrop, closes it).
  ui.perkPageConfirm.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-page]');
    if (!button && event.target !== ui.perkPageConfirm) return;
    ui.perkPageConfirm.close();
    if (button?.dataset.page === 'confirm') act.buyPerkPage(Number(ui.perkPageConfirm.dataset.page));
  });
  // By rule: the hero gear a salvage rule takes, picked (with those picked already); or the rule kept for their drops.
  const rules = salvageRuleDialog(ui.salvageRule, ctx, {
    pick(ids) {
      const { selling } = ctx;
      if (!selling) return;
      for (const id of ids) selling.add(id);
      ctx.picked = ids.at(-1) ?? ctx.picked;
      renderPick(ctx, act);
    },
    save(rule) {
      void change(ctx, act, 'auto-salvage', '/api/heroes/auto-salvage', { rule }, 'Could not save that rule. Try again.').then((done) => {
        if (done) status(ctx, rule ? 'Drops your rule takes are salvaged as they drop, from now on.' : 'Drops are all kept again.');
      });
    },
  });
  ui.sellRule.addEventListener('click', () => rules.open());

  // Escape closes the picked copy, else stops picking copies to sell (the sale's confirmation closes itself).
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || ui.sellConfirm.open || ui.salvageRule.open || ui.tpConfirm.open || ui.perkPageConfirm.open || ui.loadoutConfirm.open) return;
    if (ctx.picked) {
      itemDetailsClosed();
      ctx.picked = null;
      ctx.runes = false;
      renderPick(ctx, act);
    } else if (ctx.selling) pickToSell(ctx, act, false);
  };
  document.addEventListener('keydown', onKey);
  return () => {
    clearTimeout(typing);
    document.removeEventListener('keydown', onKey);
    if (ui.sellConfirm.open) ui.sellConfirm.close();
    if (ui.tpConfirm.open) ui.tpConfirm.close();
    if (ui.perkPageConfirm.open) ui.perkPageConfirm.close();
    if (ui.loadoutConfirm.open) ui.loadoutConfirm.close();
    if (ui.salvageRule.open) ui.salvageRule.close();
    serverPicker.destroy();
    memberPicker.destroy();
    ui.filter.destroy();
    ui.grid.destroy();
    void ctx.showcase?.then((showcase) => showcase?.destroy());
  };
}
