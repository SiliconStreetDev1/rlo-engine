import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for 80s Slap Bass (DX7/Seinfeld style).
 * Characterized by a very snappy filter envelope and a metallic transient "pop".
 */
export class SlapBassSynth extends DecaySynthBase {
  protected _c = { v: 0.9, a: 0.005, d: 0.15, m: 3.0 }; // Ultra-fast attack for the slap

  protected _setupSynthesis(
    ctx: AudioContext,
    masterGain: GainNode,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    safeDuration: number,
    stopTime: number,
  ): AudioNode | void {
    /** The "Pop" - An aggressive lowpass filter sweep that opens bright and snaps shut */
    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      freq * 8 + velocity * 3000, // Very bright on hard velocities
      freq + 100, // Quickly muffles down to the fundamental
      time,
      0.1, // Snap duration
    );
    filter.Q.value = 3; // Adds a "quack" resonance to the slap

    /** The Body - Sawtooth for rich harmonics */
    const osc = this._osc(ctx, Osc.Sawtooth, freq, gain);

    /** The Sub - Deep sine wave an octave down to anchor the low end */
    const subOsc = this._osc(ctx, Osc.Sine, freq / 2, gain);

    /** The "Thumb Slap" - A quick, inharmonic metallic burst simulating the string hitting the fretboard */
    this._transient(
      ctx,
      Osc.Square,
      freq * 3.5,
      filter,
      time,
      Math.max(0.001, velocity * 0.4),
      0.04,
    );

    gain.connect(filter);
    this._on(time, stopTime, osc, subOsc);

    return filter;
  }
}
