/**
 * Constants for special instrument IDs.
 * Standard General MIDI uses 0-127 for melodic instruments.
 * We reserve 128 specifically for percussion/drum kits.
 */
export const PERCUSSION_INSTRUMENT_ID = 128;

/**
 * Core data structure for a compiled RLO track.
 */
export interface RloData {
  /** The total duration of the track in seconds, used for looping. */
  durationSecs: number;
  /** A flat packed array of [freq, time, dur, vel, id, freq, time, dur, vel, id...] */
  notes: number[];
}