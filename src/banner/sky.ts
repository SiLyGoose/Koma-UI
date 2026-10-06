/*
 * The wish's night sky, drawn on a canvas: stars twinkling, and the falling star, as Genshin's. It comes
 * in from past the left edge, far off, small and silver-white, and arcs over the sky and down to the
 * right of the middle (about 4.6s), speeding up as it falls. It swells gradually as it nears, to about
 * 3.5 times its size, at its biggest half a second before it catches the colour, then eases back a
 * little as it falls away, with a tapering tail, a glint across its head and sparks shed behind it. Part way down it
 * catches the colour of the best item pulled (as the bot's shooting star does in Discord: its
 * constants/items/gacha.ts GACHA_ANIMATION), and where it lands a bloom of that colour spreads over the
 * sky, for the flash (wish.css) to take over. A multi pull sends a few small silver stars along with it.
 */

type Rgb = readonly [number, number, number];
interface Point {
  x: number;
  y: number;
}

/** The star's colour before it catches the item's. */
const SILVER: Rgb = [226, 233, 255];
/** How far through its fall (0 to 1) the star catches the item's colour, and how long that takes. */
const IGNITE_AT = 0.4;
const IGNITE_SPAN = 0.14;
/** How long the falls take, in ms. */
const FALL_MS = 4600;
const COMPANION_MS = 3800;
/** How long before it catches the colour the star is at its biggest, in ms. */
const PEAK_LEAD_MS = 500;
/** How many times its size as it comes in the star swells to at its biggest. */
const GROWTH = 7;
/** How long the bloom where it lands takes to cover the sky, in ms. */
const BLOOM_MS = 800;
/** How much of its path the tail covers, and how many pieces it's drawn in. */
const TAIL = 0.26;
const TAIL_PIECES = 34;
const SKY_STARS = 170;

interface Meteor {
  /** When it starts (performance.now()), and how long it takes. */
  start: number;
  duration: number;
  /** Its path, a curve from `from` through `bend` to `to`, in shares of the canvas. */
  from: Point;
  bend: Point;
  to: Point;
  /** The colour it catches (null: it stays silver). */
  color: Rgb | null;
  /** Its head's size as it comes in, in CSS pixels (it swells to GROWTH times that). */
  size: number;
  /** A companion fades out before it lands; the star itself lands. */
  companion: boolean;
  landed?: () => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  color: Rgb;
}

