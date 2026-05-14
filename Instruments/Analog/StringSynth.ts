import { AnalogSynthBase } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for String and Pad instruments using detuned oscillators.
 */
export class StringSynth extends AnalogSynthBase {
  protected _cfg(d: number): { v: number; a: number; r: number } {
    return { v: 0.3, a: d < 0.4 ? 0.05 : 0.2, r: d < 0.4 ? 0.1 : 0.5 };
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
      Osc.Sawtooth,
      freq,
      1.005,
      0.6,
      gain,
    );

    const lfo = this._lfo(
      ctx,
      4.5,
      freq * 0.012,
      time,
      0.3,
      stopTime,
      osc1.frequency,
    );
    lfo.connect(osc2.frequency);

    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      freq + 1200 + velocity * 1000,
      freq + 800,
      time,
      sustainTime + releaseTime,
    );

    gain.connect(filter);

    this._on(time, stopTime, osc1, osc2);

    return filter;
  }
}
