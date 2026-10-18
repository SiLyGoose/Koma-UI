/** What vite.config.ts's `pictures` plugin says of the site's pictures (src/shared/built.ts reads it). */
declare module 'virtual:pictures' {
  /** The items that have a picture, by their folder in public/gear/items/: their ids. */
  export const ITEM_ART: Readonly<Record<'weapons' | 'armor' | 'treasures', readonly string[]>>;
  /**
   * In a build: where the pictures made as WebP are (`dir`, as public/built/), the folders they're made for, those
   * of them that couldn't be made, and the model textures made at half size besides (their addresses). Null in `yarn dev`.
   */
  export const BUILT: { dir: string; folders: readonly string[]; missing: readonly string[]; small: readonly string[] } | null;
}
