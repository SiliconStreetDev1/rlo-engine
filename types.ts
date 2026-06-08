/**
 * Constants for special instrument IDs.
 * Standard General MIDI uses 0-127 for melodic instruments.
 * We reserve 128 specifically for percussion/drum kits.
 * 
 * @reason Standardizing percussion on a dedicated high-index ID prevents conflicts
 * with GM specifications and allows the Engine to easily route Drum notes directly
 * to the `DrumSynth` regardless of the MIDI channel they originated from.
 */
export const PERCUSSION_INSTRUMENT_ID = 128;

/**
 * Core data structure for a compiled RLO track.
 * Represents the absolute minimum data required to synthesize music.
 */
export interface RloData {
  /** 
   * The total duration of the track in seconds, used for looping.
   * @reason Storing duration internally prevents sequence desync and allows
   * the game engine to calculate perfect loop points without needing to
   * scan the entire notes array at runtime.
   */
  durationSecs: number;
  /** 
   * A flat packed array of 5-element tuples:
   * `[frequency, timeSeconds, durationSeconds, velocity, instrumentId, ...]`
   * 
   * @reason Memory & Performance: By packing objects into a single flat `Float32Array`,
   * we eliminate V8 object allocation overhead, drastically
   * improve CPU cache locality during the playback loop, and strictly enforce
   * unboxed float memory.
   */
  notes: Float32Array | number[];
}