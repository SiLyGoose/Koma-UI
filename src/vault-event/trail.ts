/*
 * What has happened so far (both vault events), as a strip under the stage: Hot Potato's passes and grabs, potato by
 * potato (Mina → Joe → Mina (grabbed!) → Ray 💥), Laser Grid's rounds (Round 3 · Joe 0.31s · Ray ✖ too early). The
 * newest is at the end, and the strip keeps it in view. It's the story of the game: who passed it to whom, and whose
 * fault it was.
 */

/** One piece of a line: words, maybe marked (a grab, a blast, a duck, a catch; `you`: the page's own player). */
export interface TrailPart {
  text: string;
  kind?: 'grab' | 'blast' | 'good' | 'bad' | 'you' | 'arrow' | 'head';
}

export interface Trail {
  /** The lines, oldest first. */
  render(lines: readonly (readonly TrailPart[])[]): void;
}

export function trail(box: HTMLElement): Trail {
  box.classList.add('ve-trail');
  let shown = '';
  return {
    render(lines) {
      // Only redrawn when it says something new (the state comes again and again).
      const key = JSON.stringify(lines);
      if (key === shown) return;
      shown = key;
      box.hidden = lines.length === 0;
      box.replaceChildren(
        ...lines.map((parts) => {
          const line = document.createElement('p');
          line.className = 've-trail-line';
          for (const part of parts) {
            const span = document.createElement('span');
            if (part.kind) span.className = `ve-trail-${part.kind}`;
            span.textContent = part.text;
            line.append(span);
          }
          return line;
        }),
      );
      box.scrollTop = box.scrollHeight;
    },
  };
}
