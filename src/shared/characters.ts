/*
 * The characters a member can play as: the sprite on the gear page's stage and in Pinecraft, and the
 * glowing silhouette on the loading screen (transition/head.css). Each has its own folder,
 * public/characters/<id>/: sprite.png (pixel art, standing, facing right) and silhouette.png (made
 * from it by scripts/silhouette.py). Everyone is Tsuri for now; getting and picking the others comes later.
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
}

export const CHARACTERS: Record<string, Character> = {
  tsuri: { id: 'tsuri', name: 'Tsuri', sprite: '/characters/tsuri/sprite.png', width: 22, height: 44, hand: { x: 20, y: -19 } },
  'yae-pixo': { id: 'yae-pixo', name: 'Yae Pixo', sprite: '/characters/yae-pixo/sprite.png', width: 34, height: 45, hand: { x: 17, y: -18 } },
  speve: { id: 'speve', name: 'Speve', sprite: '/characters/speve/sprite.png', width: 16, height: 30, hand: { x: 19, y: -37 } },
};

/** The character a member plays as. Everyone is Tsuri until they can pick. */
export const currentCharacter = (): Character => CHARACTERS.tsuri as Character;
