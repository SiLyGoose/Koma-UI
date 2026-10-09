/** One of the shop's tabs (./page.ts), as its rail shows it and its panel holds it. */
export interface ShopTab {
  /** Its path under /shop/ (/shop/outfits/). */
  id: string;
  label: string;
  /** The browser tab's title while it's showing. */
  title: string;
  /** Its picture on the rail: an inline SVG drawn in currentColor. */
  icon: string;
  /** Its markup (its .html, imported ?raw), copied into the panel each time it's shown. */
  markup: string;
  /** Sets it up in `root` (a fresh copy of its markup), as a site page does (../site/page.ts). */
  mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void };
}
