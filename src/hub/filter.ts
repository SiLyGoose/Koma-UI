import { lessMotion } from '../shared/transition/wipe';

/*
 * The front page's quick filters over its games (hub.html's data-filter buttons: All, Raid, Casino, Events, Other, each
 * game's data-kind). Picking one doesn't just swap the games: those going fade out, those staying glide to where they
 * are now, and those coming fade in one after another. Without motion (prefers-reduced-motion), and on the page's first
 * drawing, they're swapped at once. A filter picked while the last is still moving stops it, starting from the games
 * as they were shown before it.
 */

/** The games going fading out, the games staying gliding over, and each game coming fading in, after the one before. */
const OUT_MS = 140;
const MOVE_MS = 260;
const IN_MS = 220;
const STAGGER_MS = 35;
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

/** Counts the filters picked, so one still moving stops when another is picked after it. */
let picked = 0;

const finished = (animations: Animation[]): Promise<unknown> => Promise.all(animations.map((a) => a.finished.catch(() => undefined)));

/** Stops whatever the games (and the note) were doing, leaving them as they are drawn without it. */
function stop(elements: Iterable<HTMLElement>): void {
  for (const el of elements) for (const a of el.getAnimations()) a.cancel();
}

/**
 * Shows only the games in `root` of `kind` (their data-kind), or all of them (`all`), the filter's button in `filters`
 * pressed, and `none` (a note) when there are none. `animate`: moving there, as above. A kind no button has is `all`.
 */
export async function filterGames(root: HTMLElement, filters: readonly HTMLButtonElement[], none: HTMLElement, kind: string, animate = true): Promise<void> {
  const mine = ++picked;
  if (!filters.some((button) => button.dataset.filter === kind)) kind = 'all';
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === kind));

  const games = [...root.querySelectorAll<HTMLElement>('.game[data-kind]')];
  const wanted = (game: HTMLElement): boolean => kind === 'all' || game.dataset.kind === kind;
  stop([...games, none]);
  const apply = (): void => {
    for (const game of games) game.hidden = !wanted(game);
    none.hidden = games.some((game) => !game.hidden);
  };
  if (!animate || lessMotion()) return apply();

  const going = games.filter((game) => !game.hidden && !wanted(game));
  const staying = games.filter((game) => !game.hidden && wanted(game));
  const coming = games.filter((game) => game.hidden && wanted(game));

  // Out: the games going fade, staying where they are (and so do the rest) until they've gone.
  const wasNone = !none.hidden;
  const out = [...going, ...(wasNone && coming.length > 0 ? [none] : [])].map((el) =>
    el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: OUT_MS, easing: 'ease-in', fill: 'forwards' }),
  );
  await finished(out);
  if (mine !== picked) return;

  // Where the games staying are, then where they're going to be: they glide from one to the other.
  const before = new Map(staying.map((game) => [game, game.getBoundingClientRect()]));
  apply();
  stop([...going, none]);
  for (const game of staying) {
    const was = before.get(game) as DOMRect;
    const now = game.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (dx === 0 && dy === 0) continue;
    game.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: MOVE_MS, easing: EASE });
  }

  // In: the games coming, one after another in the page's order (or the note that there are none).
  const entering = none.hidden ? coming : [none];
  entering.forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(10px) scale(0.98)' }, { opacity: 1, transform: 'none' }], {
      duration: IN_MS,
      delay: (staying.length > 0 ? MOVE_MS / 3 : 0) + i * STAGGER_MS,
      easing: EASE,
      fill: 'backwards',
    });
  });
}
