/** What vite.config.ts's `pictures` plugin says of the site's pictures (src/shared/built.ts reads it). */
/** What vite.config.ts's `blur` plugin says of the items' pictures blurred (scripts/blur.mjs; src/shared/items/blur.ts reads it). */
declare module 'virtual:blur' {
  /**
   * The sheet (its address), how many pictures go across it and down, each picture's address in order (as the pages ask
   * for it, before built()), and King's Raid's hero gear's icons by item id. Null where none was made.
   */
  const index: { sheet: string; across: number; down: number; pictures: readonly string[]; kr: Readonly<Record<string, string>> } | null;
  export default index;
}

declare module 'virtual:pictures' {
  /** The items that have a picture, by their folder in public/gear/items/: their ids. */
  export const ITEM_ART: Readonly<Record<'weapons' | 'armor' | 'treasures', readonly string[]>>;
  /**
   * In a build: where the pictures made as WebP are (`dir`, as public/built/), the folders they're made for, those
   * of them that couldn't be made, and the model textures made at half size besides (their addresses); and the animation
   * clips made (scripts/clips.mjs): the folder they're made for, and those that couldn't be. Null in `yarn dev`.
   */
  export const BUILT: { dir: string; folders: readonly string[]; missing: readonly string[]; small: readonly string[]; clips: { folder: string; missing: readonly string[] } } | null;
}
