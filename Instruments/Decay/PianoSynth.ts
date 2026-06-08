import { DecaySynthBase } from "./DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Piano and similar percussive-melodic instruments.
 */
/**
 * Simulates a piano using a complex decay envelope, subtle detuning for string realism, and a lowpass filter that closes over time.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class PianoSynth extends DecaySynthBase {
  protected _envelopeConfig = { _peakVelocity: 0.8, _attackTimeSeconds: 0.015, _decayTimeSeconds: 0.1, _maxDurationSeconds: 5.0 };

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
    /** Key-tracking the filter ensures high notes aren't artificially muffled or phase-distorted. Capped at Nyquist. */
    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      freq + 800 + velocity * 1000,
      freq + 200,
      time,
      Math.min(safeDuration, 1.0),
    );
    const osc1 = this._createOscillator(ctx, "triangle", freq, gain);

    /** Slight inharmonicity stretching, strictly capped below Nyquist to prevent digital aliasing */
    const overtoneGain = this._createGain(ctx, 0);
    const osc2 = this._createOscillator(ctx, "sine", freq * 2.003, overtoneGain);
    const osc3 = this._createOscillator(ctx, "sine", freq * 3.007, overtoneGain);

    /** Dynamically pan lower keys to the left ear, and higher keys to the right ear */
    const panner = this._createStereoPanner(
      ctx,
      Math.max(-0.8, Math.min(0.8, (freq - 261.6) / 800)),
    );

    /** Sympathetic string resonance: metallic clangs decay much faster than the fundamental */
    this._setValueAtTime(overtoneGain.gain, 0, time);
    this._linearRampToValue(overtoneGain.gain, Math.max(0.001, velocity * 0.15), time + 0.01);
    this._exponentialRampToValue(overtoneGain.gain, 0.001, time + Math.min(safeDuration, 0.5));
    overtoneGain.connect(panner);

    /** Mechanical Hammer Thump: the physical impact of the wooden hammer on the strings */
    this._createTransient(
      ctx,
      "sine",
      60,
      panner,
      time,
      Math.max(0.001, velocity * 0.4),
      0.05,
      0.005,
    );

    gain.connect(panner).connect(filter);

    this._scheduleNodeStartStop(time, stopTime, osc1, osc2, osc3);

    return filter;
  }
}
