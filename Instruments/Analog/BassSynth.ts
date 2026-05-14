import { DecaySynthBase } from "../Decay/DecaySynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for deep Bass instruments using sawtooth waves.
 */
export class BassSynth extends DecaySynthBase {
  protected _c = { v: 0.8, a: 0.05, d: 0.1, m: 4.0 };

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
    /** Deep envelope sweep for punchy, muffled bass attack. Capped safely below Nyquist. */
    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      300 + velocity * 500,
      100,
      time,
      safeDuration,
    );

    const osc = this._osc(ctx, Osc.Sawtooth, 0, gain);
    this._set(osc.frequency, freq * 0.92, time);
    this._exp(osc.frequency, freq, time + 0.04);

    const subGain = this._gain(ctx, 0.6, gain);
    const subOsc = this._osc(ctx, Osc.Sine, 0, subGain);
    this._set(subOsc.frequency, (freq / 2) * 0.92, time);
    this._exp(subOsc.frequency, freq / 2, time + 0.04);

    gain.connect(filter);

    this._on(time, stopTime, osc, subOsc);

    return filter;
  }
}
