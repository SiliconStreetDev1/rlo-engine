/**
 * Interface for all synthesizer instrument strategies.
 * 
 * @reason Strategy Pattern Isolation:
 * By forcing all Synthesizers to conform to a single `_playNote` contract,
 * the `Synthesizer` router does not need to know if it is triggering an FM synth,
 * an Additive synth, or a simple Oscillator. This allows Rollup to easily tree-shake 
 * unused classes because there is no hard-coded type checking or switch statements.
 */
export interface ISynthInstrument {
  /**
   * Synthesizes and schedules a note.
   * @param {AudioContext} ctx - The active AudioContext.
   * @param {GainNode} masterGain - The master output gain node.
   * @param {number} time - The AudioContext time to start the note.
   * @param {number} freq - Note frequency in Hz.
   * @param {number} duration - The duration in seconds.
   * @param {number} velocity - The velocity/volume between 0.0 and 1.0.
   */
  _playNote(ctx: AudioContext, masterGain: GainNode, time: number, freq: number, duration: number, velocity: number): void;
}