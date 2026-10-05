/** Starts `el`'s `className` animation again from the top, even when it's already going (a shake, a bump). */
export function replay(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}
