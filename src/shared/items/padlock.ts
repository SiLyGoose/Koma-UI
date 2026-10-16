/** A padlock icon with a keyhole, shut or open (a locked copy's badge, and the lock button's). */
export function padlock(shut: boolean): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('class', 'padlock');
  const shackle = shut ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 7.9-1';
  icon.innerHTML =
    `<path d="${shackle}" fill="none" stroke="currentColor" stroke-width="2.4" />` +
    '<path fill="currentColor" fill-rule="evenodd" d="M7 10h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm5 3.2a1.6 1.6 0 0 0-.8 3v2.3h1.6v-2.3a1.6 1.6 0 0 0-.8-3Z" />';
  return icon;
}
