/*
 * Sound for every game. Everything plays through one Web Audio context, so sounds start at once and
 * can overlap (chips, cards, footsteps), and through one master volume (VOLUME), so every game can
 * be made louder or quieter from here. A browser keeps sound off until the player first touches or
 * presses something, so the first input wakes it. The frame's sound button mutes it (setMuted).
 */

/** How loud every sound is, 0 to 1 (1: the files as recorded). A sound's own volume is a share of this. */
export const VOLUME = 0.5;

let muted = false;

const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
const audio = Ctx ? new Ctx() : null;
const master = audio?.createGain() ?? null;
if (audio && master) {
  master.gain.value = VOLUME;
  master.connect(audio.destination);
  const wake = (): void => {
    void audio.resume().then(() => {
      if (audio.state === 'running') for (const type of ['pointerdown', 'keydown'] as const) window.removeEventListener(type, wake, true);
    });
  };
  for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, wake, true);
}

/**
 * Whether a sound can play now. Sound still asleep plays only if the player is touching or pressing
 * something this moment (it wakes then), so sounds from before don't all come at once when it does.
 */
function ready(): AudioContext | null {
  if (!audio || muted) return null;
  if (audio.state === 'running') return audio;
  if (!navigator.userActivation?.isActive) return null;
  void audio.resume();
  return audio;
}

/** A recorded sound: loads it, and returns a function that plays it (unless the sound is off). */
export function sound(url: string): (volume?: number) => void {
  let buffer: AudioBuffer | null = null;
  if (audio) {
    void fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
      .then((data) => audio.decodeAudioData(data))
      .then((decoded) => (buffer = decoded))
      .catch(() => {
        // A sound that won't load just doesn't play.
      });
  }
  return (volume = 1) => {
    const ctx = ready();
    if (!ctx || !master || !buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start();
  };
}

/** A few notes made here (no file): each `spacing` seconds after the last, fading out over `length`. */
export function notes(freqs: number[], opts: { type: OscillatorType; volume: number; length: number; spacing?: number }): void {
  const ctx = ready();
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.value = freq;
    const start = now + i * (opts.spacing ?? 0);
    gain.gain.setValueAtTime(opts.volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + opts.length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + opts.length);
  });
}

/** Sound off (the frame's sound button). */
export function setMuted(on: boolean): void {
  muted = on;
}
