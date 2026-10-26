// A small player for King's Raid's own effects, as KR-extracted/scripts/kr-vfx-convert.py converts them (format "kr-vfx/1",
// KR-extracted/vfx-report.md; pictures as WebP: KR-extracted/scripts/tm-vfx.mjs). Played by ./kr-effects.ts.
//
//   const asset = await loadKrEffect('converted/Effect.Common.HealBig.json', 'converted/');
//   const fx = new KrEffect(asset, { findNode: (bone) => hero.getObjectByName(bone) });
//   fx.position.copy(heroFeet); scene.add(fx);
//   each frame: fx.update(dt, camera); if (fx.done) scene.remove(fx), fx.dispose(); (its geometry: see dispose())
//
// What it plays: the effect's models (meshes and rigidly skinned meshes moved by their legacy clip, with each
// renderer's alpha / colour / UV curves from the effect's definition) and its particle systems (CPU simulated: start
// lifetime/speed/size/rotation/colour, rate and bursts, the common shapes, gravity, size/colour/rotation/velocity over
// lifetime, force, limit velocity, texture sheets; drawn as billboards, stretched billboards, horizontal or vertical
// billboards, or meshes) and its trails (ribbons behind what moves: Trail). Not played: sub-emitters, collision, noise (a
// little jitter only) and other ShaderForge extras (drawn as the plain effect shader, but for its dissolve).
//
// Colours are kept as the game had them (gamma: textures not decoded from sRGB, shader output not encoded), so additive
// effects blend as they did in King's Raid.
import {
  BufferAttribute, BufferGeometry, CustomBlending, DoubleSide, FrontSide, BackSide, Group, Matrix4, Mesh, Object3D,
  Quaternion, ShaderMaterial, Skeleton, SkinnedMesh, Bone, TextureLoader, Vector3, Vector4, AddEquation,
  ZeroFactor, OneFactor, DstColorFactor, SrcColorFactor, OneMinusDstColorFactor, SrcAlphaFactor, OneMinusSrcColorFactor,
  DstAlphaFactor, OneMinusDstAlphaFactor, SrcAlphaSaturateFactor, OneMinusSrcAlphaFactor, RepeatWrapping, NoColorSpace,
  DataTexture,
} from 'three';

const FACTORS = [ZeroFactor, OneFactor, DstColorFactor, SrcColorFactor, OneMinusDstColorFactor, SrcAlphaFactor,
  OneMinusSrcColorFactor, DstAlphaFactor, OneMinusDstAlphaFactor, SrcAlphaSaturateFactor, OneMinusSrcAlphaFactor];
const GRAVITY = 9.81;

// ---------- loading ----------

/** Loads a converted effect and its pictures (`base`: where textures/ is). */
export async function loadKrEffect(url, base = url.replace(/[^/]*$/, ''), loader = new TextureLoader()) {
  const def = await (await fetch(url)).json();
  const textures = await Promise.all(def.textures.map((name) => loader.loadAsync(`${base}textures/${encodeURIComponent(name)}.webp`).then((t) => {
    t.colorSpace = NoColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  })));
  return makeAsset(def, textures);
}

/** The same from a parsed definition and its textures (in def.textures' order), e.g. in tests. */
export function makeAsset(def, textures) {
  const geometries = def.meshes.map((m) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(m.pos), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(m.uv ?? new Array((m.pos.length / 3) * 2).fill(0)), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(m.col ?? new Array((m.pos.length / 3) * 4).fill(1)), 4));
    if (m.nrm) g.setAttribute('normal', new BufferAttribute(new Float32Array(m.nrm), 3));
    g.setIndex(m.idx);
    if (m.bone) {
      const n = m.pos.length / 3;
      const idx = new Uint16Array(n * 4), w = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { idx[i * 4] = m.bone[i] ?? 0; w[i * 4] = 1; }
      g.setAttribute('skinIndex', new BufferAttribute(idx, 4));
      g.setAttribute('skinWeight', new BufferAttribute(w, 4));
    }
    return g;
  });
  return { def, textures, geometries };
}

