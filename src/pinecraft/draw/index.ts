/*
 * Draws Pinecraft: the underground around the character, in blocks. Ground dug out is a warm earth
 * floor; only the blocks next to it (the ones the character can get at) are drawn as what they are, and
 * the rest are mystery blocks: the dirt's picture, nearly black.
 *
 * scene.ts is what's drawn (the blocks known, the character, the particles); draw-scene.ts draws it,
 * with character.ts for the character and their pickaxe; particles.ts moves the chips a dig throws
 * off; map.ts draws the map.
 */

export { drawScene } from './draw-scene';
export { drawMap } from './map';
export { burst, stepParticles } from './particles';
export { cellAt, isBedrock, isOpenCell, ORE_OF, type Particle, type Scene } from './scene';
