/*
 * Sound for every page: the shared Web Audio player (sfx.ts) and the sounds every page's
 * clicks make (ui-sfx.ts).
 */

export { getVolumes, music, notes, preload, setMuted, setVolume, sound, track, type Channel, type Stop, type Volumes } from './sfx';
export { installClickSounds, playLoaded, setClickSound } from './ui-sfx';
