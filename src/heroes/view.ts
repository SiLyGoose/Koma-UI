import { askSale, itemDetailsClosed, saleOf, saleSaid, wireSaleDialog, wireSearch } from '../shared/items';
import { HERO_CLASSES, HERO_SLOT_KIND, type HeroCopy, type HeroSlot, type HeroesView } from '../shared/heroes';
import type { HeroesSold } from '../protocol/heroes';
import { busyWith, dropdown, fillServers } from '../shared/ui';
import { createContext, heroShown, mine, status, type HeroesContext, type HeroesHost, type HeroMember } from './context';
import { render, type HeroActions } from './render';

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
  ctx.picked = null;
  if (on) ctx.tab = 'gear';
  render(ctx, act);
}

/** Sells what's picked, and says what it came to. */
async function sell(ctx: HeroesContext, act: HeroActions): Promise<void> {
  const copies = saleOf(ctx.view?.copies ?? [], ctx.selling).ids;
  if (copies.length === 0) return;
  const view = await change<HeroesSold>(ctx, act, 'sell', '/api/heroes/sell', { copies }, 'Could not sell those. Try again.');
  // It paid zeiucoins (or whatever the refusal was, the balance may be old): the header's balance follows.
  void ctx.host.loadMe(true);
  if (!view) return;
  ctx.selling = null;
  render(ctx, act);
  saleSaid(ctx.ui.status, view.sold);
}

function actions(ctx: HeroesContext): HeroActions {
  const act: HeroActions = {
    pickHero(id) {
      if (id === ctx.hero) return;
      ctx.hero = id;
      // The armory shows what works on its class.
      ctx.cls = heroShown(ctx)?.class ?? 'all';
      ctx.picked = null;
      ctx.target = null;
      ctx.perk = null;
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
    ctx.picked = null;
    ctx.target = null;
    ctx.selling = null;
    void load(ctx, act);
  });

  ui.filter.setClasses(HERO_CLASSES);
  ui.filter.onChange((choice) => {
    ctx.filter = choice.slot;
    ctx.stars = choice.stars;
    ctx.cls = choice.cls ?? 'all';
    if (ctx.target && HERO_SLOT_KIND[ctx.target] !== ctx.filter) ctx.target = null;
    render(ctx, act);
  });
  wireSearch(ui.search, (query) => {
    ctx.query = query;
    render(ctx, act);
  });

  for (const tab of ui.views) {
    tab.addEventListener('click', () => {
      ctx.tab = tab.dataset.view as HeroesContext['tab'];
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
      const kind = HERO_SLOT_KIND[slot];
      ctx.tab = 'gear';
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

  ui.unequipAll.addEventListener('click', () => {
    const hero = ctx.hero;
    if (hero) void change(ctx, act, 'unequip-all', '/api/heroes/unequip', { hero }, 'Could not take everything off. Try again.');
  });

  // Sell: to start picking copies, then (with some picked) to confirm the sale; Cancel stops picking.
  ui.sell.addEventListener('click', () => {
    if (!ctx.selling) return pickToSell(ctx, act, true);
    const { count, total } = saleOf(ctx.view?.copies ?? [], ctx.selling);
    askSale(ui.sellConfirm, count, total);
  });
  ui.sellCancel.addEventListener('click', () => pickToSell(ctx, act, false));
  wireSaleDialog(ui.sellConfirm, () => void sell(ctx, act));

  // Escape closes the picked copy, else stops picking copies to sell (the sale's confirmation closes itself).
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || ui.sellConfirm.open) return;
    if (ctx.picked) {
      itemDetailsClosed();
      ctx.picked = null;
      render(ctx, act);
    } else if (ctx.selling) pickToSell(ctx, act, false);
  };
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    if (ui.sellConfirm.open) ui.sellConfirm.close();
    serverPicker.destroy();
    memberPicker.destroy();
    ui.filter.destroy();
    ui.grid.destroy();
  };
}
