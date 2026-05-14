import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Chromatic Percussion (Bells, Marimba, Vibraphone).
 * Characterized by a pure tone with a very fast attack and immediate decay.
 */
export class ChromaticPercussionSynth extends DecaySynthBase {
  protected _c = { v: 0.7, a: 0.005, d: 0.5, m: 6.0 };

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
    const osc = this._osc(ctx, Osc.Sine, 0, gain);
    this._set(osc.frequency, freq * 1.1, time);
    this._exp(osc.frequency, freq, time + 0.02);

    const overtoneGain = this._gain(ctx, 0, masterGain);
    this._set(overtoneGain.gain, Math.max(0.001, velocity * 0.25), time);
    this._exp(overtoneGain.gain, 0.001, time + safeDuration);
    const overtone = this._osc(ctx, Osc.Sine, freq * 2.76, overtoneGain);

    overtoneGain.connect(masterGain);

    this._on(time, stopTime, osc, overtone);
  }
}
