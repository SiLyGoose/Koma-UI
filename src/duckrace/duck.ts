import { DUCKS, type Duck } from '../protocol/duckrace';

/*
 * A rubber duck, side on and facing right, in its colour: drawn here, no picture needed.
 */

const SVG = 'http://www.w3.org/2000/svg';

/** The duck `duck` as an <svg> (sized by its class's CSS). */
export function duckSvg(duck: Duck, className = 'dr-duck-svg'): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 64 50');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.setProperty('--duck', DUCKS[duck].color);
  svg.innerHTML =
    // The tail, the body and the wing.
    '<path class="dr-duck-body" d="M4 22 L15 29 C14 22 20 24 27 25 C35 26 44 22 50 29 C55 38 45 47 30 47 C15 47 7 41 8 33 C8 30 6 27 4 22 Z"/>' +
    '<path class="dr-duck-wing" d="M19 32 C25 26 34 28 38 33 C33 39 24 39 19 32 Z"/>' +
    // The head, the beak and the eye.
    '<circle class="dr-duck-body" cx="44" cy="17" r="12"/>' +
    '<path class="dr-duck-beak" d="M53 16 C58 14 63 16 63 18 C63 21 58 23 53 22 Z"/>' +
    '<circle class="dr-duck-eye" cx="48" cy="13.5" r="2.4"/><circle class="dr-duck-shine" cx="48.8" cy="12.7" r="0.8"/>';
  return svg;
}
