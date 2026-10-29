import '../../shared/ui/level/level.css';
import './background.css';
import type { ApiResult } from '../../site/session';
import type { TmBatchesView, TmBatchStart, TmBatchView } from '../../protocol/tm-batches';
import { el } from '../hud/dom';

/*
 * Background raids on the raid's page (the bot's /api/tm-batches: its services/tm-batches.ts): a batch of up to 200 runs
 * against the room's boss, at its stage and mode, with this player's lineup, fought by the bot on Auto while they're away,
 * each as long as it would take played, each paid as it ends, and a mail with every result once it's over. Started from a
 * room of their own (prep's Background Battle: askBatch, in the Raid Settings' box, a −/+ for how many, what it costs);
 * while it runs they can't fight in a room, and the page shows it instead (showBatch): where it fights, how many runs are
 * over of how many, won and lost, what it has cost, when the run being fought ends, and Stop (asked first: the run being
 * fought is given up), and Games, to the games hub (they go on meanwhile). Over, why, and the way back to the raid or the hub.
 */

/** The page's way to the bot's background raids, with the raid's link. */
export interface BatchApi {
  view(): Promise<ApiResult<TmBatchesView>>;
  start(ask: TmBatchStart): Promise<ApiResult<TmBatchesView>>;
  stop(): Promise<ApiResult<TmBatchesView>>;
}

