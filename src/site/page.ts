/**
 * One of the site's pages, as the router (main.ts) shows it once its module is read. Where it is, and who may see
 * it, are the router's (its Route), known before then.
 */
export interface Page {
  title: string;
  /** Its tab icon: an emoji. */
  icon: string;
  /** Its markup (its .html beside it, imported ?raw), copied into #view each time it's shown. */
  markup: string;
  /**
   * Sets the page up in `root` (a fresh copy of its markup, already in the document), for the page at
   * location.pathname. `drawn` is done once it has drawn itself (or said why it can't), for the
   * transition to uncover it; `unmount` stops what it started outside `root` (listeners on the
   * document, say) as it goes; `navigate`, for a page with subpaths, shows another of its paths
   * (gone to, or back or forward to) in place, with no transition.
   */
  mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate?: (url: URL) => void };
}
