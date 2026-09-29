/** One of the site's pages, as the router (main.ts) shows it. */
export interface Page {
  /** Its path, without a trailing slash ('' for the front page). */
  path: string;
  title: string;
  /** Its tab icon: an emoji. */
  icon: string;
  /** Its markup (its .html beside it, imported ?raw), copied into #view each time it's shown. */
  markup: string;
  /** Only for someone logged in: anyone else is sent to the front page (which offers to log in). */
  needsLogin?: boolean;
  /**
   * Sets the page up in `root` (a fresh copy of its markup, already in the document). `drawn` is done
   * once it has drawn itself (or said why it can't), for the transition to uncover it; `unmount` stops
   * what it started outside `root` (listeners on the document, say) as it goes.
   */
  mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void };
}