export function batchApi(base: string, token: () => string): BatchApi {
  const ask = async <T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> => {
    try {
      const res = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Game ${token()}`, ...init.headers } });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return res.ok ? { ok: true, data: body as T } : { ok: false, status: res.status, error: body.error ?? 'failed' };
    } catch {
      return { ok: false, status: 0, error: 'offline' };
    }
  };
  return {
    view: () => ask<TmBatchesView>('/api/tm-batches'),
    start: (start) => ask<TmBatchesView>('/api/tm-batches/start', { method: 'POST', body: JSON.stringify(start) }),
    stop: () => ask<TmBatchesView>('/api/tm-batches/stop', { method: 'POST', body: '{}' }),
  };
}

/** What a start the bot turned down says. */
const REFUSED: Record<string, string> = {
  running: 'Your background raids are being fought already.',
  fighting: 'Finish the battle you’re in first.',
  too_poor: 'You can’t afford the first raid.',
  locked: 'Win the stage before it first.',
  not_owned: 'A hero in the lineup isn’t yours.',
  heroes: 'Put a hero in the Main Team first.',
  team_full: 'A team has too many heroes in it.',
  bad_count: 'Pick how many raids to fight.',
  offline: 'The bot can’t be reached. Try again.',
};

const points = (n: number): string => n.toLocaleString('en-US');

/** An arrow for the −/+ (the Raid Settings' own). */
function arrow(d: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

/** A popup in the Raid Settings' box, in `into`: its box, and a way to close it (✕, the dark round it, Escape). */
function popup(into: HTMLElement, title: string, onClose: () => void, closable = true): { root: HTMLElement; box: HTMLElement; close: () => void } {
  const root = el('div', 'level-pop tm-batch-pop');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const box = el('div', 'level-box tm-batch-box');
  const head = el('div', 'level-head', title);
  box.append(head);
  root.append(box);
  into.append(root);
  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && closable) close();
  };
  const close = (): void => {
    document.removeEventListener('keydown', keys);
    root.remove();
    onClose();
  };
  if (closable) {
    const closer = el('button', 'level-close', '✕');
    closer.type = 'button';
    closer.setAttribute('aria-label', 'Close');
    closer.addEventListener('click', close);
    box.append(closer);
    root.addEventListener('click', (event) => {
      if (event.target === root) close();
    });
  }
  document.addEventListener('keydown', keys);
  return { root, box, close };
}

/**
 * Asks how many background raids to fight against `where` (as prep's room has it), what they cost (`view`: the price and
 * their points), and starts them with `start` (its answer: why not, shown in the box, or null: started).
 */
export function askBatch(into: HTMLElement, where: string, view: TmBatchesView, start: (count: number) => Promise<string | null>): void {
  let count = Math.max(1, Math.min(view.most, Math.floor(view.balance / Math.max(1, view.price)) || 1));
  const { box, close } = popup(into, 'Background Battle', () => {});
  const about = el('p', 'tm-batch-about', `Fight ${where} on Auto while you’re away. Each raid takes as long as it would played, pays as it ends, and costs ${points(view.price)} zeiucoins as it begins. Your results come by mail.`);
  const pick = el('div', 'level-pick');
  const down = el('button', 'level-step');
  down.type = 'button';
  down.setAttribute('aria-label', 'Fewer raids');
  down.append(arrow('M20 12H5M11 5l-7 7 7 7'));
  const plate = el('div', 'level-plate');
  plate.setAttribute('aria-live', 'polite');
  const number = el('span', '');
  plate.append(el('small', '', 'Raids'), number);
  const up = el('button', 'level-step');
  up.type = 'button';
  up.setAttribute('aria-label', 'More raids');
  up.append(arrow('M4 12h15M13 5l7 7-7 7'));
  pick.append(down, plate, up);
  // Quick picks: 1, 10, 50, 100, and the most.
  const quick = el('div', 'tm-batch-quick');
  for (const n of [...new Set([1, 10, 50, 100, view.most])].filter((n) => n <= view.most)) {
    const button = el('button', 'tm-batch-chip', n === view.most ? `Max ${n}` : String(n));
    button.type = 'button';
    button.addEventListener('click', () => set(n));
    quick.append(button);
  }
  const cost = el('p', 'tm-batch-cost');
  const warn = el('p', 'tm-batch-warn', 'You can’t join a raid until they’re over (or you stop them).');
  const note = el('p', 'level-note');
  note.setAttribute('role', 'status');
  const actions = el('div', 'level-actions');
  const go = el('button', 'level-confirm', 'Start');
  go.type = 'button';
  actions.append(go);
  box.append(about, pick, quick, cost, warn, note, actions);

  // Held down, the −/+ go on, faster the longer.
  const set = (n: number): void => {
    count = Math.max(1, Math.min(view.most, n));
    number.textContent = String(count);
    down.disabled = count <= 1;
    up.disabled = count >= view.most;
    const total = count * view.price;
    cost.replaceChildren(el('span', '', `${count} × ${points(view.price)} = `), el('b', total > view.balance ? 'tm-batch-short' : '', `${points(total)} zeiucoins`), el('span', 'tm-batch-have', ` (you have ${points(view.balance)})`));
    cost.title = total > view.balance ? 'It stops when you can’t pay for the next raid.' : '';
  };
  const hold = (button: HTMLButtonElement, by: number): void => {
    let timer = 0;
    let held = 0;
    const tick = (): void => {
      set(count + by * (held > 10 ? 10 : 1));
      held++;
      timer = window.setTimeout(tick, held === 1 ? 400 : 70);
    };
    const stop = (): void => clearTimeout(timer);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      held = 0;
      tick();
    });
    for (const end of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(end, stop);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        set(count + by);
      }
    });
  };
  hold(down, -1);
  hold(up, 1);
  set(count);

  go.addEventListener('click', async () => {
    go.disabled = true;
    note.textContent = '';
    const why = await start(count);
    if (why === null) return close();
    note.textContent = REFUSED[why] ?? 'That didn’t work. Try again.';
    go.disabled = false;
  });
  go.focus();
}

const ENDED: Record<NonNullable<TmBatchView['end']>, string> = {
  finished: 'Every raid has been fought.',
  stopped: 'You stopped them.',
  too_poor: 'They stopped when you couldn’t pay for the next raid.',
  no_heroes: 'They stopped when the lineup’s heroes were no longer yours.',
  failed: 'They stopped when a raid couldn’t be fought (it was refunded).',
};

const clock = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

let shown: { refresh: () => void } | null = null;

/**
 * Shows their background raids over the page (once: shown again, it's only read again), read from the bot now and every so
 * often, its countdown each second. Back to the raid (once they're over) loads the page again, into a room.
 */
export function showBatch(into: HTMLElement, api: BatchApi, raidName: string): void {
  if (shown) return shown.refresh();
  const { box } = popup(into, 'Background Battle', () => {}, false);
  box.classList.add('tm-batch-panel');
  const where = el('p', 'tm-batch-where');
  const count = el('div', 'tm-batch-count');
  const bar = el('div', 'tm-batch-bar');
  const fill = el('div', 'tm-batch-fill');
  bar.append(fill);
  bar.setAttribute('role', 'progressbar');
  const tally = el('div', 'tm-batch-tally');
  const next = el('p', 'tm-batch-next');
  const said = el('p', 'tm-batch-said');
  const note = el('p', 'level-note');
  note.setAttribute('role', 'status');
  const actions = el('div', 'level-actions tm-batch-actions');
  const stop = el('button', 'tm-batch-stop', 'Stop');
  stop.type = 'button';
  const back = el('button', 'level-confirm', 'Back to Raid');
  back.title = `Back to the ${raidName}`;
  back.type = 'button';
  back.hidden = true;
  // To the games hub, the raids going on meanwhile (a link: the site's loading screen takes it there).
  const home = el('a', 'tm-batch-home', 'Games') as HTMLAnchorElement;
  home.href = '/';
  actions.append(home, stop, back);
  const asked = el('p', 'tm-batch-asked', 'Stop now? The raid being fought pays nothing.');
  asked.hidden = true;
  box.append(where, count, bar, tally, next, said, note, asked, actions);

  let view: TmBatchesView | null = null;
  /** The bot's clock less this page's: the countdown by the bot's. */
  let skew = 0;
  let asking = false;
  let confirming = false;

  const draw = (): void => {
    const batch = view?.batch;
    if (!batch) {
      where.textContent = '';
      count.textContent = '';
      said.textContent = 'No background raids are being fought.';
      stop.hidden = true;
      back.hidden = false;
      return;
    }
    where.textContent = batch.where;
    count.replaceChildren(el('b', '', String(batch.done)), el('span', '', ` / ${batch.count} raids`));
    fill.style.width = `${(100 * batch.done) / Math.max(1, batch.count)}%`;
    bar.setAttribute('aria-valuenow', String(batch.done));
    bar.setAttribute('aria-valuemax', String(batch.count));
    tally.replaceChildren(el('span', 'tm-batch-won', `Won ${batch.won}`), el('span', 'tm-batch-lost', `Lost ${batch.lost}`), el('span', '', `Spent ${points(batch.spent)} zeiucoins`));
    const running = batch.state === 'running';
    const ends = batch.current?.endsAt;
    next.hidden = !running;
    if (running) next.textContent = ends ? `Raid ${batch.done + 1} ends in ${clock(ends - (Date.now() + skew))}` : 'The next raid is starting…';
    said.textContent = running ? 'Your heroes are fighting. You can close this page: the raids go on, and the results come by mail.' : `${ENDED[batch.end ?? 'finished']} The results are in your mail.`;
    stop.hidden = !running;
    // Asked first: what it does over the buttons, and Stop saying Yes.
    asked.hidden = !running || !confirming;
    stop.textContent = confirming ? 'Yes, Stop' : 'Stop';
    back.hidden = running;
  };

  const read = async (): Promise<void> => {
    if (asking) return;
    asking = true;
    const res = await api.view();
    asking = false;
    if (!res.ok) {
      note.textContent = res.status === 0 ? 'The bot can’t be reached: trying again.' : 'Couldn’t read your background raids.';
      return;
    }
    note.textContent = '';
    view = res.data;
    skew = res.data.now - Date.now();
    draw();
  };

  stop.addEventListener('click', async () => {
    if (!confirming) {
      confirming = true;
      draw();
      return;
    }
    stop.disabled = true;
    const res = await api.stop();
    stop.disabled = false;
    confirming = false;
    if (res.ok) {
      view = res.data;
      draw();
    } else note.textContent = res.error === 'not_found' ? 'They were over already.' : 'Couldn’t stop them. Try again.';
    void read();
  });
  back.addEventListener('click', () => location.reload());

  // Each second the countdown; every 15 seconds (and as a run ends) the bot's word.
  let lastEnds = 0;
  window.setInterval(() => {
    const ends = view?.batch?.current?.endsAt ?? 0;
    if (view?.batch?.state === 'running' && ends && Date.now() + skew > ends + 1500 && lastEnds !== ends) {
      lastEnds = ends;
      void read();
    }
    draw();
  }, 1000);
  window.setInterval(() => {
    if (view?.batch?.state === 'running') void read();
  }, 15_000);
  shown = { refresh: () => void read() };
  void read();
  back.focus();
}
