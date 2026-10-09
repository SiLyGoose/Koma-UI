/*
 * The characters a member can play as, one for each of the bot's outfits (its data/outfits.ts, by the
 * same ids): the sprite on the gear page's stage, in Pinecraft, in the shop and the dressing room, and
 * the glowing silhouette on the loading screen (transition/head.css). Each has its own folder,
 * public/characters/<id>/: sprite.png (pixel art, standing, facing right) and silhouette.png (made
 * from it by scripts/silhouette.py). Everyone is Tsuri until they buy another (the shop's Outfits tab,
 * ../outfits/) and put it on (the dressing room, ../dressing/).
 */

export interface Character {
  id: string;
  name: string;
  /** Pixel art, standing and facing right. */
  sprite: string;
  /** Its size in pixels. */
  width: number;
  height: number;
  /**
   * Where its front hand is, for holding a pickaxe in Pinecraft: in Pinecraft's units (the sprite
   * drawn 96 tall, x 0 in its middle, y 0 at its feet).
   */
  hand: { x: number; y: number };
  /**
   * Its head and a little of its body, for its portrait in the dressing room: a square of the sprite,
   * `size` pixels across from (x, y) (it may run past the sprite's edges, which are see-through).
   */
  portrait: { x: number; y: number; size: number };
}

export const CHARACTERS: Record<string, Character> = {
  tsuri: { id: 'tsuri', name: 'Tsuri', sprite: '/characters/tsuri/sprite.png', width: 22, height: 44, hand: { x: 20, y: -19 }, portrait: { x: -2, y: 4, size: 26 } },
  'yae-pixo': { id: 'yae-pixo', name: 'Yae Pixo', sprite: '/characters/yae-pixo/sprite.png', width: 34, height: 45, hand: { x: 17, y: -18 }, portrait: { x: 4, y: 8, size: 26 } },
  speve: { id: 'speve', name: 'Speve', sprite: '/characters/speve/sprite.png', width: 16, height: 30, hand: { x: 19, y: -37 }, portrait: { x: 1, y: -1, size: 14 } },
};

/** The character for the outfit a member wears (the bot says which): Tsuri when it's none this page knows. */
export const characterOf = (outfit: string | null | undefined): Character => CHARACTERS[outfit ?? ''] ?? (CHARACTERS.tsuri as Character);
