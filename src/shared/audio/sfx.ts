/*
 * Sound for every game. Everything plays through one Web Audio context, so sounds start at once and
 * can overlap (chips, cards, footsteps), and through one master volume (VOLUME), so every game can
 * be made louder or quieter from here. A browser keeps sound off until the player first touches or
 * presses something, so the first input wakes it. The frame's sound button mutes it (setMuted). Music
 * goes through a gain of its own (tunes), quiet while the tab isn't the one in front.
 */

/** How loud every sound is, 0 to 1 (1: the files as recorded). A sound's own volume is a share of this. */
export const VOLUME = 0.5;

let muted = false;

const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
const audio = Ctx ? new Ctx() : null;
const master = audio?.createGain() ?? null;
const tunes = audio?.createGain() ?? null;
if (audio && master && tunes) {
  master.gain.value = VOLUME;
  master.connect(audio.destination);
  tunes.connect(master);
  // Music fades out while the tab is hidden or another window has focus (a popup's iframe on the page still counts
  // as the page: hasFocus, checked once the focus has moved), and back in when it's in front again.
  const heard = (): void => {
    const on = !document.hidden && document.hasFocus();
    const now = audio.currentTime;
    tunes.gain.cancelScheduledValues(now);
    tunes.gain.setValueAtTime(tunes.gain.value, now);
    tunes.gain.linearRampToValueAtTime(on ? 1 : 0, now + 0.3);
  };
  const later = (): void => void window.setTimeout(heard, 0);
  document.addEventListener('visibilitychange', heard);
  window.addEventListener('blur', later);
  window.addEventListener('focus', later);
  tunes.gain.value = !document.hidden && document.hasFocus() ? 1 : 0;
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

/** Stops a sound that's playing, fading out over `fade` seconds (0: at once). */
export type Stop = (fade?: number) => void;

/** A recorded sound: loads it, and returns a function that plays it (unless the sound is off). */
export function sound(url: string): (volume?: number) => void {
  const play = track(url);
  return (volume) => void play(volume);
}

/**
 * A long recorded sound, as sound(), played from `from` seconds into its file: playing it gives back
 * what stops it early.
 */
export function track(url: string, from = 0): (volume?: number) => Stop {
  const loaded = load(url);
  return (volume = 1) => {
    const ctx = ready();
    const buffer = loaded();
    if (!ctx || !master || !buffer) return () => {};
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start(0, from);
    return (fade = 0) => {
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fade);
      source.stop(now + fade);
    };
  };
}

/**
 * Music: a recorded sound played over and over, going round again from its start once `loop` seconds in (its length,
 * when not given: an mp3 can end on a moment of its encoder's silence). It begins as soon as it has loaded and sound
 * is awake (the player's first press), and goes on while the sound button has it off or the tab isn't in front,
 * unheard. Playing it gives back what stops it.
 */
export function music(url: string, loop?: number): (volume?: number) => Stop {
  const loaded = load(url);
  return (volume = 1) => {
    if (!audio || !tunes) return () => {};
    const gain = audio.createGain();
    gain.gain.value = volume;
    gain.connect(tunes);
    let source: AudioBufferSourceNode | null = null;
    let stopped = false;
    const begin = (): void => {
      const buffer = loaded();
      if (stopped || source || !buffer || audio.state !== 'running') return;
      source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = Math.min(loop ?? buffer.duration, buffer.duration);
      source.connect(gain);
      source.start();
    };
    begin();
    const waiting = source ? 0 : window.setInterval(() => {
      begin();
      if (source || stopped) window.clearInterval(waiting);
    }, 250);
    return (fade = 0) => {
      stopped = true;
      window.clearInterval(waiting);
      const now = audio.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fade);
      source?.stop(now + fade);
    };
  };
}

/** Starts loading a sound's file ahead of when it is first played (sound(), track() or music() of it then find it loaded). */
export function preload(url: string): void {
  load(url);
}

/** Every sound's file asked for so far, by its address: each fetched and decoded once however often it's asked for. */
const files = new Map<string, () => AudioBuffer | null>();

/** A sound's file, loaded and made ready to play: what gives it (null until it has loaded, or if it won't). */
function load(url: string): () => AudioBuffer | null {
  const known = files.get(url);
  if (known) return known;
  let buffer: AudioBuffer | null = null;
  const loaded = (): AudioBuffer | null => buffer;
  files.set(url, loaded);
  if (audio) {
    void fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
      .then((data) => audio.decodeAudioData(data))
      .then((decoded) => (buffer = decoded))
      .catch(() => {
        // A sound that won't load just doesn't play (and is tried again the next time it's asked for).
        files.delete(url);
      });
  }
  return loaded;
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
  // (Music already going on goes quiet too, and is heard again when it's turned back on.)
  if (master) master.gain.value = on ? 0 : VOLUME;
}
