import { DecaySynthBase } from "./DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for 80s Slap Bass (DX7/Seinfeld style).
 * Characterized by a very snappy filter envelope and a metallic transient "pop".
 */
/**
 * Emulates a slapped bass guitar with a sharp, percussive attack phase and a rapidly decaying low-pass filter.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class SlapBassSynth extends DecaySynthBase {
  protected _envelopeConfig = { _peakVelocity: 0.9, _attackTimeSeconds: 0.005, _decayTimeSeconds: 0.15, _maxDurationSeconds: 3.0 }; // Ultra-fast attack for the slap

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
    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      freq * 8 + velocity * 3000, // Very bright on hard velocities
      freq + 100, // Quickly muffles down to the fundamental
      time,
      0.1, // Snap duration
    );
    filter.Q.value = 3; // Adds a "quack" resonance to the slap

    /** The Body - Sawtooth for rich harmonics */
    const osc = this._createOscillator(ctx, "sawtooth", freq, gain);

    /** The Sub - Deep sine wave an octave down to anchor the low end */
    const subOsc = this._createOscillator(ctx, "sine", freq / 2, gain);

    /** The "Thumb Slap" - A quick, inharmonic metallic burst simulating the string hitting the fretboard */
    this._createTransient(
      ctx,
      "square",
      freq * 3.5,
      filter,
      time,
      Math.max(0.001, velocity * 0.4),
      0.04,
    );

    gain.connect(filter);
    this._scheduleNodeStartStop(time, stopTime, osc, subOsc);

    return filter;
  }
}