// ---------- the effect shader ----------

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec4 color;
varying vec2 vUv;
varying vec2 vDissolveUv;
varying vec4 vColor;
varying float vRim;
uniform vec4 st;
uniform vec4 dissolveSt;
uniform float rim;
void main() {
  vUv = uv * st.xy + st.zw;
  vDissolveUv = uv * dissolveSt.xy + dissolveSt.zw;
  vColor = color;
  vec3 transformed = position;
  #include <skinbase_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vRim = 1.0;
  #ifdef USE_RIM
  vec3 n = normalize(normalMatrix * normal);
  vRim = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), rim);
  #endif
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec4 tint;
uniform float power;
uniform float extraAlpha;
uniform float premultiply;
uniform sampler2D dissolveMap;
varying vec2 vUv;
varying vec2 vDissolveUv;
varying vec4 vColor;
varying float vRim;
void main() {
  vec4 t = texture2D(map, vUv);
  vec3 rgb = t.rgb * tint.rgb * vColor.rgb * power * vRim;
  float a = clamp(t.a * tint.a * vColor.a * extraAlpha * vRim, 0.0, 1.0);
  #ifdef USE_DISSOLVE
  // (ShaderForge's dissolve: eaten away by its picture as its alpha falls.)
  float d = 1.0 - texture2D(dissolveMap, vDissolveUv).r;
  a *= smoothstep(d - 0.2, d, tint.a * vColor.a);
  #endif
  gl_FragColor = vec4(premultiply > 0.5 ? rgb * a : rgb, a);
}`;

/** What a material with no picture of its own is drawn with: white, as Unity's effect shaders take a missing one (Gremory's sleep, plain particles drawn in their colour). */
const WHITE = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

function makeMaterial(asset, index, skinning = false) {
  const m = asset.def.materials[index];
  const [src, dst] = m.blend;
  // Opaque (One, Zero: a model drawn as the heroes are, Gremory's servants): as solid as they are, hiding what is behind.
  const opaque = src === 1 && dst === 0;
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      map: { value: m.tex == null ? WHITE : asset.textures[m.tex] },
      tint: { value: new Vector4(...m.color) },
      power: { value: m.power },
      extraAlpha: { value: m.alpha },
      premultiply: { value: src === 5 || opaque ? 0 : 1 },
      st: { value: new Vector4(...(m.st ?? [1, 1, 0, 0])) },
      rim: { value: m.rim ?? 1 },
      dissolveMap: { value: m.dissolve ? asset.textures[m.dissolve.tex] : WHITE },
      dissolveSt: { value: new Vector4(...(m.dissolve?.st ?? [1, 1, 0, 0])) },
    },
    transparent: !opaque,
    depthWrite: opaque,
    depthTest: m.depthTest,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: FACTORS[src] ?? SrcAlphaFactor,
    blendDst: FACTORS[dst] ?? OneMinusSrcAlphaFactor,
    side: m.cull === 2 ? FrontSide : m.cull === 1 ? BackSide : DoubleSide,
  });
  material.defines = {};
  if (skinning) material.defines.USE_SKINNING = '';
  if (m.rim != null && !skinning) material.defines.USE_RIM = '';
  if (m.dissolve) material.defines.USE_DISSOLVE = '';
  material.userData.base = { color: [...m.color], st: [...(m.st ?? [1, 1, 0, 0])], dissolveSt: [...(m.dissolve?.st ?? [1, 1, 0, 0])], scroll: m.scroll };
  // One in an earlier queue than the fighters' (a map's own: its smoke behind its far rim): drawn among the map's layers,
  // in its queue's place (../engine/kr-map.ts), before the fighters.
  if (m.queue != null && m.queue < 2500) {
    material.transparent = false;
    material.userData.order = m.queue - 10000;
  }
  return material;
}

// ---------- curves ----------

const rnd = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;
function sampleLut(l, t) {
  const x = Math.min(Math.max(t, 0), 1) * (l.length - 1);
  const i = Math.min(Math.floor(x), l.length - 2);
  return lerp(l[i], l[i + 1], x - i);
}
/** A MinMaxCurve at t (0..1) for a particle whose random is r. */
function curve(c, t = 0, r = rnd()) {
  if (!c) return 0;
  if (c.c !== undefined) return c.c;
  if (c.r) return lerp(c.r[0], c.r[1], r);
  if (c.l2) return lerp(sampleLut(c.l2, t), sampleLut(c.l, t), r);
  return sampleLut(c.l, t);
}
function gradientAt(g, t, out) {
  const cs = g.c, as = g.a;
  const pick = (keys, n) => {
    if (!keys.length) return n === 3 ? [1, 1, 1] : [1];
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        if (g.fixed) return keys[i].slice(1);
        const k = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0] || 1);
        return keys[i].slice(1).map((v, j) => lerp(keys[i - 1][j + 1], v, k));
      }
    }
    return keys[keys.length - 1].slice(1);
  };
  const [r, gg, b] = pick(cs, 3), [a] = pick(as, 1);
  out[0] = r; out[1] = gg; out[2] = b; out[3] = a;
  return out;
}
/** A MinMaxGradient at t for a particle whose random is r (into out, rgba). */
function colour(g, t, r, out) {
  if (!g) { out.fill(1); return out; }
  if (g.c) { out[0] = g.c[0]; out[1] = g.c[1]; out[2] = g.c[2]; out[3] = g.c[3]; return out; }
  if (g.r) { for (let i = 0; i < 4; i++) out[i] = lerp(g.r[0][i], g.r[1][i], r); return out; }
  if (g.pick) return gradientAt(g.pick, r, out);
  gradientAt(g.g, t, out);
  if (g.g2) { const o = gradientAt(g.g2, t, [0, 0, 0, 0]); for (let i = 0; i < 4; i++) out[i] = lerp(o[i], out[i], r); }
  return out;
}

// ---------- prefab instances ----------

function buildPrefab(asset, index, materials) {
  const prefab = asset.def.prefabs[index];
  const nodes = prefab.nodes.map((n) => {
    const o = n.skinBone ? new Bone() : new Object3D();
    o.name = n.name;
    o.position.fromArray(n.p);
    o.quaternion.fromArray(n.q);
    o.scale.fromArray(n.s);
    o.visible = !n.off;
    return o;
  });
  // bones must be Bones for the skeleton: mark them first
  const boneSet = new Set(prefab.nodes.flatMap((n) => n.skin ?? []));
  for (const b of boneSet) if (b >= 0 && !(nodes[b] instanceof Bone)) {
    const bone = new Bone();
    bone.name = nodes[b].name; bone.position.copy(nodes[b].position); bone.quaternion.copy(nodes[b].quaternion); bone.scale.copy(nodes[b].scale); bone.visible = nodes[b].visible;
    nodes[b] = bone;
  }
  prefab.nodes.forEach((n, i) => { if (n.parent >= 0) nodes[n.parent].add(nodes[i]); });
  const renderers = new Map();
  prefab.nodes.forEach((n, i) => {
    if (n.mesh == null || n.mat == null || n.hidden) return;
    const geometry = asset.geometries[n.mesh];
    const material = makeMaterial(asset, n.mat, !!n.skin);
    materials.push(material);
    let mesh;
    if (n.skin) {
      mesh = new SkinnedMesh(geometry, material);
      const bones = n.skin.map((b) => nodes[b]);
      const inverses = asset.def.meshes[n.mesh].bind.map((m) => new Matrix4().fromArray(m));
      mesh.bind(new Skeleton(bones, inverses), new Matrix4());
    } else mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    if (material.userData.order != null) mesh.renderOrder = material.userData.order;
    nodes[i].add(mesh);
    renderers.set(i, material);
  });
  return { prefab, root: nodes[0], nodes, renderers };
}

function pathOf(prefab, i) {
  const names = [];
  for (let n = i; n > 0; n = prefab.nodes[n].parent) names.unshift(prefab.nodes[n].name);
  return names.join('/');
}

function poseClip(inst, time) {
  const clip = inst.prefab.clip;
  if (!clip) return;
  const f = Math.min(Math.max(time * clip.fps, 0), clip.frames - 1);
  const i = Math.floor(f), k = f - i, j = Math.min(i + 1, clip.frames - 1);
  const q1 = new Quaternion(), q2 = new Quaternion();
  for (const tr of clip.tracks) {
    const o = inst.nodes[tr.node];
    if (tr.p) { const a = tr.p.length > 3 ? i * 3 : 0, b = tr.p.length > 3 ? j * 3 : 0; o.position.set(lerp(tr.p[a], tr.p[b], k), lerp(tr.p[a + 1], tr.p[b + 1], k), lerp(tr.p[a + 2], tr.p[b + 2], k)); }
    if (tr.s) { const a = tr.s.length > 3 ? i * 3 : 0, b = tr.s.length > 3 ? j * 3 : 0; o.scale.set(lerp(tr.s[a], tr.s[b], k), lerp(tr.s[a + 1], tr.s[b + 1], k), lerp(tr.s[a + 2], tr.s[b + 2], k)); }
    if (tr.q) { const a = tr.q.length > 4 ? i * 4 : 0, b = tr.q.length > 4 ? j * 4 : 0; q1.fromArray(tr.q, a); q2.fromArray(tr.q, b); o.quaternion.slerpQuaternions(q1, q2, k); }
  }
  for (const act of clip.active ?? []) {
    let on = inst.nodes[act.node].visible;
    for (const [t, v] of act.keys) if (t <= time) on = v;
    inst.nodes[act.node].visible = on;
  }
}

// ---------- particles ----------

const _v = new Vector3(), _w = new Vector3(), _q = new Quaternion(), _m = new Matrix4(), _c = [0, 0, 0, 0];

class Emitter {
  constructor(asset, spec, node, material, owner) {
    this.spec = spec; this.node = node; this.material = material; this.owner = owner;
    this.t = -curve(spec.delay); this.playing = false; this.emitAcc = 0; this.burstDone = new Map(); this.cycle = 0;
    this.particles = [];
    const r = spec.render ?? { mode: 'billboard' };
    this.mode = r.mode;
    this.meshDef = r.mode === 'mesh' && r.mesh != null ? asset.def.meshes[r.mesh] : null;
    const perVerts = this.meshDef ? this.meshDef.pos.length / 3 : 4;
    const perIdx = this.meshDef ? this.meshDef.idx.length : 6;
    const max = Math.min(spec.max, 400);
    this.capacity = max;
    this.geometry = new BufferGeometry();
    this.pos = new Float32Array(max * perVerts * 3);
    this.uv = new Float32Array(max * perVerts * 2);
    this.col = new Float32Array(max * perVerts * 4);
    // (Which way each faces: a material with a rim glow draws by it, Gremory's sleep bubble.)
    this.nrm = new Float32Array(max * perVerts * 3);
    this.geometry.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(this.uv, 2));
    this.geometry.setAttribute('color', new BufferAttribute(this.col, 4));
    this.geometry.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    const idx = new Uint32Array(max * perIdx);
    for (let p = 0; p < max; p++) {
      if (this.meshDef) this.meshDef.idx.forEach((v, k) => { idx[p * perIdx + k] = p * perVerts + v; });
      else [0, 1, 2, 0, 2, 3].forEach((v, k) => { idx[p * 6 + k] = p * 4 + v; });
    }
    this.geometry.setIndex(new BufferAttribute(idx, 1));
    this.perVerts = perVerts; this.perIdx = perIdx;
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  play() { this.playing = true; this.t = Math.min(this.t, 0); }
  stop() { this.playing = false; }

  spawn(n) {
    const s = this.spec;
    this.node.updateWorldMatrix(true, false);
    for (let k = 0; k < n && this.particles.length < this.capacity; k++) {
      const r = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
      const tn = s.duration > 0 ? Math.min(Math.max(this.t, 0) / s.duration, 1) : 0;
      const p = new Vector3(), d = new Vector3(0, 0, 1);
      shapePoint(s.shape, p, d);
      d.multiplyScalar(curve(s.speed, tn, r[0]));
      if (s.space === 'world') {
        p.applyMatrix4(this.node.matrixWorld);
        this.node.getWorldQuaternion(_q);
        d.applyQuaternion(_q);
      }
      const size = curve(s.size, tn, r[1]);
      const size3 = s.size3D ? s.size3D.map((c, i) => curve(c, tn, r[1 + i])) : [size, size, size];
      let rot = curve(s.rot, tn, r[2]);
      if (s.flipRot && rnd() < s.flipRot * 0.5) rot = -rot;
      this.particles.push({ p, v: d, age: 0, life: Math.max(curve(s.life, tn, r[3]), 1e-3), size3, rot, r, color: colour(s.color, tn, r[4], [0, 0, 0, 0]),
        row: s.sheet?.row ? (s.sheet.randomRow ? Math.floor(r[5] * s.sheet.y) : s.sheet.rowIndex) : 0 });
    }
  }

  update(dt, camera) {
    const s = this.spec;
    const before = this.t;
    this.t += dt * (s.speedScale ?? 1);
    if (this.playing && this.t >= 0) {
      let tt = this.t;
      if (s.loop && s.duration > 0) {
        const c = Math.floor(tt / s.duration);
        if (c !== this.cycle) { this.cycle = c; this.burstDone.clear(); }
        tt -= c * s.duration;
      } else if (tt > s.duration) this.playing = false;
      if (this.playing) {
        const tn = s.duration > 0 ? tt / s.duration : 0;
        this.emitAcc += curve(s.rate, tn) * dt;
        const n = Math.floor(this.emitAcc);
        this.emitAcc -= n;
        if (n) this.spawn(n);
        (s.bursts ?? []).forEach((b, i) => {
          const cycles = b.cycles || 1;
          for (let c = 0; c < cycles; c++) {
            const at = b.t + c * (b.every || 0.01), key = i * 1000 + c;
            if (tt >= at && !this.burstDone.has(key) && (before <= at + this.cycle * s.duration || tt >= at)) {
              this.burstDone.set(key, true);
              if (rnd() <= (b.p ?? 1)) this.spawn(Math.round(curve(b.n)));
            }
          }
        });
      }
    }
    // move
    const g = curve(s.gravity) * GRAVITY;
    const local = s.space !== 'world';
    this.node.updateWorldMatrix(true, false);
    const gravity = _w.set(0, -g, 0);
    if (local) { this.node.getWorldQuaternion(_q); gravity.applyQuaternion(_q.invert()); }
    for (const p of this.particles) {
      p.age += dt;
      const t = p.age / p.life;
      p.v.addScaledVector(gravity, dt);
      if (s.force) p.v.add(_v.set(curve(s.force.x, t, p.r[5]), curve(s.force.y, t, p.r[6]), curve(s.force.z, t, p.r[7])).multiplyScalar(dt));
      if (s.limit) {
        const lim = curve(s.limit.speed, t, p.r[5]), sp = p.v.length();
        if (sp > lim && sp > 0) p.v.multiplyScalar(lerp(sp, lim, 1 - Math.pow(1 - s.limit.dampen, dt * 30)) / sp);
      }
      p.p.addScaledVector(p.v, dt);
      if (s.velOL) {
        const mod = curve(s.velOL.speedMod, t, p.r[6]) || 1;
        p.p.add(_v.set(curve(s.velOL.x, t, p.r[5]), curve(s.velOL.y, t, p.r[6]), curve(s.velOL.z, t, p.r[7])).multiplyScalar(dt * mod));
      }
      if (s.noise) p.p.add(_v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(curve(s.noise.strength) * dt));
      if (s.rotOL) p.rot += curve(s.rotOL, t, p.r[6]) * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    this.draw(camera);
  }

  draw(camera) {
    const s = this.spec, n = this.particles.length, local = s.space !== 'world';
    this.mesh.matrix.copy(this.owner.matrixWorld).invert();
    this.mesh.matrixWorldNeedsUpdate = true;
    const right = new Vector3(), up = new Vector3(), fwd = new Vector3();
    if (camera) { camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1); fwd.setFromMatrixColumn(camera.matrixWorld, 2); }
    else { right.set(1, 0, 0); up.set(0, 1, 0); fwd.set(0, 0, 1); }
    const nodeWorld = this.node.matrixWorld;
    this.node.getWorldQuaternion(_q);
    const sheet = s.sheet;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i], t = p.age / p.life;
      const c = colour(s.colorOL, t, p.r[4], _c);
      const col = [p.color[0] * c[0], p.color[1] * c[1], p.color[2] * c[2], p.color[3] * c[3]];
      let sx = p.size3[0], sy = p.size3[1], sz = p.size3[2];
      if (s.sizeOL) {
        if (Array.isArray(s.sizeOL)) { sx *= curve(s.sizeOL[0], t, p.r[1]); sy *= curve(s.sizeOL[1], t, p.r[1]); sz *= curve(s.sizeOL[2], t, p.r[1]); }
        else { const k = curve(s.sizeOL, t, p.r[1]); sx *= k; sy *= k; sz *= k; }
      }
      // where it is, in the world
      const at = _v.copy(p.p);
      if (local) at.applyMatrix4(nodeWorld);
      // the sheet frame
      let u0 = 0, v0 = 0, us = 1, vs = 1;
      if (sheet) {
        const frames = sheet.row ? sheet.x : sheet.x * sheet.y;
        const f = (curve(sheet.frame, t, p.r[7]) * (sheet.cycles || 1)) % 1;
        const fi = Math.min(frames - 1, Math.floor(f * frames) + Math.floor(curve(sheet.start, 0, p.r[7])));
        const fx = fi % sheet.x, fy = sheet.row ? p.row : Math.floor(fi / sheet.x);
        us = 1 / sheet.x; vs = 1 / sheet.y; u0 = fx * us; v0 = 1 - (fy + 1) * vs;
      }
      const base = i * this.perVerts;
      for (let k = 0; k < this.perVerts; k++) this.col.set(col, (base + k) * 4);
      if (this.meshDef) {
        const m = this.meshDef;
        _m.compose(at, new Quaternion().setFromAxisAngle(_w.set(0, 0, 1), p.rot).premultiply(local || s.space === 'world' ? _q : _q), new Vector3(sx, sy, sz));
        for (let k = 0; k < this.perVerts; k++) {
          _w.fromArray(m.pos, k * 3).applyMatrix4(_m);
          this.pos.set([_w.x, _w.y, _w.z], (base + k) * 3);
          const uu = m.uv ? m.uv[k * 2] : 0, vv = m.uv ? m.uv[k * 2 + 1] : 0;
          this.uv.set([u0 + uu * us, v0 + vv * vs], (base + k) * 2);
          if (m.nrm) { _w.fromArray(m.nrm, k * 3).transformDirection(_m); this.nrm.set([_w.x, _w.y, _w.z], (base + k) * 3); }
          else this.nrm.set([fwd.x, fwd.y, fwd.z], (base + k) * 3);
        }
        continue;
      }
      // a quad: its two axes
      const a = new Vector3(), b = new Vector3();
      const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
      if (this.mode === 'stretch') {
        const vel = p.v.clone(); if (local) vel.applyQuaternion(_q);
        const speed = vel.length();
        const dir = speed > 1e-5 ? vel.multiplyScalar(1 / speed) : up.clone();
        const len = sx * (s.render.length ?? 1) + speed * (s.render.velocity ?? 0);
        a.copy(dir).multiplyScalar(len / 2);
        b.crossVectors(dir, fwd).normalize().multiplyScalar(sy / 2);
      } else if (this.mode === 'horizontal') {
        a.set(cr, 0, -sr).multiplyScalar(sx / 2); b.set(sr, 0, cr).multiplyScalar(sy / 2);
      } else {
        const r0 = this.mode === 'vertical' ? new Vector3(right.x, 0, right.z).normalize() : right;
        const u1 = this.mode === 'vertical' ? new Vector3(0, 1, 0) : up;
        a.copy(r0).multiplyScalar(cr * sx / 2).addScaledVector(u1, sr * sx / 2);
        b.copy(u1).multiplyScalar(cr * sy / 2).addScaledVector(r0, -sr * sy / 2);
      }
      const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
      corners.forEach(([x, y, uu, vv], k) => {
        this.pos.set([at.x + a.x * x + b.x * y, at.y + a.y * x + b.y * y, at.z + a.z * x + b.z * y], (base + k) * 3);
        this.uv.set([u0 + uu * us, v0 + vv * vs], (base + k) * 2);
        this.nrm.set([fwd.x, fwd.y, fwd.z], (base + k) * 3);
      });
    }
    this.geometry.setDrawRange(0, n * this.perIdx);
    sendLive(this.geometry, n * this.perVerts);
  }
}

/**
 * Sends the GPU only the first `vertices` of a geometry's buffers (those drawn), not the whole of them: they are made for
 * the most there could be (an emitter's 400 particles, a mesh particle's every vertex), and sent whole every frame that was
 * megabytes a frame, which Firefox copies over to its GPU process. None drawn: nothing sent.
 */
function sendLive(geometry, vertices) {
  if (vertices <= 0) return;
  for (const name of ['position', 'uv', 'color', 'normal']) {
    const attribute = geometry.attributes[name];
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, vertices * attribute.itemSize);
    attribute.needsUpdate = true;
  }
}

function shapePoint(sh, p, d) {
  if (!sh) { p.set(0, 0, 0); d.set(0, 0, 1); return; }
  const rad = sh.radius * (sh.shell ? 1 : 1 - (sh.thickness ?? 1) * rnd());
  const arc = (sh.arc ?? 360) * Math.PI / 180;
  switch (sh.type) {
    case 'cone': case 'coneVolume': {
      const th = rnd() * arc, rr = Math.sqrt(rnd()) * (sh.shell ? 1 : 1 - 0) * sh.radius;
      const ang = sh.angle * Math.PI / 180;
      p.set(Math.cos(th) * rr, Math.sin(th) * rr, 0);
      const spread = sh.radius > 0 ? rr / sh.radius : rnd();
      d.set(Math.cos(th) * Math.sin(ang * spread), Math.sin(th) * Math.sin(ang * spread), Math.cos(ang * spread)).normalize();
      if (sh.type === 'coneVolume') p.addScaledVector(d, rnd() * sh.length);
      break;
    }
    case 'box': {
      p.set((rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5)); d.set(0, 0, 1); break;
    }
    case 'circle': {
      const th = rnd() * arc; p.set(Math.cos(th) * rad, Math.sin(th) * rad, 0); d.set(Math.cos(th), Math.sin(th), 0); break;
    }
    case 'edge': { p.set((rnd() - 0.5) * 2 * sh.radius, 0, 0); d.set(0, 1, 0); break; }
    case 'donut': {
      const th = rnd() * arc, ph = rnd() * Math.PI * 2, rr = sh.donut * rnd();
      const ring = new Vector3(Math.cos(th), Math.sin(th), 0);
      d.set(Math.cos(ph) * ring.x, Math.cos(ph) * ring.y, Math.sin(ph));
      p.copy(ring).multiplyScalar(sh.radius).addScaledVector(d, rr); break;
    }
    case 'rectangle': { p.set(rnd() - 0.5, rnd() - 0.5, 0); d.set(0, 0, 1); break; }
    case 'hemisphere': default: {
      d.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
      d.normalize();
      if (sh.type === 'hemisphere') d.z = Math.abs(d.z);
      p.copy(d).multiplyScalar(rad);
    }
  }
  // the shape's own transform
  p.multiply(_w.fromArray(sh.s)).applyQuaternion(_q.fromArray(sh.q)).add(_w.fromArray(sh.p));
  d.applyQuaternion(_q.fromArray(sh.q));
  if (sh.randomDir) d.lerp(new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(), sh.randomDir).normalize();
  if (sh.sphericalDir) d.lerp(p.clone().normalize(), sh.sphericalDir).normalize();
}

// ---------- trails ----------

const _tp = new Vector3(), _tf = new Vector3(), _ts = new Vector3(), _td = new Vector3(), _tc = [0, 0, 0, 0];

/** SmoothTrail's curve between two control points (start, its handle, end, its handle) at t, its crease 0.3. */
function alongCurve(a, ah, b, bh, t, out) {
  const crease = 0.3, u = 1 - t, k = 1 - crease;
  const w0 = u * u * u * k, w1 = 3 * u * u * t * crease, w2 = 3 * u * t * t * crease, w3 = t * t * t * k;
  const sum = w0 + w1 + w2 + w3;
  return out.set(a.x * w0 + ah.x * w1 + bh.x * w2 + b.x * w3, a.y * w0 + ah.y * w1 + bh.y * w2 + b.y * w3, a.z * w0 + ah.z * w1 + bh.z * w2 + b.z * w3).divideScalar(sum);
}

/**
 * A trail behind a node as it moves (Pigeon Coop Toolkit's Better Trails, as the game has them: decompiled
 * PigeonCoopToolkit.Effects.Trails): while it emits, a point where the node is each time it has moved minDistance (a
 * smooth one's last point following the node meanwhile, and `between` points curved between each two); each point ages,
 * and those older than `life` are gone. Drawn as a ribbon in the field's own space through them, turned to the camera,
 * as wide as `size` times its size over life, coloured by its colour over life (both by a point's age, or along the trail
 * when stretched to fit), its texture along it by time, distance or point. Stopped, what is left of it fades as it ages.
 */
class Trail {
  constructor(spec, node, material, owner) {
    this.spec = spec; this.node = node; this.owner = owner;
    this.max = spec.kind === 'smooth' ? spec.maxPoints * (1 + spec.between) : spec.maxPoints;
    /** The points it lays (a smooth one's control points): where, how old, and its forward (an overriding one's). */
    this.points = [];
    this.emitting = false;
    this.last = new Vector3();
    this.moved = 0;
    /** How far along it the points gone off its end were (its texture laid along by distance). */
    this.dropped = 0;
    const n = this.max * 2;
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    this.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(n * 2), 2));
    this.geometry.setAttribute('color', new BufferAttribute(new Float32Array(n * 4), 4));
    this.geometry.setAttribute('normal', new BufferAttribute(new Float32Array(n * 3), 3));
    const index = [];
    for (let i = 0; i < this.max - 1; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 2, 2 * i + 1, 2 * i + 3);
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(this.geometry, material);
    // (In the field's own space: its points are where the node was.)
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrixWorldAutoUpdate = false;
    this.mesh.frustumCulled = false;
  }

  get alive() { return this.emitting || this.points.some((p) => p.age < this.spec.life); }

  forward() {
    const s = this.spec;
    return s.forward ? (s.forwardRelative ? _tf.fromArray(s.forward).transformDirection(this.node.matrixWorld) : _tf.fromArray(s.forward).normalize()).clone() : null;
  }

  update(dt, camera, emit) {
    const s = this.spec;
    this.node.updateWorldMatrix(true, false);
    const at = this.node.getWorldPosition(_tp);
    if (emit && !this.emitting) {
      // Begun (again): a new trail, from here.
      this.points = s.kind === 'smooth' ? [{ p: at.clone(), age: 0, f: this.forward() }, { p: at.clone(), age: 0, f: this.forward() }] : [];
      this.last.copy(at);
      this.moved = 0;
      this.dropped = 0;
    }
    this.emitting = emit;
    if (emit) {
      this.moved += at.distanceTo(this.last);
      const cap = s.kind === 'smooth' ? s.maxPoints : this.max;
      if (this.moved > 0 && this.moved >= s.minDistance) {
        this.points.push({ p: at.clone(), age: 0, f: this.forward() });
        this.moved = 0;
        while (this.points.length > cap) {
          this.dropped += this.points[0].p.distanceTo(this.points[1].p);
          this.points.shift();
        }
      } else if (s.kind === 'smooth' && this.points.length) {
        const head = this.points[this.points.length - 1];
        head.p.copy(at);
        if (s.forward) head.f = this.forward();
      }
      this.last.copy(at);
    }
    for (const p of this.points) p.age += dt;
    this.draw(camera);
  }

  /** The points it is drawn through: a smooth one's control points with `between` more curved between each two. */
  laid() {
    const s = this.spec, cps = this.points;
    if (s.kind !== 'smooth') return cps;
    const out = [];
    for (let i = 0; i < cps.length; i++) {
      const a = cps[i];
      out.push(a);
      if (i >= cps.length - 1) continue;
      const b = cps[i + 1];
      const half = a.p.distanceTo(b.p) / 2;
      const ah = a.p.clone().add((i === 0 ? b.p.clone().sub(a.p) : b.p.clone().sub(cps[i - 1].p)).normalize().multiplyScalar(half));
      const bh = b.p.clone().add((i + 1 === cps.length - 1 ? a.p.clone().sub(b.p) : a.p.clone().sub(cps[i + 2].p)).normalize().multiplyScalar(half));
      for (let j = 0; j < s.between; j++) {
        const t = (j + 1) / (s.between + 1);
        out.push({ p: alongCurve(a.p, ah, b.p, bh, t, new Vector3()), age: lerp(a.age, b.age, t), f: a.f && b.f ? a.f.clone().lerp(b.f, t) : null });
      }
    }
    return out;
  }

  draw(camera) {
    const s = this.spec;
    const points = this.laid();
    // The oldest go first: those still young enough are the last of them.
    const first = points.findIndex((p) => p.age <= s.life);
    const active = first < 0 ? 0 : points.length - first;
    if (active < 2) { this.geometry.setDrawRange(0, 0); return; }
    const pos = this.geometry.attributes.position.array, uv = this.geometry.attributes.uv.array, col = this.geometry.attributes.color.array, nrm = this.geometry.attributes.normal.array;
    const view = camera ? camera.getWorldDirection(new Vector3()) : new Vector3(0, 0, -1);
    // (The game's metres, as big as the effect is drawn.)
    const scale = Math.abs(this.owner.getWorldScale(_ts).x);
    let dist = this.dropped;
    for (let i = 1; i < first; i++) dist += points[i].p.distanceTo(points[i - 1].p);
    for (let k = 0; k < active; k++) {
      const i = first + k, p = points[i];
      if (i > 0) dist += p.p.distanceTo(points[i - 1].p);
      const toward = i < points.length - 1 ? _td.subVectors(points[i + 1].p, p.p) : _td.subVectors(p.p, points[i - 1].p);
      const facing = s.forward ? (s.forwardRelative ? p.f ?? view : _tf.fromArray(s.forward).normalize()) : view;
      // (Mirrored from the game's space: the other way round in the cross product, so its texture lies as there.)
      const side = new Vector3().crossVectors(facing, toward.normalize()).normalize();
      const life = p.age / s.life, along = 1 - k / active;
      gradientAt(s.color, s.stretchColor ? along : life, _tc);
      const width = (s.sizeOverLife ? sampleLut(s.sizeOverLife, s.stretchSize ? along : life) : 1) * s.size * scale;
      for (let e = 0; e < 2; e++) {
        const v = 2 * k + e;
        const sign = e === 0 ? 1 : -1;
        pos[v * 3] = p.p.x + side.x * width * sign; pos[v * 3 + 1] = p.p.y + side.y * width * sign; pos[v * 3 + 2] = p.p.z + side.z * width * sign;
        let u = s.timeTex ? Math.min(Math.max(life, 0), 1) : s.tile > 0 ? dist / (s.tile * scale) : v / active / 2;
        if (s.texRemap) u = sampleLut(s.texRemap, u);
        uv[v * 2] = u; uv[v * 2 + 1] = e;
        col[v * 4] = _tc[0]; col[v * 4 + 1] = _tc[1]; col[v * 4 + 2] = _tc[2]; col[v * 4 + 3] = _tc[3];
        // (Facing the camera, as the game gives it.)
        nrm[v * 3] = -facing.x; nrm[v * 3 + 1] = -facing.y; nrm[v * 3 + 2] = -facing.z;
      }
    }
    sendLive(this.geometry, active * 2);
    this.geometry.setDrawRange(0, (active - 1) * 6);
  }
}

// ---------- the effect ----------

export class KrEffect extends Group {
  /** opts.findNode(name): the caster's bone for NodeFind attachments (else the effect's root). opts.scale: the game's metres to ours. */
  constructor(asset, opts = {}) {
    super();
    this.asset = asset; this.t = 0; this.done = false;
    this.materials = [];
    this.models = asset.def.models.map((m, i) => {
      const inst = asset.def.prefabs[m.prefab] ? buildPrefab(asset, m.prefab, this.materials) : null;
      const holder = this.attach(m, opts, null);
      if (inst) holder.add(inst.root);
      holder.visible = false;
      const extras = (m.renderers ?? []).map((r) => {
        const ni = inst ? inst.prefab.nodes.findIndex((_, k) => pathOf(inst.prefab, k) === r.path) : -1;
        return { ...r, material: ni >= 0 ? inst.renderers.get(ni) : null };
      });
      return { m, inst, holder, extras };
    });
    this.emitters = [];
    asset.def.particles.forEach((pl, i) => {
      if (pl.prefab == null) return;
      const inst = buildPrefab(asset, pl.prefab, this.materials);
      const holder = this.attach(pl, opts, this.models);
      holder.add(inst.root);
      const emitters = inst.prefab.emitters.map((spec) => {
        const material = makeMaterial(asset, spec.render?.mat ?? 0);
        // (A quad whose picture was lost from the game's bundle as it was built: not drawn, rather than as a white square.)
        if (spec.render?.lost) material.visible = false;
        this.materials.push(material);
        const e = new Emitter(asset, spec, inst.nodes[spec.node], material, this);
        e.mesh.renderOrder = material.userData.order ?? 20 + i;
        this.add(e.mesh);
        return e;
      });
      this.emitters.push({ pl, emitters, started: false, stopped: false });
    });
    // Its trails: those placed of their own (laid while the placement lasts), and those on its models' nodes (while each shows).
    this.trails = [];
    const trailsOf = (inst, when) => {
      for (const spec of inst.prefab.trails ?? []) {
        const material = makeMaterial(asset, spec.mat ?? 0);
        // (Turned to the camera: drawn whichever way round its points run.)
        material.side = DoubleSide;
        this.materials.push(material);
        const trail = new Trail(spec, inst.nodes[spec.node], material, this);
        trail.mesh.renderOrder = material.userData.order ?? 20;
        this.add(trail.mesh);
        this.trails.push({ when, trail });
      }
    };
    (asset.def.trails ?? []).forEach((tl) => {
      if (tl.prefab == null || !asset.def.prefabs[tl.prefab]) return;
      const inst = buildPrefab(asset, tl.prefab, this.materials);
      this.attach(tl, opts, this.models).add(inst.root);
      trailsOf(inst, () => tl);
    });
    for (const model of this.models) if (model.inst) trailsOf(model.inst, () => model.m);
  }

  attach(pl, opts, models) {
    const holder = new Group();
    holder.position.fromArray(pl.p); holder.quaternion.fromArray(pl.q); holder.scale.fromArray(pl.s);
    let parent = this;
    if (pl.attach === 'EffectModel' && models) {
      for (const m of models) { const o = m.inst?.root.getObjectByName(pl.target); if (o) { parent = o; break; } }
    } else if (pl.attach === 'NodeFind' && opts.findNode) parent = opts.findNode(pl.target) ?? this;
    parent.add(holder);
    return holder;
  }

  update(dt, camera) {
    this.t += dt;
    const t = this.t;
    for (const { m, inst, holder, extras } of this.models) {
      const on = t >= m.begin && t <= m.end;
      holder.visible = on;
      if (!on || !inst) continue;
      // which frame of its clip (normalized) the play list says
      let local = t - m.begin, frame = 1;
      for (const seq of m.play) {
        if (seq.type === 'Loop' && (seq.loops === 0 || local < seq.len * seq.loops)) { frame = lerp(seq.from, seq.to, (local / seq.len) % 1); local = -1; break; }
        const len = seq.type === 'Loop' ? seq.len * seq.loops : seq.len;
        if (local <= len) { frame = lerp(seq.from, seq.to, Math.min(local / (seq.len || 1), 1)); local = -1; break; }
        local -= len; frame = seq.to;
      }
      if (inst.prefab.clip) poseClip(inst, frame * inst.prefab.clip.length);
      for (const r of extras) {
        if (!r.material) continue;
        const u = r.material.uniforms, base = r.material.userData.base;
        const a = r.alpha ? sampleLut(r.alpha, frame) : base.color[3];
        let rgb = base.color.slice(0, 3);
        if (r.color && r.colorType) {
          const g = gradientAt(r.color, frame, [0, 0, 0, 0]);
          if (r.colorType === 'Multiply') rgb = rgb.map((v, i) => v * g[i]);
          else if (r.colorType === 'Add') rgb = rgb.map((v, i) => v + g[i] * g[3]);
          else if (r.colorType === 'Overwrite') rgb = g.slice(0, 3);
        }
        u.tint.value.set(rgb[0], rgb[1], rgb[2], a);
        if (r.uv) {
          const st = base.st;
          u.st.value.set(r.uv.UTiling ? sampleLut(r.uv.UTiling, frame) : st[0], r.uv.VTiling ? sampleLut(r.uv.VTiling, frame) : st[1],
            -(r.uv.UOffset ? sampleLut(r.uv.UOffset, frame) : -st[2]), -(r.uv.VOffset ? sampleLut(r.uv.VOffset, frame) : -st[3]));
        } else if (r.tiles) {
          const { x, y, loops, vertical } = r.tiles, n = x * y * loops;
          const i = Math.min(n - 1, Math.floor(n * frame)) % (x * y);
          const cx = vertical ? Math.floor(i / y) : i % x, cy = y - (vertical ? i % y : Math.floor(i / x)) - 1;
          u.st.value.set(1 / x, 1 / y, cx / x, cy / y);
        }
      }
    }
    this.updateMatrixWorld(true);
    let alive = false;
    for (const group of this.emitters) {
      const { pl, emitters } = group;
      if (!group.started && t >= pl.begin) { group.started = true; emitters.forEach((e) => e.play()); }
      if (!group.stopped && t >= pl.end) { group.stopped = true; emitters.forEach((e) => e.stop()); }
      for (const e of emitters) {
        if (group.started) e.update(dt, camera);
        if (e.particles.length || (group.started && !group.stopped && e.playing)) alive = true;
      }
    }
    for (const { when, trail } of this.trails) {
      const { begin, end } = when();
      trail.update(dt, camera, !this.stopped && t >= begin && t <= end);
      if (trail.alive) alive = true;
    }
    // a ShaderForge material's own scroll (approximate: _USpeed/_VSpeed style speeds move the main texture, _Dissolve_ ones
    // its dissolve's, or the main texture where it has none)
    for (const mat of this.materials) {
      const sc = mat.userData.base?.scroll;
      if (!sc) continue;
      const dissolves = mat.defines.USE_DISSOLVE != null;
      const us = sc._Main_USpeed ?? sc._USpeed ?? (dissolves ? 0 : sc._Dissolve_USpeed) ?? 0, vs = sc._Main_VSpeed ?? sc._VSpeed ?? (dissolves ? 0 : sc._Dissolve_VSpeed) ?? 0;
      mat.uniforms.st.value.z = mat.userData.base.st[2] + us * t;
      mat.uniforms.st.value.w = mat.userData.base.st[3] + vs * t;
      if (dissolves) {
        mat.uniforms.dissolveSt.value.z = mat.userData.base.dissolveSt[2] + (sc._Dissolve_USpeed ?? 0) * t;
        mat.uniforms.dissolveSt.value.w = mat.userData.base.dissolveSt[3] + (sc._Dissolve_VSpeed ?? 0) * t;
      }
    }
    if (t > this.asset.def.length && !alive) this.done = true;
  }

  /** Ends an effect that runs until told (a status's loop, length 9999): models go now, emitters stop and their particles live out. */
  stop() {
    // (Its trails stop laying points; what is left of them fades.)
    this.stopped = true;
    for (const m of this.models) m.m = { ...m.m, end: Math.min(m.m.end, this.t) };
    for (const g of this.emitters) { g.stopped = true; g.emitters.forEach((e) => e.stop()); }
    this.asset = { ...this.asset, def: { ...this.asset.def, length: Math.min(this.asset.def.length, this.t) } };
  }

  /**
   * Frees its particles' geometry. Not its materials: all an effect's materials share a few shader programs, and disposing
   * the last one using a program deletes it, so the next effect to use it (the same skill again, or every one in the next
   * fight once a fight's are all taken off) compiles it again as it first draws, a stall mid-fight. Undisposed, a material
   * is only JavaScript (its textures are its asset's, kept), let go of with the effect.
   */
  dispose() {
    for (const g of this.emitters) for (const e of g.emitters) e.geometry.dispose();
    for (const { trail } of this.trails) trail.geometry.dispose();
  }
}
