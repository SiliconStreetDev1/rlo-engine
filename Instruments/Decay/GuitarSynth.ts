import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Acoustic Guitars using a plucked sawtooth.
 */
export class GuitarSynth extends DecaySynthBase {
  protected _c = { v: 0.6, a: 0.02, d: 0.2, m: 4.0 };

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
    /** Bright attack that quickly muffles as the acoustic string loses kinetic energy */
    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      2000 + velocity * 1000,
      200,
      time,
      safeDuration,
    );

    const osc = this._osc(ctx, Osc.Sawtooth, 0, gain);
    this._set(osc.frequency, freq * 1.02, time);
    this._exp(osc.frequency, freq, time + 0.05);

    gain.connect(filter);

    /** Plectrum Pluck: the sharp, plastic click of a pick striking a steel string */
    this._transient(
      ctx,
      Osc.Square,
      3500,
      masterGain,
      time,
      Math.max(0.001, velocity * 0.25),
      0.015,
    );

    this._on(time, stopTime, osc);

    return filter;
  }
}
