import { AnalogSynthBase } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Synth Leads featuring an LFO Vibrato.
 */
export class LeadSynth extends AnalogSynthBase {
  protected _c = { v: 0.4, a: 0.05, r: 0.1 };

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
    const osc = this._osc(ctx, Osc.Sawtooth, 0);
    this._set(osc.frequency, freq, time);

    this._lfo(ctx, 5, freq * 0.02, time, 0.2, stopTime, osc.frequency);

    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      freq,
      freq * 3,
      time,
      0.05,
    );
    this._exp(filter.frequency, freq * 1.5, time + sustainTime);
    filter.Q.value = 3; /** Squelchy resonance */

    osc.connect(filter).connect(gain);

    this._on(time, stopTime, osc);
  }
}
