import { AnalogSynthBase } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Synth Pads (Warm, Choir, Halo, Bowed).
 * Characterized by slow attacks, slow releases, and evolving filter sweeps.
 */
export class PadSynth extends AnalogSynthBase {
  protected _cfg(d: number): { v: number; a: number; r: number } {
    return { v: 0.4, a: d < 0.4 ? 0.05 : 0.3, r: d < 0.4 ? 0.1 : 0.8 };
  }

  protected _setupSynthesis(
    ctx: AudioContext,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    sustainTime: number,
    releaseTime: number,
    stopTime: number,
  ): AudioNode | void {
    const [osc1, osc2] = this._stereoOsc(
      ctx,
      Osc.Triangle,
      freq,
      1.01,
      0.7,
      gain,
    );

    const filter = this._filter(ctx, Filter.Lowpass);
    this._set(filter.frequency, freq + 400, time);
    this._lin(
      filter.frequency,
      freq + 1000 + velocity * 500,
      time + sustainTime,
    );

    this._lfo(ctx, 0.5, 10, time, 0, stopTime, osc2.frequency);
    this._lfo(ctx, 0.1, 400, time, 0, stopTime, filter.frequency);

    gain.connect(filter);

    this._on(time, stopTime, osc1, osc2);

    return filter;
  }
}
