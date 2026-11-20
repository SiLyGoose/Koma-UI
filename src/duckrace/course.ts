import { DUCK_IDS, DUCKS, type Duck, type DuckRaceRoundView } from '../protocol/duckrace';
import { duckSvg } from './duck';

/*
 * The course: a lane of water for each duck, from the start on the left to the chequered finish on
 * the right. A race is run as the bot made it up (DuckRaceRoundView.splits: when each duck passes
 * each mark), so every page at the table sees the same one; each duck moves evenly between its marks,
 * bobbing as it goes, and gets its place as it crosses the line.
 */

const ui = {
  course: document.getElementById('course') as HTMLElement,
  recent: document.getElementById('recent') as HTMLElement,
};

/** How long the last duck takes to finish. */
export const RACE_MS = 9000;

const PLACES = ['1st', '2nd', '3rd', '4th'];

interface Lane {
  lane: HTMLElement;
  duck: HTMLElement;
  place: HTMLElement;
}

const lanes = new Map<Duck, Lane>();

export function buildCourse(): void {
  for (const duck of DUCK_IDS) {
    const lane = document.createElement('div');
    lane.className = 'dr-lane';
    lane.dataset.duck = duck;
    lane.style.setProperty('--duck', DUCKS[duck].color);
    const name = document.createElement('span');
    name.className = 'dr-lane-name';
    name.textContent = DUCKS[duck].name;
    const water = document.createElement('div');
    water.className = 'dr-water';
    const runner = document.createElement('span');
    runner.className = 'dr-duck';
    runner.append(duckSvg(duck));
    const place = document.createElement('span');
    place.className = 'dr-place';
    runner.append(place);
    water.append(runner);
    lane.append(name, water);
    ui.course.append(lane);
    lanes.set(duck, { lane, duck: runner, place });
  }
  const finish = document.createElement('span');
  finish.className = 'dr-finish';
  finish.setAttribute('aria-hidden', 'true');
  ui.course.append(finish);
}

/** How far down the course a duck is (0 the start, 1 the finish) `at` (a share of the race's time), from its splits. */
function along(splits: readonly number[], at: number): number {
  let before = 0;
  for (let i = 0; i < splits.length; i++) {
    const t = splits[i]!;
    if (at < t) return (i + (at - before) / (t - before)) / splits.length;
    before = t;
  }
  return 1;
}

function moveTo(duck: Duck, x: number): void {
  lanes.get(duck)?.duck.style.setProperty('--x', String(x));
}

/** Every duck back at the start, no places, no winner. */
export function resetCourse(): void {
  ui.course.classList.remove('racing');
  for (const [duck, lane] of lanes) {
    moveTo(duck, 0);
    lane.place.textContent = '';
    lane.lane.classList.remove('finished', 'winner');
  }
}

function finish(round: DuckRaceRoundView, duck: Duck): void {
  const lane = lanes.get(duck);
  if (!lane) return;
  lane.place.textContent = PLACES[round.order.indexOf(duck)] ?? '';
  lane.lane.classList.add('finished');
}

/** The race as it ended: every duck over the line with its place. */
export function showFinished(round: DuckRaceRoundView): void {
  ui.course.classList.remove('racing');
  for (const duck of DUCK_IDS) {
    moveTo(duck, 1);
    finish(round, duck);
  }
}

/** Lights the winner's lane. */
export function showWinner(round: DuckRaceRoundView): void {
  lanes.get(round.winner)?.lane.classList.add('winner');
}

/**
 * Runs `round` down the course over RACE_MS (stopping when `current` turns false). Resolves when the
 * last duck is home, on time even in a tab in the background (where frames aren't drawn).
 */
export function runRace(round: DuckRaceRoundView, current: () => boolean): Promise<void> {
  resetCourse();
  ui.course.classList.add('racing');
  const start = performance.now();
  const home = new Set<Duck>();
  return new Promise((resolve) => {
    const frame = (): void => {
      if (!current()) return resolve();
      const at = Math.min(1, (performance.now() - start) / RACE_MS);
      for (const duck of DUCK_IDS) {
        const splits = round.splits[duck] ?? [1];
        moveTo(duck, along(splits, at));
        if (!home.has(duck) && at >= splits.at(-1)!) {
          home.add(duck);
          finish(round, duck);
        }
      }
      if (at < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => {
      if (current()) showFinished(round);
      resolve();
    }, RACE_MS + 150);
  });
}

/** The last winners, newest first. */
export function showRecent(winners: readonly Duck[]): void {
  ui.recent.textContent = '';
  for (const duck of winners) {
    const badge = document.createElement('span');
    badge.className = 'dr-recent-duck';
    badge.title = DUCKS[duck].name;
    badge.append(duckSvg(duck, 'dr-recent-svg'));
    ui.recent.append(badge);
  }
}
