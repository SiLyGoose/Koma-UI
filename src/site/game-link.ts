/*
 * A game's link with what its page is to read from its address: a page opening a game (./play.ts, and the Divine Punishment
 * game's map, ../divine/bot.ts) puts the boss and the raid on the link the bot handed out. Apart from ./play.ts, which brings
 * the site's session (and its header) with it.
 */

/** A game's link with what the page is to read from its address (before the #): the boss it is against (?boss=) and the raid (?room=), those there are. */
export function withQuery(url: string, query: { boss?: string | null; room?: string | null }): string {
  const more = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')).toString();
  if (!more) return url;
  const at = url.indexOf('#');
  const [path, hash] = at < 0 ? [url, ''] : [url.slice(0, at), url.slice(at)];
  return `${path}${path.includes('?') ? '&' : '?'}${more}${hash}`;
}
