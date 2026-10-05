/** Pinecraft's elements (games/pinecraft/index.html), found once, and the mine's canvas. */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const canvas = $<HTMLCanvasElement>('board');
export const g = canvas.getContext('2d') as CanvasRenderingContext2D;

export const ui = {
  energy: $('energy'),
  energyFill: $('energy-fill'),
  energyNext: $('energy-next'),
  balance: $('balance'),
  depth: $('depth'),
  earned: $('earned'),
  oreTip: $('ore-tip-rows'),
  log: $('log'),
  wrap: $('board-wrap'),
  floaters: $('floaters'),
  stage: $('stage'),
  stick: $('stick'),
  stickKnob: $('stick-knob'),
  mapButton: $<HTMLButtonElement>('map-button'),
  blast: $('blast'),
  blastLeft: $('blast-left'),
  coords: $('coords'),
  map: $('map'),
  mapCanvas: $<HTMLCanvasElement>('map-canvas'),
  mapWhere: $('map-where'),
  mapClose: $<HTMLButtonElement>('map-close'),
};
