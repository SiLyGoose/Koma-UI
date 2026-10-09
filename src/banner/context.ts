import type { Busy } from '../shared/ui';
import { BANNERS, type Banner } from './banners';
import type { BannerView } from './types';

/** The banner page's elements, found once in its root. */
export interface BannerUi {
  status: HTMLElement;
  server: HTMLSelectElement;
  tabs: HTMLElement;
  tokens: HTMLElement;
  balance: HTMLElement;
  banner: HTMLElement;
  kind: HTMLElement;
  name1: HTMLElement;
  name2: HTMLElement;
  promise: HTMLElement;
  blurb: HTMLElement;
  path: HTMLElement;
  pathRing: HTMLElement;
  pathArt: HTMLElement;
  pathCount: HTMLElement;
  time: HTMLElement;
  feature1: HTMLElement;
  feature2: HTMLElement;
  detailsOpen: HTMLButtonElement;
  details: HTMLElement;
  detailsClose: HTMLButtonElement;
  rates: HTMLElement;
  detailsPity: HTMLElement;
  guarantee: HTMLElement;
  one: HTMLButtonElement;
  oneCost: HTMLElement;
  ten: HTMLButtonElement;
  tenLabel: HTMLElement;
  tenCost: HTMLElement;
  wish: HTMLElement;
  sky: HTMLCanvasElement;
  flash: HTMLElement;
  stage: HTMLElement;
  skip: HTMLButtonElement;
}

/** Everything the mounted banner page knows. */
export interface BannerContext {
  ui: BannerUi;
  /** The banner showing (its tab picked). */
  banner: Banner;
  view: BannerView | null;
  /** A pull on its way (its button: 'one' or 'ten'), or its wish still playing: the buttons wait for it. */
  busy: Busy | null;
  /** Ends the wish playing (if any) at once: the page is going. */
  endWish: (() => void) | null;
}

export function createContext(root: HTMLElement): BannerContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    ui: {
      status: $('status'),
      server: $<HTMLSelectElement>('server'),
      tabs: $('tabs'),
      tokens: $('tokens'),
      balance: $('balance'),
      banner: $('banner'),
      kind: $('kind'),
      name1: $('name-1'),
      name2: $('name-2'),
      promise: $('promise'),
      blurb: $('blurb'),
      path: $('path'),
      pathRing: $('path-ring'),
      pathArt: $('path-art'),
      pathCount: $('path-count'),
      time: $('time'),
      feature1: $('feature-1'),
      feature2: $('feature-2'),
      detailsOpen: $<HTMLButtonElement>('details-open'),
      details: $('details'),
      detailsClose: $<HTMLButtonElement>('details-close'),
      rates: $('rates'),
      detailsPity: $('details-pity'),
      guarantee: $('guarantee'),
      one: $<HTMLButtonElement>('pull-one'),
      oneCost: $('pull-one-cost'),
      ten: $<HTMLButtonElement>('pull-ten'),
      tenLabel: $('pull-ten-label'),
      tenCost: $('pull-ten-cost'),
      wish: $('wish'),
      sky: $<HTMLCanvasElement>('wish-sky'),
      flash: $('wish-flash'),
      stage: $('wish-stage'),
      skip: $<HTMLButtonElement>('wish-skip'),
    },
    banner: BANNERS[0] as Banner,
    view: null,
    busy: null,
    endWish: null,
  };
}

export function status(ctx: BannerContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

/** What `pulls` pulls cost them now: komaTokens first, points for the rest. */
export function price(view: BannerView, pulls: number): { tokens: number; points: number } {
  const tokens = Math.min(view.tokens, pulls);
  return { tokens, points: view.cost * (pulls - tokens) };
}

export const canAfford = (view: BannerView, pulls: number): boolean => price(view, pulls).points <= view.balance;
