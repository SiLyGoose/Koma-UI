/*
 * Who's playing (both vault events), in the panel on the right as the table games have it (../table/render/players.ts):
 * a row each, their picture, their name (You marked) and a word under it, and how they're doing at the right end
 * (holding the potato, out on potato 1; #2, caught: too early). Those out are greyed, at the bottom. A row is kept
 * from one state to the next, so its picture isn't fetched again.
 */

export interface RosterRow {
  id: string;
  name: string;
  avatar: string;
  you: boolean;
  out: boolean;
  /** Lit: holding the potato. */
  lit?: boolean;
  /** A word under the name. */
  sub?: string;
  /** How they're doing, at the right end. */
  status: { text: string; kind?: 'good' | 'bad' | 'hot' };
}

export interface Roster {
  /** The rows in order, and the count beside the title. */
  render(rows: readonly RosterRow[], count: string): void;
}

export function roster(list: HTMLElement, counter: HTMLElement): Roster {
  const rows = new Map<string, { root: HTMLLIElement; img: HTMLImageElement; name: HTMLElement; tag: HTMLElement; sub: HTMLElement; status: HTMLElement }>();

  function rowOf(id: string) {
    const known = rows.get(id);
    if (known) return known;
    const root = document.createElement('li');
    root.className = 've-roster-row';
    const img = document.createElement('img');
    img.className = 've-roster-face';
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    const text = document.createElement('div');
    text.className = 've-roster-text';
    const line = document.createElement('span');
    line.className = 've-roster-name';
    const name = document.createElement('span');
    const tag = document.createElement('span');
    tag.className = 've-roster-you';
    tag.textContent = 'You';
    line.append(name, tag);
    const sub = document.createElement('span');
    sub.className = 've-roster-sub';
    text.append(line, sub);
    const status = document.createElement('span');
    status.className = 've-roster-status';
    root.append(img, text, status);
    const row = { root, img, name, tag, sub, status };
    rows.set(id, row);
    return row;
  }

  return {
    render(list_, count) {
      const wanted = new Set(list_.map((r) => r.id));
      for (const [id, row] of rows) {
        if (wanted.has(id)) continue;
        row.root.remove();
        rows.delete(id);
      }
      counter.textContent = count;
      if (list_.length === 0) {
        const none = document.createElement('li');
        none.className = 've-roster-row empty';
        none.textContent = 'Nobody has joined yet';
        list.replaceChildren(none);
        return;
      }
      list.replaceChildren(
        ...list_.map((r) => {
          const row = rowOf(r.id);
          if (row.img.getAttribute('src') !== r.avatar) row.img.src = r.avatar;
          row.name.textContent = r.name;
          row.tag.hidden = !r.you;
          row.sub.textContent = r.sub ?? '';
          row.sub.hidden = !r.sub;
          row.status.textContent = r.status.text;
          row.status.className = `ve-roster-status${r.status.kind ? ` ${r.status.kind}` : ''}`;
          row.root.className = `ve-roster-row${r.you ? ' you' : ''}${r.out ? ' out' : ''}${r.lit ? ' lit' : ''}`;
          return row.root;
        }),
      );
    },
  };
}
