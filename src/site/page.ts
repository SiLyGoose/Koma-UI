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
  /** The paths under its own are this page too (the shop's tabs: /shop/outfits); it picks what to show from the path. */
  subpaths?: boolean;
  /**
   * Sets the page up in `root` (a fresh copy of its markup, already in the document), for the page at
   * location.pathname. `drawn` is done once it has drawn itself (or said why it can't), for the
   * transition to uncover it; `unmount` stops what it started outside `root` (listeners on the
   * document, say) as it goes; `navigate`, for a page with subpaths, shows another of its paths
   * (gone to, or back or forward to) in place, with no transition.
   */
  mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate?: (url: URL) => void };
}
