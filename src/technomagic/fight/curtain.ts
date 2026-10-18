import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Scene, type Vector3 } from 'three';

/*
 * What stands behind the heroes as the fight is over (../main.ts, with FightView.celebrate): a sheet of light, golden
 * and rayed for a win, cold and dim for a loss, fading to nothing at its foot so they still stand on the field's floor.
 */

/** How big the sheet is (the field's units), and how far behind the row it stands. */
const WIDE = 60;
const HIGH = 30;
const BEHIND = 4;

export interface Curtain {
  show(won: boolean, at: Vector3): void;
  hide(): void;
}

/** The sheet's picture: its light, its rays (a win's), and its foot fading out. */
function painted(won: boolean): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const [x, y] = [512, 300];
  const light = g.createRadialGradient(x, y, 10, x, y, 620);
  for (const [at, colour] of (won
    ? [[0, '#fff2c2'], [0.12, '#f3c96a'], [0.32, '#9a5e2c'], [0.62, '#2b1938'], [1, '#0b0814']]
    : [[0, '#8a93ad'], [0.25, '#4b536b'], [0.6, '#1c2030'], [1, '#07080d']]) as [number, string][])
    light.addColorStop(at, colour);
  g.fillStyle = light;
  g.fillRect(0, 0, 1024, 512);
  if (won) {
    // Rays out of the light.
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const wide = 0.05 + (i % 3) * 0.02;
      g.fillStyle = `rgba(255, 220, 140, ${0.05 + (i % 2) * 0.04})`;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a - wide) * 900, y + Math.sin(a - wide) * 900);
      g.lineTo(x + Math.cos(a + wide) * 900, y + Math.sin(a + wide) * 900);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // Its foot: fading to nothing.
  g.globalCompositeOperation = 'destination-out';
  const foot = g.createLinearGradient(0, 512, 0, 380);
  foot.addColorStop(0, 'rgba(0, 0, 0, 1)');
  foot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = foot;
  g.fillRect(0, 380, 1024, 132);
  const picture = new CanvasTexture(canvas);
  picture.colorSpace = SRGBColorSpace;
  return picture;
}

export function makeCurtain(scene: Scene): Curtain {
  const pictures = { won: painted(true), lost: painted(false) };
  const sheet = new Mesh(new PlaneGeometry(WIDE, HIGH), new MeshBasicMaterial({ map: pictures.won, transparent: true, depthWrite: false, fog: false, side: DoubleSide }));
  // (Over the map, which is drawn before the fighters; behind the heroes standing before it.)
  sheet.renderOrder = 5;
  return {
    show(won, at) {
      sheet.material.map = won ? pictures.won : pictures.lost;
      sheet.material.needsUpdate = true;
      // Its foot a little under the floor, about where the row stands.
      sheet.position.set(at.x, HIGH / 2 - HIGH * 0.2, at.z - BEHIND);
      scene.add(sheet);
    },
    hide() {
      sheet.removeFromParent();
    },
  };
}
