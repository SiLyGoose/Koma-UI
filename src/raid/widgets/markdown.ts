/*
 * The bit of Discord markdown the raid's text uses (the boss's next move, the action log), drawn as
 * the page's own elements: **bold**, *italics* (or _italics_), <@id> mentions (by the names the bot
 * sends), and <:name:id> custom emojis (Discord's pictures). Everything else is plain text: it's
 * built from text nodes, never parsed as HTML, so nothing in a name or a line can become markup.
 */

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|<@!?\d+>|<a?:\w+:\d+>)/g;

/** `text` as elements to put in a line; `names` names the mentions (a missing one shows as "someone"). */
export function markdown(text: string, names: Readonly<Record<string, string>>): Node[] {
  const out: Node[] = [];
  for (const part of text.split(TOKEN)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const b = document.createElement('b');
      b.append(...markdown(part.slice(2, -2), names));
      out.push(b);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      const i = document.createElement('i');
      i.append(...markdown(part.slice(1, -1), names));
      out.push(i);
    } else if (/^<@!?\d+>$/.test(part)) {
      const id = part.replace(/\D/g, '');
      const span = document.createElement('span');
      span.className = 'md-mention';
      span.textContent = `@${names[id] ?? 'someone'}`;
      out.push(span);
    } else if (/^<a?:\w+:\d+>$/.test(part)) {
      const [, animated, name, id] = /^<(a?):(\w+):(\d+)>$/.exec(part) as RegExpExecArray;
      const img = document.createElement('img');
      img.className = 'md-emoji';
      img.src = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'webp'}?size=48`;
      img.alt = `:${name}:`;
      img.draggable = false;
      // An emoji that won't load goes quietly (the words around it still say what happened).
      img.addEventListener('error', () => img.remove(), { once: true });
      out.push(img);
    } else {
      out.push(document.createTextNode(part));
    }
  }
  return out;
}
