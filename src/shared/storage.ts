/* What a page keeps in the browser between visits (the chip picked, the bet typed): never there in a private window. */

export function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // No storage (a private window): not kept, and that's fine.
  }
}
