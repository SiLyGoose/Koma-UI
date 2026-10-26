/** An element of a class, saying `text`. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  if (text) made.textContent = text;
  return made;
}

/** Each element's style property as last put by `put()`, so one written every frame is written only when it changes. */
const PUT = new WeakMap<HTMLElement, Map<string, string>>();

/** Sets `node`'s style property `name` (a transform, a width) to `value`, unless it was set to that last: a style written again is styled again, every frame. */
export function put(node: HTMLElement, name: 'transform' | 'width' | 'order', value: string): void {
  let had = PUT.get(node);
  if (!had) PUT.set(node, (had = new Map()));
  if (had.get(name) === value) return;
  had.set(name, value);
  node.style[name] = value;
}

/** Sets `node`'s attribute `name` to `value`, unless it says that already. */
export function attr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** Each element's classes as last set by `flag()`. */
const FLAGS = new WeakMap<Element, Map<string, boolean>>();

/** Adds or takes off `node`'s class `name`, unless `flag()` last left it so (for a class nothing else sets: drawn every frame). */
export function flag(node: Element, name: string, on: boolean): void {
  let had = FLAGS.get(node);
  if (!had) FLAGS.set(node, (had = new Map()));
  if (had.get(name) === on) return;
  had.set(name, on);
  node.classList.toggle(name, on);
}

/** Shows or hides `node`, unless it is so already (hiding a hidden one is a change to the page all the same). */
export function shown(node: HTMLElement, on: boolean): void {
  if (node.hidden === on) node.hidden = !on;
}
