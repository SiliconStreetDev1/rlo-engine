import { AnalogSynthBase } from "./AnalogSynthBase.js";
import {} from "../CoreSynthBase.js";

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
    const [osc1, osc2] = this._createStereoOscillator(
      ctx,
      "triangle",
      freq,
      1.01,
      0.7,
      gain,
    );

    const filter = this._createFilter(ctx, "lowpass");
    this._setValueAtTime(filter.frequency, freq + 400, time);
    this._linearRampToValue(
      filter.frequency,
      freq + 1000 + velocity * 500,
      time + sustainTime,
    );

    this._createLFO(ctx, 0.5, 10, time, 0, stopTime, osc2.frequency);
    this._createLFO(ctx, 0.1, 400, time, 0, stopTime, filter.frequency);

    gain.connect(filter);

    this._scheduleNodeStartStop(time, stopTime, osc1, osc2);

    return filter;
  }
}
