/*
 * A King's Raid clip (KR-extracted/scripts/kr-anims.py's JSON, ./kr-clips.ts reads it) as a build sends it: the same
 * clip, every number in it exactly, in about half the bytes of the JSON gzipped. Plain JS (with ./kr-clip-file.d.ts) so
 * the build's script (scripts/clips.mjs) writes it with the very code the page reads it with.
 *
 * The file is gzipped (the page unpacks it itself: a host sends a binary file as it is). Inside: "KRC1", then the length
 * of a JSON of what isn't numbers (the clip's name, length, frames a second, what hangs beside its skeleton, and each
 * track's bone, kind, how many frames of values and whether it lists the frames), that JSON, then every track's numbers
 * as zigzag varints: each of its components (x, y, z(, w)) in turn, frame by frame, each the change from the frame
 * before, as a whole number at the JSON's own precision (a rotation's to 1/1000, a position's and scale's to 1/10000);
 * then, for one listing its frames, the frames, each the change from the one before.
 */

const MAGIC = 'KRC1';
/** What a value of each kind is counted in: the JSON's own precision (kr-anims.py rounds a rotation to 3 places, the rest to 4). */
const SCALE = { q: 1000, p: 10000, s: 10000 };

/** A clip as the file the page is sent (before it is gzipped). Throws for one with a value finer than its kind's precision. */
export function encodeClip(clip) {
  const meta = { name: clip.name, duration: clip.duration, fps: clip.fps, top: clip.top ?? [], tracks: [] };
  const out = [];
  const varint = (n) => {
    let z = n >= 0 ? n * 2 : -n * 2 - 1;
    while (z >= 128) {
      out.push((z % 128) + 128);
      z = Math.floor(z / 128);
    }
    out.push(z);
  };
  for (const [bone, kind, values, at] of clip.tracks) {
    const size = kind === 'q' ? 4 : 3;
    const frames = values.length / size;
    meta.tracks.push([bone, kind, frames, at ? 1 : 0]);
    for (let c = 0; c < size; c++) {
      let last = 0;
      for (let i = 0; i < frames; i++) {
        const value = values[i * size + c];
        const whole = Math.round(value * SCALE[kind]);
        if (Math.abs(whole / SCALE[kind] - value) > 1e-9) throw new Error(`${clip.name}: ${bone} ${kind} has ${value}, finer than 1/${SCALE[kind]}`);
        varint(whole - last);
        last = whole;
      }
    }
    if (at) {
      if (at.length !== frames) throw new Error(`${clip.name}: ${bone} ${kind} lists ${at.length} frames for ${frames}`);
      let last = 0;
      for (const frame of at) {
        varint(frame - last);
        last = frame;
      }
    }
  }
  const head = new TextEncoder().encode(MAGIC);
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const length = [];
  for (let n = json.length; ; n = Math.floor(n / 128)) {
    if (n < 128) {
      length.push(n);
      break;
    }
    length.push((n % 128) + 128);
  }
  const bytes = new Uint8Array(head.length + length.length + json.length + out.length);
  bytes.set(head, 0);
  bytes.set(length, head.length);
  bytes.set(json, head.length + length.length);
  bytes.set(out, head.length + length.length + json.length);
  return bytes;
}

/** The clip in a file (unpacked from its gzip), as its JSON would have it. */
export function decodeClip(bytes) {
  let at = 0;
  const raw = () => {
    let n = 0;
    let scale = 1;
    for (;;) {
      const b = bytes[at++];
      if (b === undefined) throw new Error('clip file cut short');
      n += (b % 128) * scale;
      if (b < 128) return n;
      scale *= 128;
    }
  };
  const varint = () => {
    const z = raw();
    return z % 2 === 0 ? z / 2 : -(z + 1) / 2;
  };
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error('not a clip file');
  at = 4;
  const length = raw();
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(at, at + length)));
  at += length;
  const tracks = meta.tracks.map(([bone, kind, frames, listed]) => {
    const size = kind === 'q' ? 4 : 3;
    const values = new Array(frames * size);
    for (let c = 0; c < size; c++) {
      let last = 0;
      for (let i = 0; i < frames; i++) {
        last += varint();
        values[i * size + c] = last / SCALE[kind];
      }
    }
    if (!listed) return [bone, kind, values];
    const frameList = new Array(frames);
    let last = 0;
    for (let i = 0; i < frames; i++) frameList[i] = last += varint();
    return [bone, kind, values, frameList];
  });
  return { name: meta.name, duration: meta.duration, fps: meta.fps, top: meta.top, tracks };
}
