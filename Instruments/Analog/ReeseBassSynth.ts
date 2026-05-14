import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Reese/Wobble Bass.
 * Uses heavily detuned sawtooths and an LFO-driven lowpass filter.
 */
export class ReeseBassSynth extends AnalogSynthBase {
  protected _c = { v: 0.7, a: 0.05, r: 0.2 };

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
    const filter = this._filter(ctx, Filter.Lowpass);
    this._set(filter.frequency, freq * 2, time);

    // Wobble LFO: syncs roughly to tempo (e.g. 1/8th notes ~4-8 Hz)
    this._lfo(ctx, 6, freq * 3, time, 0, stopTime, filter.frequency);

    // Deep, phasing detune
    const [osc1, osc2] = this._stereoOsc(
      ctx,
      Osc.Sawtooth,
      freq / 2,
      1.015,
      0.4,
      filter,
    );
    filter.connect(gain);
    this._on(time, stopTime, osc1, osc2);
  }
}
