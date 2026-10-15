import { AdditiveBlending, type BufferGeometry, CanvasTexture, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, FrontSide, Group, Mesh, MeshBasicMaterial, RingGeometry, type Scene, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from 'three';

/*
 * What a skill draws on the field, made here of plain shapes: rings of light that spread across the
 * floor (a burst, a shockwave), crystals that come up out of the floor in a line and later burst,
 * columns of light that come down from the sky, bolts of light shooting from one place to another, rays of light
 * straight from one to another at once (a laser), pools that lie on the floor a while (a swamp), cages
 * of light that hold a hero a while, and fields that stand over the floor a while (a force field).
 */

const UP = new Vector3(0, 1, 0);

/** A pool takes this long to spread out, and to fade at the end. */
const POOL = { spread: 0.35, fade: 0.6 };

interface Pool {
  mesh: Mesh<CircleGeometry, MeshBasicMaterial>;
  t: number;
  life: number;
  size: number;
}

/**
 * A field: how long it takes to come up, and to fade at the end; how high its dome is (a share of how far it reaches);
 * how often a pulse spreads across it (seconds), and how long each takes; how fast the circle on the floor turns (radians a second).
 */
const FIELD = { rise: 0.45, fade: 0.5, high: 0.4, pulse: 1, pulseLife: 0.9, turn: 0.25 };

interface Field {
  root: Group;
  /** Its glow on the floor, the circle drawn on it, its edge, and its dome. */
  glow: Mesh<BufferGeometry, MeshBasicMaterial>;
  circle: Mesh<BufferGeometry, MeshBasicMaterial>;
  edge: Mesh<BufferGeometry, MeshBasicMaterial>;
  dome: Mesh<SphereGeometry, ShaderMaterial>;
  colour: number;
  radius: number;
  t: number;
  life: number;
  /** Toward its next pulse. */
  pulse: number;
}

/** A field's circle on the floor: rings, ticks round its rim, and two hexagons crossed at its middle, as a machine's dial is marked. */
function dial(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.translate(256, 256);
  g.strokeStyle = 'white';
  const circle = (r: number, width: number, from = 0, to = Math.PI * 2): void => {
    g.lineWidth = width;
    g.beginPath();
    g.arc(0, 0, r, from, to);
    g.stroke();
  };
  const hexagon = (r: number, turn: number, width: number): void => {
    g.lineWidth = width;
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = turn + (i * Math.PI) / 3;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke();
  };
  circle(240, 5);
  circle(226, 2);
  // Ticks round the rim, every sixth longer.
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const from = i % 6 ? 210 : 196;
    g.lineWidth = i % 6 ? 2 : 4;
    g.beginPath();
    g.moveTo(Math.cos(a) * from, Math.sin(a) * from);
    g.lineTo(Math.cos(a) * 222, Math.sin(a) * 222);
    g.stroke();
  }
  circle(180, 2);
  // A broken ring inside it: twelve arcs.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circle(162, 8, a + 0.06, a + Math.PI / 6 - 0.06);
  }
  hexagon(128, 0, 3);
  hexagon(128, Math.PI / 6, 2);
  circle(64, 3);
  circle(40, 2);
  return new CanvasTexture(canvas);
}

/** A field's dome: see-through, lit most at its rim, a honeycomb of light over it, and a band of light rising up it again and again. */
function domeMaterial(colour: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { colour: { value: new Color(colour) }, opacity: { value: 0 }, time: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 seen = modelViewMatrix * vec4(position, 1.0);
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-seen.xyz);
        gl_Position = projectionMatrix * seen;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      uniform float opacity;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        // The honeycomb: how near each point is to the edge of its cell (round the dome, and up it from the floor), thinning out toward the top.
        vec2 p = vec2(vUv.x * 72.0, (vUv.y - 0.5) * 30.0);
        vec2 r = vec2(1.0, 1.7320508);
        vec2 a = mod(p, r) - r * 0.5;
        vec2 b = mod(p - r * 0.5, r) - r * 0.5;
        vec2 q = abs(dot(a, a) < dot(b, b) ? a : b);
        float cell = max(dot(q, normalize(r)), q.x);
        float comb = smoothstep(0.4, 0.5, cell) * (1.0 - smoothstep(0.75, 0.98, vUv.y));
        // The band: up from the floor to the top, once a second and a half.
        float off = (vUv.y - 0.5 - fract(time / 1.5) * 0.5) * 28.0;
        float band = exp(-off * off);
        float light = 0.05 + pow(rim, 2.4) * 0.7 + comb * (0.12 + rim * 0.3) + band * 0.22;
        gl_FragColor = vec4(colour * light * opacity, 1.0);
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
}

