import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Ethnic instruments (Sitar, Shamisen, Koto).
 * Uses a bandpass filter over a square wave to emulate a hollow, plucked resonator.
 */
export class EthnicSynth extends DecaySynthBase {
  protected _c = { v: 0.6, a: 0.02, d: 0.1, m: 4.0 };

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
    const osc = this._osc(ctx, Osc.Square, 0, gain);
    this._set(osc.frequency, freq * 1.05, time);
    this._exp(osc.frequency, freq, time + 0.08);

    const filter = this._filterSweep(
      ctx,
      Filter.Bandpass,
      freq * 2.5,
      freq,
      time,
      safeDuration,
    );
    filter.Q.value = 2;

    filter.connect(gain);

    this._on(time, stopTime, osc);
  }
}
