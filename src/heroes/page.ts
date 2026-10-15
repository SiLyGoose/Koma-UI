import markup from './heroes.html?raw';
import { itemDetailsClosed } from '../shared/items';
import { HERO_CLASSES, HERO_SLOT_KIND, type HeroCopy, type HeroSlot, type HeroesView } from '../shared/heroes';
import { API, busyWith, dropdown, fillServers } from '../shared/ui';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, setServer } from '../site/session';
import { createContext, heroShown, mine, status, type HeroesContext, type HeroMember } from './context';
import { render, type HeroActions } from './render';

/*
 * The heroes page (/heroes/): the TechnoMagic Raid's heroes (the bot's /api/heroes), laid out as the gear
 * page. Down the left every hero, theirs first (one that isn't theirs is greyed, with the way to the shop's
 * Heroes tab, ../hero-shop/). The one picked stands on the stage with its five slots: two weapons on the
 * left, two armors on the right and its treasure under it. Beside it, the gear a hero can wear (the raid's,
 * and the TechnoMagic Raid's): picking a copy shows what it does on the hero and equips it (into the slot
 * last pressed, or the first free one of its kind; off any other hero it was on), and pressing a slot shows
 * what fits in it. The Stats tab has the hero's stats in the raid, with and without its gear; the Skills tab
 * its skills, in King's Raid's own words (./skills.ts); the Transcend tab its transcendence perks, which are
 * picked there (./transcend.ts: the TP they cost, out of what its level gives), and the Stats tab transcends it (T0 to
 * T5, for its class's hero essences and komaGems). A copy can be
 * on the member and on one of their heroes at once, but on one hero only. Logged-in members only, in the
 * server picked; ?hero= picks the hero shown. On the left over the hero, whose heroes are shown: theirs, or
 * those of someone else in the server who has heroes, to look at (nothing on them can be changed then).
 */

export const heroesPage: Page = { path: '/heroes', title: 'Heroes · Komaverse', icon: '🐲', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const act = actions(ctx);
  const unwire = wire(ctx, act);
  return { drawn: start(ctx, act), unmount: unwire };
}

async function start(ctx: HeroesContext, act: HeroActions): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await loadMe();
  if (!res.ok) return failed(ctx, act, res, 'Could not load your servers.');
  if (!currentServer()) return status(ctx, 'None of your servers have Koma in them yet.');
  const me = currentMe();
  if (me) fillServers(ctx.ui.server, me.servers, currentServer());
  await Promise.all([loadMembers(ctx), load(ctx, act)]);
}

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
function failed(ctx: HeroesContext, act: HeroActions, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  // No answer to a change: it may have gone through, so load what's there.
  if (res.status === 0) return void load(ctx, act);
  status(
    ctx,
    res.error === 'not_member'
      ? "You don't seem to be in that server any more. Log out and in again to refresh it."
      : res.error === 'not_owned'
        ? "That item isn't yours any more."
        : res.error === 'not_found'
          ? "That hero isn't yours yet."
          : res.error === 'wrong_hero'
            ? 'That unique weapon is another hero’s: only they can wield it.'
            : res.error === 'one_unique'
              ? 'A hero wields one unique weapon: replace the one they have.'
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
            : res.status === 404
              ? 'Heroes aren’t on the bot yet.'
              : what,
    true,
  );
}

/** Loads (and draws) the heroes of whoever is shown. */
async function load(ctx: HeroesContext, act: HeroActions): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const loads = ++ctx.loads;
  const whose = ctx.viewing;
  const user = whose ? `&user=${encodeURIComponent(whose.userId)}` : '';
  const res = await api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}${user}`);
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
  const server = currentServer();
  if (!server) return;
  const res = await api<{ members: HeroMember[] }>(`/api/heroes/members?guild=${encodeURIComponent(server)}`);
  if (server !== currentServer()) return;
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

/** Sends a change to the bot (one at a time), and draws their heroes as it answers. */
async function change(ctx: HeroesContext, act: HeroActions, key: string, path: string, body: Record<string, unknown>, what: string): Promise<boolean> {
  const server = currentServer();
  // Only their own heroes are theirs to change.
  if (ctx.busy || !server || !mine(ctx)) return false;
  ctx.busy = busyWith(key);
  status(ctx, null);
  render(ctx, act);
  const res = await api<HeroesView>(path, { method: 'POST', body: JSON.stringify({ guild: server, ...body }) });
  ctx.busy = null;
  if (!res.ok) {
    render(ctx, act);
    failed(ctx, act, res, what);
    return false;
  }
  show(ctx, act, res.data);
  return true;
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
  };
  return act;
}

/** Hooks up everything that can be pressed. Returns what undoes it (the listeners outside the page's root). */
function wire(ctx: HeroesContext, act: HeroActions): () => void {
  const { ui } = ctx;
  const serverPicker = dropdown(ui.server);
  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    ctx.picked = null;
    ctx.target = null;
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
  ui.search.addEventListener('input', () => {
    ctx.query = ui.search.value.trim().toLowerCase();
    render(ctx, act);
  });
  ui.search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || ui.search.value === '') return;
    event.preventDefault();
    event.stopPropagation();
    ui.search.value = '';
    ctx.query = '';
    render(ctx, act);
  });

  for (const tab of ui.views) {
    tab.addEventListener('click', () => {
      ctx.tab = tab.dataset.view as HeroesContext['tab'];
      if (ctx.tab !== 'gear') ctx.picked = null;
      render(ctx, act);
    });
  }

  // A slot shows what fits in it, with what's in it picked, and is where the next of its kind goes; again: back to everything.
  for (const button of ui.slots) {
    button.addEventListener('click', () => {
      const slot = button.dataset.slot as HeroSlot;
      const kind = HERO_SLOT_KIND[slot];
      ctx.tab = 'gear';
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

  // Escape closes the picked copy.
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !ctx.picked) return;
    itemDetailsClosed();
    ctx.picked = null;
    render(ctx, act);
  };
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    serverPicker.destroy();
    memberPicker.destroy();
    ui.filter.destroy();
  };
}
