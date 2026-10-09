/*
 * Going to another site page from anywhere (the pages, the session's logout) without importing the
 * router, which imports them all. The router (main.ts) plugs itself in as it starts.
 */

export interface GoOptions {
  /** Runs the transition right to left, as going back does. */
  back?: boolean;
  /** Shows the page again even when it's the one showing (after logging out, say). */
  reload?: boolean;
  /** Replaces this page in the history instead of adding one (a page that sends the member elsewhere at once). */
  replace?: boolean;
}

let impl: (href: string, options: GoOptions) => void = (href) => {
  location.href = href;
};

/** Goes to a site page (`/`, `/gear/`, `/forge/`, `/shop/` and its tabs, `/dressing-room/`, `/databank/`, with a #hash if wanted), through the transition. */
export const go = (href: string, options: GoOptions = {}): void => impl(href, options);

export function setGo(fn: (href: string, options: GoOptions) => void): void {
  impl = fn;
}