/** '#ff4a5a' as [255, 74, 90]. */
export function rgb(hex: string): Rgb {
  const n = parseInt(hex.trim().replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: Rgb, alpha: number): string => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${Math.max(0, Math.min(1, alpha))})`;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
/** Falling: steady while it's far off, then faster and faster. */
const fall = (t: number): number => 0.45 * t + 0.55 * t * t;
/** When (as a share of its fall's time) it catches the colour: where fall() reaches IGNITE_AT. */
const IGNITE_T = (-0.45 + Math.sqrt(0.45 ** 2 + 4 * 0.55 * IGNITE_AT)) / (2 * 0.55);
/** When it's at its biggest: PEAK_LEAD_MS before that. */
const PEAK_T = IGNITE_T - PEAK_LEAD_MS / FALL_MS;
/** Smoothly from 0 to 1 as `k` goes from 0 to 1. */
const smooth = (k: number): number => k * k * (3 - 2 * k);
/**
 * How many times its size as it comes in the star is, `t` of the way through its fall's time: swelling
 * gradually from far off to GROWTH at PEAK_T, then easing back a little as it falls away to the ground.
 */
const growth = (t: number): number =>
  t <= PEAK_T ? 1 + (GROWTH - 1) * smooth(t / PEAK_T) : GROWTH - 0.5 * ((t - PEAK_T) / (1 - PEAK_T)) ** 2;

const along = (m: Meteor, p: number, w: number, h: number): Point => {
  const q = 1 - p;
  return {
    x: (q * q * m.from.x + 2 * q * p * m.bend.x + p * p * m.to.x) * w,
    y: (q * q * m.from.y + 2 * q * p * m.bend.y + p * p * m.to.y) * h,
  };
};

/** The star's colour `p` of the way through its fall. */
const colorAt = (m: Meteor, p: number): Rgb => (m.color ? mix(SILVER, m.color, clamp01((p - IGNITE_AT) / IGNITE_SPAN)) : SILVER);

export interface Sky {
  /**
   * Sends the star down: done as it lands, when its bloom starts spreading. `color` is the best item's
   * tier colour; `companions` how many small silver stars come along.
   */
  fall(color: string, companions: number): Promise<void>;
  /** Stops drawing, and clears the canvas. */
  stop(): void;
}

/** Starts the night sky in `canvas` (sized to it, and kept so as the window changes). */
export function startSky(canvas: HTMLCanvasElement): Sky {
  const g = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  const resize = (): void => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: SKY_STARS }, () => ({
    x: Math.random(),
    // More near the top, as the sky's darkest there.
    y: Math.random() ** 1.4,
    r: 0.4 + Math.random() * 1.1,
    phase: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 1.8,
  }));
  const meteors: Meteor[] = [];
  const sparks: Spark[] = [];
  let bloom: { at: Point; start: number; color: Rgb } | null = null;
  let last = performance.now();
  let frame = 0;

  const drawStars = (now: number): void => {
    if (!g) return;
    for (const s of stars) {
      const alpha = 0.3 + 0.45 * (0.5 + 0.5 * Math.sin(s.phase + (now / 1000) * s.speed));
      g.fillStyle = `rgb(235 238 255 / ${alpha})`;
      g.beginPath();
      g.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      g.fill();
    }
  };

  const drawMeteor = (m: Meteor, now: number, dt: number): boolean => {
    if (!g) return false;
    const t = (now - m.start) / m.duration;
    if (t < 0) return true;
    const p = fall(Math.min(1, t));
    // A companion fades as it nears the end, and is gone before it would land.
    const fade = m.companion ? 1 - clamp01((p - 0.62) / 0.3) : 1;
    if (fade <= 0) return false;
    const color = colorAt(m, p);
    const lit = m.color ? clamp01((p - IGNITE_AT) / IGNITE_SPAN) : 0;
    // Far off at first, nearer and bigger as it falls.
    const size = m.size * growth(Math.min(1, t));
    const head = along(m, p, w, h);

    // The tail: pieces along the path behind the head, thinner and fainter towards its end, each a
    // wide soft glow under a bright core.
    let prev = head;
    for (let i = 1; i <= TAIL_PIECES; i++) {
      const k = i / TAIL_PIECES;
      const q = p - TAIL * k * (0.55 + 0.45 * p);
      if (q < 0) break;
      const point = along(m, q, w, h);
      const tint = colorAt(m, q);
      const left = (1 - k) ** 1.6;
      g.lineCap = 'round';
      g.strokeStyle = css(tint, 0.16 * left * fade);
      g.lineWidth = size * 4.2 * left + 1;
      g.beginPath();
      g.moveTo(prev.x, prev.y);
      g.lineTo(point.x, point.y);
      g.stroke();
      g.strokeStyle = css(mix(tint, [255, 255, 255], 0.55 * (1 - k)), 0.9 * left * fade);
      g.lineWidth = size * 1.1 * left + 0.4;
      g.stroke();
      prev = point;
    }

    // Its glow: wide and soft, brightening once it has caught the colour (it grows no bigger for it).
    const glow = g.createRadialGradient(head.x, head.y, 0, head.x, head.y, size * 16);
    glow.addColorStop(0, css(color, (0.18 + 0.22 * lit) * fade));
    glow.addColorStop(1, css(color, 0));
    g.fillStyle = glow;
    g.beginPath();
    g.arc(head.x, head.y, size * 16, 0, Math.PI * 2);
    g.fill();

    // The head: white-hot in the middle, its colour around it.
    const halo = g.createRadialGradient(head.x, head.y, 0, head.x, head.y, size * 7);
    halo.addColorStop(0, css([255, 255, 255], fade));
    halo.addColorStop(0.16, css(mix(color, [255, 255, 255], 0.5), 0.85 * fade));
    halo.addColorStop(0.42, css(color, 0.3 * fade));
    halo.addColorStop(1, css(color, 0));
    g.fillStyle = halo;
    g.beginPath();
    g.arc(head.x, head.y, size * 7, 0, Math.PI * 2);
    g.fill();

    // The glint: a thin cross of light through the head, turning slowly.
    const reach = size * (9 + 6 * lit);
    const turn = now / 900;
    for (const angle of [turn, turn + Math.PI / 2]) {
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach;
      const beam = g.createLinearGradient(head.x - dx, head.y - dy, head.x + dx, head.y + dy);
      beam.addColorStop(0, css(color, 0));
      beam.addColorStop(0.5, css([255, 255, 255], 0.9 * fade));
      beam.addColorStop(1, css(color, 0));
      g.strokeStyle = beam;
      g.lineWidth = Math.max(1.4, size * 0.12);
      g.beginPath();
      g.moveTo(head.x - dx, head.y - dy);
      g.lineTo(head.x + dx, head.y + dy);
      g.stroke();
    }

    // Sparks shed behind it, more once it's lit.
    if (t < 1) {
      const back = along(m, Math.max(0, p - 0.01), w, h);
      const n = Math.round((dt / 16) * (m.companion ? 1 : 2 + 3 * lit));
      for (let i = 0; i < n; i++) {
        sparks.push({
          x: head.x,
          y: head.y,
          vx: (back.x - head.x) * 0.12 + (Math.random() - 0.5) * (1 + size * 0.1),
          vy: (back.y - head.y) * 0.12 + (Math.random() - 0.5) * (1 + size * 0.1) + 0.2,
          born: now,
          life: 450 + Math.random() * 650,
          size: Math.max(0.6, size * (0.1 + Math.random() * 0.25)),
          color: Math.random() < 0.4 ? [255, 255, 255] : color,
        });
      }
    }

    if (t >= 1) {
      if (!m.companion) {
        bloom = { at: head, start: now, color: m.color ?? SILVER };
        m.landed?.();
      }
      return false;
    }
    return true;
  };

  const draw = (now: number): void => {
    frame = requestAnimationFrame(draw);
    if (!g) return;
    const dt = Math.min(50, now - last);
    last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    drawStars(now);
    g.globalCompositeOperation = 'lighter';

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i] as Spark;
      const age = (now - s.born) / s.life;
      if (age >= 1) {
        sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * (dt / 16);
      s.y += s.vy * (dt / 16);
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.02;
      g.fillStyle = css(s.color, (1 - age) ** 1.5);
      g.beginPath();
      g.arc(s.x, s.y, s.size * (1 - age * 0.5), 0, Math.PI * 2);
      g.fill();
    }

    for (let i = meteors.length - 1; i >= 0; i--) if (!drawMeteor(meteors[i] as Meteor, now, dt)) meteors.splice(i, 1);

    if (bloom) {
      const k = clamp01((now - bloom.start) / BLOOM_MS);
      const r = Math.hypot(w, h) * 1.2 * (1 - (1 - k) ** 3);
      const glow = g.createRadialGradient(bloom.at.x, bloom.at.y, 0, bloom.at.x, bloom.at.y, Math.max(1, r));
      glow.addColorStop(0, css([255, 255, 255], 1));
      glow.addColorStop(0.25, css(mix(bloom.color, [255, 255, 255], 0.35), 0.9));
      glow.addColorStop(1, css(bloom.color, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
    }
  };
  frame = requestAnimationFrame(draw);

  return {
    fall(color, companions) {
      const now = performance.now();
      bloom = null;
      return new Promise<void>((resolve) => {
        meteors.push({
          start: now,
          duration: FALL_MS,
          from: { x: -0.08, y: 0.2 },
          bend: { x: 0.4, y: 0.04 },
          to: { x: 0.66, y: 0.55 },
          color: rgb(color),
          size: 2,
          companion: false,
          landed: resolve,
        });
        for (let i = 0; i < companions; i++) {
          const dx = (i % 2 ? -1 : 1) * (0.06 + 0.05 * i);
          const dy = -0.04 - 0.05 * i;
          meteors.push({
            start: now + 140 + 170 * i,
            duration: COMPANION_MS,
            from: { x: -0.1 + dx * 0.5, y: 0.2 + dy },
            bend: { x: 0.36 + dx, y: 0.06 + dy },
            to: { x: 0.6 + dx, y: 0.5 + dy },
            color: null,
            size: 0.9,
            companion: true,
          });
        }
      });
    },
    stop() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      meteors.length = 0;
      sparks.length = 0;
      bloom = null;
      g?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