/** A soft round spot, brightest at its rim, for a pool. */
function puddle(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, 'rgba(255,255,255,0.35)');
  glow.addColorStop(0.75, 'rgba(255,255,255,0.55)');
  glow.addColorStop(0.92, 'rgba(255,255,255,0.9)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** A cage of light: how tall, how wide, how many bars round it and hoops up it; how long it takes to come up, and to fade at the end. */
const CAGE = { tall: 3.4, wide: 0.95, bars: 10, hoops: 3, rise: 0.3, fade: 0.4 };

interface Cage {
  cage: Group;
  materials: MeshBasicMaterial[];
  /** Where whoever is in it stands, put in what it is given. */
  around: (into: Vector3) => Vector3;
  t: number;
  life: number;
}

/** A column of light: how tall, and how wide at most. */
const BEAM = { tall: 14, wide: 0.9 };

/** A bolt of light: how wide (its white core a share of that), and how much of its way its tail trails behind its head. */
const BOLT = { wide: 0.16, core: 0.4, trail: 0.45 };

interface Bolt {
  bolt: Group;
  materials: MeshBasicMaterial[];
  from: Vector3;
  to: Vector3;
  /** Seconds until it sets off. */
  wait: number;
  t: number;
  life: number;
}

/** A ray of light: how wide at most (its white core a share of that), and how much of its life it takes to flare to that. */
const RAY = { wide: 0.22, core: 0.35, flare: 0.15 };

interface Ray {
  ray: Group;
  materials: MeshBasicMaterial[];
  width: number;
  /** Seconds until it fires. */
  wait: number;
  t: number;
  life: number;
}

/** How long a crystal takes to come up, and to burst; and how long it stands if nothing bursts it. */
const RISE = 0.14;
const BURST = 0.32;
const STANDS = 4;

interface Ring {
  mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  t: number;
  life: number;
  size: number;
}

interface Beam {
  mesh: Mesh<CylinderGeometry, MeshBasicMaterial>;
  t: number;
  life: number;
  width: number;
  /** Seconds until it comes down. */
  wait: number;
}

interface Crystal {
  shard: Group;
  materials: MeshBasicMaterial[];
  /** Seconds until it starts to come up. */
  wait: number;
  t: number;
  tall: number;
  /** How long it has been bursting (null: it hasn't begun). */
  bursting: number | null;
}

export interface Magic {
  /** A ring that spreads over the floor from a place to `size` across, in `life` seconds. */
  ring(at: Vector3, colour: number, size: number, life: number): void;
  /** A column of light down out of the sky onto a place on the floor, `width` times as wide as most, gone in `life` seconds (`wait` seconds from now). */
  beam(at: Vector3, colour: number, life: number, width?: number, wait?: number): void;
  /** A bolt of light shooting from one place to another in `life` seconds, its tail trailing after it (`wait` seconds from now). */
  bolt(from: Vector3, to: Vector3, colour: number, life: number, wait?: number): void;
  /** A ray of light straight from one place to another at once, `width` times as wide as most: it flares and narrows away in `life` seconds (`wait` seconds from now). */
  ray(from: Vector3, to: Vector3, colour: number, life: number, width?: number, wait?: number): void;
  /** Crystals coming up in a line from a place to another, one after the next. */
  crystals(from: Vector3, to: Vector3): void;
  /** Every crystal standing bursts. */
  shatter(): void;
  /** A pool that spreads over the floor at a place to `size` across, and lies there `life` seconds before it fades. */
  pool(at: Vector3, colour: number, size: number, life: number): void;
  /** A cage of light round whoever stands where `around` says (it goes where they go), for `life` seconds. */
  cage(around: (into: Vector3) => Vector3, colour: number, life: number): void;
  /**
   * A field round a place, reaching `radius` out from it: a dial on the floor and a low dome of light over it, a pulse
   * spreading across it every second, there `life` seconds from when it comes up before it fades.
   */
  field(at: Vector3, colour: number, radius: number, life: number): void;
  update(dt: number): void;
}

export function makeMagic(scene: Scene): Magic {
  const rings = new Set<Ring>();
  const crystals = new Set<Crystal>();
  const beams = new Set<Beam>();
  const pools = new Set<Pool>();
  const disc = new CircleGeometry(0.5, 48);
  const spot = puddle();
  const flat = new RingGeometry(0.78, 1, 64);
  const spike = new ConeGeometry(0.34, 1, 5);
  spike.translate(0, 0.5, 0);
  // Open at both ends, standing on the floor.
  const column = new CylinderGeometry(0.5, 0.5, 1, 24, 1, true);
  column.translate(0, 0.5, 0);
  const cages = new Set<Cage>();
  const where = new Vector3();
  const towards = new Vector3();
  // A bolt's rod: up its length, about its middle.
  const bolts = new Set<Bolt>();
  const rod = new CylinderGeometry(0.5, 0.5, 1, 8, 1, true);
  const rays = new Set<Ray>();
  // A cage's bars (standing on the floor), its hoops (lying flat), and the faint glow filling it.
  const bar = new CylinderGeometry(0.035, 0.035, 1, 6, 1, true);
  bar.translate(0, 0.5, 0);
  const hoop = new TorusGeometry(1, 0.04, 6, 48);
  hoop.rotateX(Math.PI / 2);
  const inside = new CylinderGeometry(1, 1, 1, 32, 1, true);
  inside.translate(0, 0.5, 0);
  // A field's dial, its thin edge, and its dome (a ball, its lower half under the floor and out of sight).
  const fields = new Set<Field>();
  const marked = dial();
  const thin = new RingGeometry(0.975, 1, 96);
  const ball = new SphereGeometry(1, 64, 32);

  const ring = (at: Vector3, colour: number, size: number, life: number): void => {
    const mesh = new Mesh(flat, new MeshBasicMaterial({ color: colour, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at.x, 0.06, at.z);
    mesh.scale.setScalar(0.01);
    mesh.renderOrder = 8;
    scene.add(mesh);
    rings.add({ mesh, t: 0, life, size });
  };

  return {
    field(at, colour, radius, life) {
      const root = new Group();
      root.position.set(at.x, 0, at.z);
      const lying = (geometry: BufferGeometry, material: MeshBasicMaterial, y: number, order: number): Mesh<BufferGeometry, MeshBasicMaterial> => {
        const mesh = new Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = y;
        mesh.renderOrder = order;
        root.add(mesh);
        return mesh;
      };
      const lit = (map?: CanvasTexture): MeshBasicMaterial => new MeshBasicMaterial({ color: colour, map, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
      // Under the rings and the pools, so they show over it.
      const glow = lying(disc, lit(spot), 0.03, 6);
      const circle = lying(disc, lit(marked), 0.035, 6);
      const edge = lying(thin, lit(), 0.05, 7);
      const dome = new Mesh(ball, domeMaterial(colour));
      dome.renderOrder = 9;
      root.add(dome);
      scene.add(root);
      fields.add({ root, glow, circle, edge, dome, colour, radius, t: 0, life, pulse: 0 });
    },
    cage(around, colour, life) {
      const cage = new Group();
      const bright = new MeshBasicMaterial({ color: colour, transparent: true, blending: AdditiveBlending, depthWrite: false });
      const faint = new MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
      for (let i = 0; i < CAGE.bars; i++) {
        const turn = (i / CAGE.bars) * Math.PI * 2;
        const one = new Mesh(bar, bright);
        one.position.set(Math.cos(turn) * CAGE.wide, 0, Math.sin(turn) * CAGE.wide);
        one.scale.y = CAGE.tall;
        cage.add(one);
      }
      // Hoops at the floor, the top, and between: the gaps between bars and hoops left wide, as a birdcage's.
      for (let i = 0; i < CAGE.hoops; i++) {
        const one = new Mesh(hoop, bright);
        one.position.y = (i / (CAGE.hoops - 1)) * CAGE.tall;
        one.scale.setScalar(CAGE.wide);
        cage.add(one);
      }
      const glow = new Mesh(inside, faint);
      glow.scale.set(CAGE.wide, CAGE.tall, CAGE.wide);
      cage.add(glow);
      cage.position.copy(around(where).setY(0));
      cage.scale.set(1, 0.001, 1);
      cage.renderOrder = 8;
      scene.add(cage);
      cages.add({ cage, materials: [bright, faint], around, t: 0, life });
    },
    beam(at, colour, life, width = 1, wait = 0) {
      const mesh = new Mesh(column, new MeshBasicMaterial({ color: colour, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
      mesh.position.set(at.x, 0, at.z);
      mesh.scale.set(0.01, BEAM.tall, 0.01);
      mesh.renderOrder = 8;
      mesh.visible = wait <= 0;
      scene.add(mesh);
      beams.add({ mesh, t: 0, life, width, wait });
    },
    bolt(from, to, colour, life, wait = 0) {
      // A white core inside a glow of its colour.
      const bolt = new Group();
      const materials = [colour, 0xffffff].map((tint) => new MeshBasicMaterial({ color: tint, transparent: true, blending: AdditiveBlending, depthWrite: false }));
      materials.forEach((material, i) => {
        const part = new Mesh(rod, material);
        part.scale.set(i ? BOLT.core : 1, 1, i ? BOLT.core : 1);
        bolt.add(part);
      });
      bolt.visible = false;
      bolt.renderOrder = 9;
      scene.add(bolt);
      bolts.add({ bolt, materials, from: from.clone(), to: to.clone(), wait, t: 0, life });
    },
    ray(from, to, colour, life, width = 1, wait = 0) {
      // A white core inside a glow of its colour, its whole length from the first.
      const ray = new Group();
      const materials = [colour, 0xffffff].map((tint) => new MeshBasicMaterial({ color: tint, transparent: true, blending: AdditiveBlending, depthWrite: false }));
      materials.forEach((material, i) => {
        const part = new Mesh(rod, material);
        part.scale.set(i ? RAY.core : 1, 1, i ? RAY.core : 1);
        ray.add(part);
      });
      ray.position.lerpVectors(from, to, 0.5);
      ray.quaternion.setFromUnitVectors(UP, towards.subVectors(to, from).normalize());
      ray.scale.set(0.001, Math.max(from.distanceTo(to), 0.001), 0.001);
      ray.visible = wait <= 0;
      ray.renderOrder = 9;
      scene.add(ray);
      rays.add({ ray, materials, width, wait, t: 0, life });
    },
    ring,
    crystals(from, to) {
      const COUNT = 8;
      for (let i = 0; i < COUNT; i++) {
        const k = (i + 0.6) / COUNT;
        // Each is a cluster: a tall shard and two smaller leaning out from it.
        const shard = new Group();
        const materials: MeshBasicMaterial[] = [];
        [
          { lean: 0, turn: 0, size: 1 },
          { lean: 0.5, turn: 1.1, size: 0.6 },
          { lean: -0.45, turn: 2.9, size: 0.5 },
        ].forEach((part, n) => {
          const material = new MeshBasicMaterial({ color: n === 0 ? 0xff3b6b : 0xc2184a, transparent: true });
          const cone = new Mesh(spike, material);
          cone.rotation.set(part.lean, part.turn, part.lean * 0.6);
          cone.scale.setScalar(part.size);
          materials.push(material);
          shard.add(cone);
        });
        shard.position.set(from.x + (to.x - from.x) * k, 0, from.z + (to.z - from.z) * k + (i % 2 ? 0.5 : -0.5));
        shard.rotation.y = i * 1.7;
        shard.scale.set(1, 0.001, 1);
        scene.add(shard);
        crystals.add({ shard, materials, wait: i * 0.045, t: 0, tall: 1.6 + (i % 3) * 0.55 + k * 0.8, bursting: null });
      }
    },
    shatter() {
      for (const crystal of crystals) crystal.bursting ??= 0;
    },
    pool(at, colour, size, life) {
      const mesh = new Mesh(disc, new MeshBasicMaterial({ color: colour, map: spot, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      // Just under the rings, so they show over it.
      mesh.position.set(at.x, 0.04, at.z);
      mesh.scale.setScalar(0.01);
      mesh.renderOrder = 7;
      scene.add(mesh);
      pools.add({ mesh, t: 0, life, size });
    },
    update(dt) {
      // A field: its dial spreading over the floor and its dome rising out of it, a pulse across it every second and a slow
      // turn of its dial while it stands, and faded at the end.
      for (const field of fields) {
        field.t += dt;
        const { glow, circle, edge, dome, radius, t, life } = field;
        const k = 1 - (1 - Math.min(1, t / FIELD.rise)) ** 3;
        const shown = Math.min(1, Math.max(0, (life - t) / FIELD.fade)) * Math.min(1, t / FIELD.rise);
        const breath = 1 + Math.sin(t * 2.4) * 0.08;
        glow.scale.setScalar(Math.max(0.01, 2 * radius * k));
        circle.scale.setScalar(Math.max(0.01, 2 * radius * k));
        circle.rotation.z = t * FIELD.turn;
        edge.scale.setScalar(Math.max(0.01, radius * k));
        dome.scale.set(Math.max(0.01, radius * k), Math.max(0.01, radius * FIELD.high * k), Math.max(0.01, radius * k));
        glow.material.opacity = 0.3 * shown * breath;
        circle.material.opacity = 0.55 * shown * breath;
        edge.material.opacity = 0.9 * shown;
        (dome.material.uniforms.opacity as { value: number }).value = shown;
        (dome.material.uniforms.time as { value: number }).value = t;
        if (t >= FIELD.rise && t < life - FIELD.fade) {
          field.pulse += dt;
          if (field.pulse >= FIELD.pulse) {
            field.pulse -= FIELD.pulse;
            ring(field.root.position, field.colour, radius * 2, FIELD.pulseLife);
          }
        }
        if (t >= life) {
          scene.remove(field.root);
          for (const mesh of [glow, circle, edge, dome]) mesh.material.dispose();
          fields.delete(field);
        }
      }
      // A cage: up out of the floor round whoever is in it, a slow turn and a shimmer while it holds them, and faded at the end.
      for (const cage of cages) {
        cage.t += dt;
        const k = Math.min(1, cage.t / CAGE.rise);
        cage.cage.scale.set(1, Math.max(0.001, 1 - (1 - k) ** 3), 1);
        cage.cage.position.copy(cage.around(where).setY(0));
        cage.cage.rotation.y = cage.t * 0.5;
        const fading = Math.min(1, Math.max(0, (cage.life - cage.t) / CAGE.fade));
        const [bright, faint] = cage.materials as [MeshBasicMaterial, MeshBasicMaterial];
        bright.opacity = (0.8 + Math.sin(cage.t * 5) * 0.15) * fading;
        faint.opacity = 0.12 * fading;
        if (cage.t >= cage.life) {
          scene.remove(cage.cage);
          for (const material of cage.materials) material.dispose();
          cages.delete(cage);
        }
      }
      // A pool: out over the floor, a slow churn while it lies there, and faded at the end.
      for (const pool of pools) {
        pool.t += dt;
        const k = Math.min(1, pool.t / POOL.spread);
        pool.mesh.scale.setScalar(pool.size * (1 - (1 - k) ** 3));
        pool.mesh.rotation.z = pool.t * 0.4;
        const fading = Math.min(1, Math.max(0, (pool.life - pool.t) / POOL.fade));
        pool.mesh.material.opacity = (0.75 + Math.sin(pool.t * 3) * 0.15) * fading;
        if (pool.t >= pool.life) {
          scene.remove(pool.mesh);
          pool.mesh.material.dispose();
          pools.delete(pool);
        }
      }
      // A bolt: its head shooting along its way, its tail following it there, and gone when the tail arrives.
      for (const bolt of bolts) {
        if (bolt.wait > 0) {
          bolt.wait -= dt;
          continue;
        }
        bolt.t += dt;
        const k = bolt.t / bolt.life;
        const head = Math.min(1, k);
        const tail = Math.min(1, Math.max(0, k - BOLT.trail));
        if (tail >= 1) {
          scene.remove(bolt.bolt);
          for (const material of bolt.materials) material.dispose();
          bolts.delete(bolt);
          continue;
        }
        const a = where.lerpVectors(bolt.from, bolt.to, tail);
        const b = towards.lerpVectors(bolt.from, bolt.to, head);
        bolt.bolt.position.lerpVectors(a, b, 0.5);
        const long = a.distanceTo(b);
        bolt.bolt.quaternion.setFromUnitVectors(UP, b.sub(a).normalize());
        bolt.bolt.scale.set(BOLT.wide, Math.max(long, 0.001), BOLT.wide);
        bolt.bolt.visible = long > 0;
        for (const material of bolt.materials) material.opacity = 0.95 * (1 - tail) ** 0.5;
      }
      // A ray: there at once, flaring to its width, then narrowing to nothing as it fades.
      for (const ray of rays) {
        if (ray.wait > 0) {
          ray.wait -= dt;
          ray.ray.visible = ray.wait <= 0;
          continue;
        }
        ray.t += dt;
        const k = Math.min(1, ray.t / ray.life);
        const wide = RAY.wide * ray.width * (k < RAY.flare ? k / RAY.flare : 1 - (k - RAY.flare) / (1 - RAY.flare));
        ray.ray.scale.x = ray.ray.scale.z = Math.max(wide, 0.001);
        for (const material of ray.materials) material.opacity = 0.95 * (1 - k) ** 0.6;
        if (k >= 1) {
          scene.remove(ray.ray);
          for (const material of ray.materials) material.dispose();
          rays.delete(ray);
        }
      }
      // A column of light: down at once, wide, then narrowing as it fades.
      for (const beam of beams) {
        if (beam.wait > 0) {
          beam.wait -= dt;
          beam.mesh.visible = beam.wait <= 0;
          continue;
        }
        beam.t += dt;
        const k = Math.min(1, beam.t / beam.life);
        const wide = BEAM.wide * beam.width * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) * 0.8);
        beam.mesh.scale.set(wide, BEAM.tall, wide);
        beam.mesh.material.opacity = 0.85 * (1 - k) ** 1.2;
        if (k >= 1) {
          scene.remove(beam.mesh);
          beam.mesh.material.dispose();
          beams.delete(beam);
        }
      }
      for (const ring of rings) {
        ring.t += dt;
        const k = Math.min(1, ring.t / ring.life);
        ring.mesh.scale.setScalar((1 - (1 - k) ** 2) * ring.size * 0.5);
        ring.mesh.material.opacity = (1 - k) ** 1.5;
        if (k >= 1) {
          scene.remove(ring.mesh);
          ring.mesh.material.dispose();
          rings.delete(ring);
        }
      }
      for (const crystal of crystals) {
        if (crystal.wait > 0) {
          crystal.wait -= dt;
          continue;
        }
        crystal.t += dt;
        if (crystal.bursting === null && crystal.t >= STANDS) crystal.bursting = 0;
        if (crystal.bursting === null) {
          // Up out of the floor, a little past its height and back.
          const k = Math.min(1, crystal.t / RISE);
          crystal.shard.scale.set(1, crystal.tall * (k + Math.sin(k * Math.PI) * 0.25), 1);
          continue;
        }
        crystal.bursting += dt;
        const k = Math.min(1, crystal.bursting / BURST);
        // Bursting: white, swelling, and gone.
        crystal.shard.scale.set(1 + k * 0.9, crystal.tall * (1 + k * 0.5), 1 + k * 0.9);
        for (const material of crystal.materials) {
          material.color.setRGB(1, 0.3 + (1 - k) * 0.7, 0.45 + (1 - k) * 0.55);
          material.opacity = 1 - k;
        }
        if (k >= 1) {
          scene.remove(crystal.shard);
          for (const material of crystal.materials) material.dispose();
          crystals.delete(crystal);
        }
      }
    },
  };
}
