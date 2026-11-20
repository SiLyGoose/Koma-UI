/*
 * What has happened so far (both vault events): a log beside the game, inside its stage, one line an action. Hot
 * Potato's: each potato coming out, every pass and grab, and who it went off on. Laser Grid's: each round, then every
 * press in it (Joe ✔ 0.31s, Ray ✖ too early). The newest is at the bottom, and the log keeps it in view. It's the
 * story of the game: who passed it to whom, and whose fault it was. (The result card keeps the last game's too.)
 */

/** One piece of a line: words, maybe marked (a grab, a blast, a duck, a catch; `you`: the page's own player). */
export interface TrailPart {
  text: string;
  kind?: 'grab' | 'blast' | 'good' | 'bad' | 'you' | 'arrow' | 'head';
}

/** One action: its words, and whether it starts something (a potato, a round), drawn as a heading. */
export interface TrailLine {
  parts: readonly TrailPart[];
  head?: boolean;
}

export interface Trail {
  /** The lines, oldest first. */
  render(lines: readonly TrailLine[]): void;
}

/** A log in `box` (a list), saying `empty` while nothing has happened. */
export function trail(box: HTMLElement, empty: string): Trail {
  box.classList.add('ve-trail');
  let shown = '';
  return {
    render(lines) {
      // Only redrawn when it says something new (the state comes again and again).
      const key = JSON.stringify(lines);
      if (key === shown) return;
      shown = key;
      if (lines.length === 0) {
        const none = document.createElement('li');
        none.className = 've-trail-none';
        none.textContent = empty;
        box.replaceChildren(none);
        return;
      }
      box.replaceChildren(
        ...lines.map((line) => {
          const item = document.createElement('li');
          item.className = `ve-trail-line${line.head ? ' head' : ''}`;
          for (const part of line.parts) {
            const span = document.createElement('span');
            if (part.kind) span.className = `ve-trail-${part.kind}`;
            span.textContent = part.text;
            item.append(span);
          }
          return item;
        }),
      );
      box.scrollTop = box.scrollHeight;
    },
  };
}
