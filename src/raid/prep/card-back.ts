import { el } from '../widgets';

/**
 * An empty seat's card back, in gold line art on the dark card (5 wide by 9 high, like the card): a tall
 * diamond from edge to edge with a finer one inside it, a sun in the middle (long rays up and down,
 * shorter across and between, round a ringed disc with swirls in it), and a curl in every corner.
 */
const CARD_BACK = (() => {
  const gold = '#c9a867';
  const ray = (points: string, angle = 0): string => `<polygon points="${points}" transform="rotate(${angle} 50 90)" />`;
  const corner = (transform: string): string =>
    `<g transform="${transform}"><path d="M5 26 Q5 5 26 5" /><path d="M9 9 q8 1 7 9 q-1 5 -6 3.5" /><path d="M9 9 q1 8 9 7 q5 -1 3.5 -6" /><circle cx="9" cy="9" r="1.4" fill="${gold}" stroke="none" /></g>`;
  return `<svg viewBox="0 0 100 180" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="rd-back-fill" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3b2b13" /><stop offset="1" stop-color="#171208" /></radialGradient></defs>
    <g fill="none" stroke="${gold}" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="50,4 96,90 50,176 4,90" fill="url(#rd-back-fill)" stroke-opacity="0.6" stroke-width="1.1" />
      <polygon points="50,13 88.5,90 50,167 11.5,90" stroke-opacity="0.28" stroke-width="0.6" />
      <g fill="${gold}" fill-opacity="0.5" stroke="none">
        ${ray('50,30 52.8,70 50,76 47.2,70')}${ray('50,30 52.8,70 50,76 47.2,70', 180)}
        ${ray('50,58 52.4,72 50,76 47.6,72', 90)}${ray('50,58 52.4,72 50,76 47.6,72', 270)}
        ${[45, 135, 225, 315].map((a) => ray('50,64 51.8,74 50,76 48.2,74', a)).join('')}
      </g>
      <circle cx="50" cy="90" r="17" fill="#140e06" stroke-opacity="0.65" stroke-width="1.2" />
      <circle cx="50" cy="90" r="13.5" stroke-opacity="0.3" stroke-width="0.5" />
      <g stroke-opacity="0.5" stroke-width="0.7">
        <path d="M50 90 c0 -2.4 3 -2.4 3 0 c0 4 -6 4 -6 0 c0 -6 9 -6 9 0 c0 8 -12 8 -12 0" />
        <path d="M40.5 83 q4 -3.5 7 0.5" /><path d="M59.5 97 q-4 3.5 -7 -0.5" />
        <path d="M41 98 q-1.5 -4.5 2.5 -6.5" /><path d="M59 82 q1.5 4.5 -2.5 6.5" />
      </g>
      <g stroke-opacity="0.55" stroke-width="1.1">
        ${corner('')}${corner('translate(100 0) scale(-1 1)')}${corner('translate(0 180) scale(1 -1)')}${corner('translate(100 180) scale(-1 -1)')}
      </g>
    </g>
  </svg>`;
})();

/** An empty seat's card back (CARD_BACK). */
export function cardBack(): HTMLElement {
  const back = el('span', 'rd-slot-back');
  back.innerHTML = CARD_BACK;
  return back;
}
