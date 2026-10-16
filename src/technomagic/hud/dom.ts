/** An element of a class, saying `text`. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  if (text) made.textContent = text;
  return made;
}
