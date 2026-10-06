import type { Direction, PinecraftPickaxe } from '../protocol';
import { currentCharacter } from '../../shared/characters';
import { characterImage, pickaxeImage } from './textures';

/** How long the pickaxe's picture is drawn, in the character's units (100 a block), and how far of it sits behind the hand. */
const PICKAXE_LENGTH = 58;
const PICKAXE_BEHIND = 18;

/** How tall the character's picture is drawn, in the character's units (Character.hand is in these too). */
const CHARACTER_HEIGHT = 96;

/**
 * The character, standing in the block whose top left is (px, py), `s` wide, with `pickaxe`. `swing`
 * is how far through a swing of the pickaxe (null when still).
 */
export function character(
  g: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  facing: 1 | -1,
  swing: number | null,
  dir: Direction | null,
  now: number,
  pickaxe: PinecraftPickaxe,
): void {
  g.save();
  g.translate(px + s / 2, py + s);
  g.scale(facing * (s / 100), s / 100);
  // From here on: 100 units a block, x 0 in the middle, y 0 at the feet, facing right.
  const bob = swing === null ? Math.sin(now / 400) * 1 : 0;
  const sprite = characterImage();

  // The pickaxe: raised while still (behind the shape character; held up in front of the picture, where
  // it would be hidden behind them), brought down in front in a swing. Digging up or down swings it
  // that way instead.
  const rest = sprite ? -1.3 : -2.2;
  const strike = dir === 'up' ? (sprite ? -1.9 : -1.2) : dir === 'down' ? 0.9 : 0.25;
  const t = swing === null ? 0 : Math.sin(Math.min(1, swing) * Math.PI);
  const angle = rest + (strike - rest) * t;

  if (sprite) {
    // Held in the picture's hand: behind the picture while still, in front during a swing.
    // Where the picture's front hand is: each character's own (../../shared/characters.ts).
    const { hand: grip } = currentCharacter();
    const hand = { x: grip.x, y: grip.y + Math.round(bob) };
    if (swing === null) heldPickaxe(g, hand, angle, pickaxe);
    const h = CHARACTER_HEIGHT;
    const w = (h * sprite.naturalWidth) / sprite.naturalHeight;
    g.imageSmoothingEnabled = false;
    g.drawImage(sprite, -w / 2, -h + Math.round(bob), w, h);
    if (swing !== null) heldPickaxe(g, hand, angle, pickaxe);
  } else {
    // Held at the shoulder, with a hand on the handle.
    drawnCharacter(g, bob);
    heldPickaxe(g, { x: 8, y: -52 + bob }, angle, pickaxe);
    g.fillStyle = '#f0c29a';
    g.beginPath();
    g.arc(8 + Math.cos(angle) * 12, -52 + bob + Math.sin(angle) * 12, 6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** The pickaxe, turned `angle` about `grip` (0 points it forward). */
function heldPickaxe(g: CanvasRenderingContext2D, grip: { x: number; y: number }, angle: number, pickaxe: PinecraftPickaxe): void {
  g.save();
  g.translate(grip.x, grip.y);
  g.rotate(angle);
  const img = pickaxeImage(pickaxe);
  if (img) {
    // The picture is upright; turned a quarter, its handle runs out from the hand with the head at the end.
    g.rotate(Math.PI / 2);
    g.drawImage(img, -PICKAXE_LENGTH / 2, -PICKAXE_LENGTH + PICKAXE_BEHIND, PICKAXE_LENGTH, PICKAXE_LENGTH);
  } else {
    drawnPickaxe(g);
  }
  g.restore();
}

/** The character drawn in shapes, while their picture loads (same units as in character()). */
function drawnCharacter(g: CanvasRenderingContext2D, bob: number): void {
  // Boots and legs.
  g.fillStyle = '#3b2a1c';
  g.fillRect(-18, -8, 15, 8);
  g.fillRect(4, -8, 15, 8);
  g.fillStyle = '#2d4f9e';
  g.fillRect(-16, -30, 12, 23);
  g.fillRect(5, -30, 12, 23);
  // Shirt and overalls.
  g.fillStyle = '#d9772b';
  g.beginPath();
  g.roundRect(-20, -62 + bob, 40, 36, 8);
  g.fill();
  g.fillStyle = '#3563c7';
  g.fillRect(-15, -48 + bob, 30, 20);
  g.fillRect(-15, -60 + bob, 5, 14);
  g.fillRect(10, -60 + bob, 5, 14);
  // Head.
  g.fillStyle = '#f0c29a';
  g.beginPath();
  g.arc(0, -74 + bob, 15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a1d14';
  g.beginPath();
  g.arc(6, -75 + bob, 2.4, 0, Math.PI * 2);
  g.fill();
  // Helmet, with its lamp at the front.
  g.fillStyle = '#f5c542';
  g.beginPath();
  g.arc(0, -79 + bob, 17, Math.PI, 0);
  g.fill();
  g.fillStyle = '#d19d1c';
  g.fillRect(-19, -81 + bob, 38, 5);
  g.fillStyle = '#fff6c8';
  g.beginPath();
  g.arc(13, -88 + bob, 5, 0, Math.PI * 2);
  g.fill();
}

/** A plain pickaxe drawn along +x from the shoulder, while the pictures load. */
function drawnPickaxe(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#7a5230';
  g.fillRect(-3, -3, 46, 6);
  g.fillStyle = '#9aa3ad';
  g.strokeStyle = '#4f565e';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(40, -22);
  g.quadraticCurveTo(54, 0, 40, 22);
  g.quadraticCurveTo(47, 0, 40, -22);
  g.closePath();
  g.fill();
  g.stroke();
}
